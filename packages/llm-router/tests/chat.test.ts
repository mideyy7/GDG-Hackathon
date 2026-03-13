import axios from 'axios';
import { chat, ProviderHttpError, ProviderTimeoutError, RouterError } from '../src/index';

jest.mock('axios');
const mockPost = axios.post as jest.MockedFunction<typeof axios.post>;

// jest.mock('axios') also mocks isAxiosError, so restore the detection logic.
(axios.isAxiosError as unknown as jest.Mock).mockImplementation(
  (err: unknown) => (err as any)?.isAxiosError === true,
);

function createMockStream(content: string) {
  const payload = JSON.stringify({
    choices: [{ delta: { content } }],
  });
  const chunk = Buffer.from(`data: ${payload}\n\ndata: [DONE]\n\n`, 'utf-8');
  return {
    data: {
      async *[Symbol.asyncIterator]() {
        yield chunk;
      }
    }
  };
}

const MOCK_SUCCESS = createMockStream('mock reply');

function makeAxiosHttpError(status: number, data: unknown = {}) {
  const err = new Error(`Request failed with status code ${status}`) as any;
  err.isAxiosError = true;
  err.code = undefined;
  err.response = { status, data };
  return err;
}

function makeAxiosTimeoutError(code: 'ECONNABORTED' | 'ERR_CANCELED' = 'ECONNABORTED') {
  const err = new Error('timeout of 0ms exceeded') as any;
  err.isAxiosError = true;
  err.code = code;
  err.response = undefined;
  return err;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ZAI_API_KEY = 'test-zai-key';
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  process.env.VENICE_API_KEY = 'test-venice-key';
});

describe('role routing — Z.AI is the core engine', () => {
  it('routes frontend_generator to Z.AI GLM', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'frontend_generator', messages: [{ role: 'user', content: 'Generate frontend patch' }] });
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toContain('bigmodel.cn');
    expect((body as any).model).toContain('glm');
    expect(result.provider).toBe('zai');
  });

  it('routes backend_generator to Z.AI GLM', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'backend_generator', messages: [{ role: 'user', content: 'Generate backend patch' }] });
    const [url] = mockPost.mock.calls[0];
    expect(url).toContain('bigmodel.cn');
    expect(result.provider).toBe('zai');
  });

  it('routes frontend_reviewer to Z.AI GLM', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'frontend_reviewer', messages: [{ role: 'user', content: 'Review frontend patch' }] });
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toContain('bigmodel.cn');
    expect((body as any).model).toContain('glm');
    expect(result.provider).toBe('zai');
  });

  it('routes backend_reviewer to Z.AI GLM', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'backend_reviewer', messages: [{ role: 'user', content: 'Review backend patch' }] });
    const [url] = mockPost.mock.calls[0];
    expect(url).toContain('bigmodel.cn');
    expect(result.provider).toBe('zai');
  });

  it('routes planner to OpenRouter (glm-4-long)', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'planner', messages: [{ role: 'user', content: 'Generate architecture plan' }] });
    const [url] = mockPost.mock.calls[0];
    expect(url).toContain('openrouter.ai');
    expect(result.provider).toBe('openrouter');
  });

  it('routes orchestrator to OpenRouter (glm-z1-flash)', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'orchestrator', messages: [{ role: 'user', content: 'Coordinate workflow' }] });
    const [url] = mockPost.mock.calls[0];
    expect(url).toContain('openrouter.ai');
    expect(result.provider).toBe('openrouter');
  });

  it('legacy generator and reviewer both route to Z.AI', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS).mockResolvedValueOnce(MOCK_SUCCESS);
    const legacyGenerator = await chat({ role: 'generator', messages: [{ role: 'user', content: 'Legacy generator' }] });
    const legacyReviewer = await chat({ role: 'reviewer', messages: [{ role: 'user', content: 'Legacy reviewer' }] });
    expect(legacyGenerator.provider).toBe('zai');
    expect(legacyReviewer.provider).toBe('zai');
  });
});

describe('request/response basics', () => {
  it('passes temperature and maxTokens through to Z.AI', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS);
    await chat({ role: 'frontend_reviewer', messages: [{ role: 'user', content: 'Hi' }], temperature: 0.3, maxTokens: 777 });
    const [, body] = mockPost.mock.calls[0];
    expect((body as any).temperature).toBe(0.3);
    expect((body as any).max_tokens).toBe(777);
  });

  it('returns content/model/provider', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'backend_reviewer', messages: [{ role: 'user', content: 'Review' }] });
    expect(result.content).toBe('mock reply');
    expect(typeof result.model).toBe('string');
    expect(result.provider).toBe('zai');
    expect(result.tokensUsed).toBeUndefined();
  });
});

describe('typed errors', () => {
  it('throws ProviderHttpError on permanent HTTP 403 from Z.AI (no retry)', async () => {
    // 403 is not in fallbackOn — surfaces immediately from Z.AI with no retries.
    mockPost.mockRejectedValueOnce(makeAxiosHttpError(403, { error: 'forbidden' }));
    const err = await chat({ role: 'frontend_reviewer', messages: [{ role: 'user', content: 'Review' }], requestId: 'req-http-1' }).catch(e => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err).toBeInstanceOf(RouterError);
    expect(err.statusCode).toBe(403);
    expect(err.role).toBe('frontend_reviewer');
    expect(err.provider).toBe('zai');
    expect(err.requestId).toBe('req-http-1');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('throws ProviderTimeoutError after exhausting all Z.AI retries and OpenRouter fallback', async () => {
    // backend_generator: maxRetries=2 (3 primary attempts) + 1 fallback = 4 calls total.
    mockPost
      .mockRejectedValueOnce(makeAxiosTimeoutError()) // Z.AI attempt 1
      .mockRejectedValueOnce(makeAxiosTimeoutError()) // Z.AI attempt 2
      .mockRejectedValueOnce(makeAxiosTimeoutError()) // Z.AI attempt 3
      .mockRejectedValueOnce(makeAxiosTimeoutError()); // OpenRouter fallback
    const err = await chat({ role: 'backend_generator', messages: [{ role: 'user', content: 'Generate' }], requestId: 'req-timeout-1' }).catch(e => e);
    expect(err).toBeInstanceOf(ProviderTimeoutError);
    expect(err).toBeInstanceOf(RouterError);
    expect(err.role).toBe('backend_generator');
    expect(err.requestId).toBe('req-timeout-1');
    expect(mockPost).toHaveBeenCalledTimes(4);
  });
});

describe('retry and fallback policy', () => {
  it('retries frontend_generator on transient failures then succeeds on Z.AI', async () => {
    mockPost
      .mockRejectedValueOnce(makeAxiosHttpError(503))
      .mockRejectedValueOnce(makeAxiosHttpError(503))
      .mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'frontend_generator', messages: [{ role: 'user', content: 'Generate patch' }] });
    expect(mockPost).toHaveBeenCalledTimes(3);
    expect(result.provider).toBe('zai');
  });

  it('falls back to OpenRouter GLM when Z.AI direct is exhausted', async () => {
    mockPost
      .mockRejectedValueOnce(makeAxiosHttpError(503))
      .mockRejectedValueOnce(makeAxiosHttpError(503))
      .mockRejectedValueOnce(makeAxiosHttpError(503))
      .mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'frontend_generator', messages: [{ role: 'user', content: 'Generate patch' }] });
    expect(mockPost).toHaveBeenCalledTimes(4);
    expect(result.provider).toBe('openrouter');
  });

  it('retries reviewer according to maxRetries policy', async () => {
    mockPost
      .mockRejectedValueOnce(makeAxiosTimeoutError())
      .mockRejectedValueOnce(makeAxiosHttpError(500))
      .mockResolvedValueOnce(MOCK_SUCCESS);
    const result = await chat({ role: 'backend_reviewer', messages: [{ role: 'user', content: 'Review patch' }] });
    expect(mockPost).toHaveBeenCalledTimes(3);
    expect(result.provider).toBe('zai');
  });

  it('does not retry on permanent 401 errors', async () => {
    mockPost.mockRejectedValueOnce(makeAxiosHttpError(401, { error: 'unauthorized' }));
    const err = await chat({ role: 'backend_generator', messages: [{ role: 'user', content: 'Generate' }] }).catch(e => e);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(err).toBeInstanceOf(ProviderHttpError);
  });
});

describe('environment variable guardrails', () => {
  it('throws when ZAI_API_KEY is missing', async () => {
    delete process.env.ZAI_API_KEY;
    await expect(chat({ role: 'frontend_generator', messages: [{ role: 'user', content: 'Generate' }] })).rejects.toThrow('ZAI_API_KEY is not set');
  });

  it('throws when OPENROUTER_API_KEY is missing on fallback attempt', async () => {
    delete process.env.OPENROUTER_API_KEY;
    mockPost
      .mockRejectedValueOnce(makeAxiosHttpError(503))
      .mockRejectedValueOnce(makeAxiosHttpError(503))
      .mockRejectedValueOnce(makeAxiosHttpError(503));
    await expect(chat({ role: 'frontend_reviewer', messages: [{ role: 'user', content: 'Review' }] })).rejects.toThrow('OPENROUTER_API_KEY is not set');
  });
});

describe('unknown input handling', () => {
  it('throws for unknown role', async () => {
    await expect(chat({ role: 'unknown' as any, messages: [] })).rejects.toThrow('No model config for role');
  });

  it('passes through empty message arrays', async () => {
    mockPost.mockResolvedValueOnce(MOCK_SUCCESS);
    await expect(chat({ role: 'frontend_generator', messages: [] })).resolves.toBeDefined();
    const [, body] = mockPost.mock.calls[0];
    expect((body as any).messages).toEqual([]);
  });
});
