import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AgentTerminal from '../components/AgentTerminal';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Simulate open after a tick
    setTimeout(() => this.onopen?.(), 0);
  }

  close() {
    this.closed = true;
  }

  // Test helper to simulate receiving a message
  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError() {
    this.onerror?.();
  }
}

// Mock the openRunEventStream function
vi.mock('../lib/api', () => ({
  openRunEventStream: (runId: string) => new MockEventSource(`/test/${runId}/events`),
}));

beforeEach(() => {
  MockEventSource.instances = [];
});

// @ts-ignore
global.EventSource = MockEventSource;

describe('AgentTerminal', () => {
  it('renders the terminal header', () => {
    render(
      <AgentTerminal
        runId="run-123"
        status="generating"
      />
    );
    expect(screen.getByText('Agent Terminal')).toBeInTheDocument();
  });

  it('shows runId in the header', () => {
    render(
      <AgentTerminal
        runId="run-abc"
        status="generating"
      />
    );
    expect(screen.getByText('run-abc')).toBeInTheDocument();
  });

  it('shows "Waiting for events" when no events and status is active', async () => {
    render(
      <AgentTerminal
        runId="run-123"
        status="generating"
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/Waiting for events/i)).toBeInTheDocument();
    });
  });

  it('shows "Live" indicator when connected and active', async () => {
    render(
      <AgentTerminal
        runId="run-123"
        status="generating"
      />
    );
    await waitFor(() => {
      expect(screen.queryByText('Live')).not.toBeNull();
    });
  });

  it('renders log events when received', async () => {
    render(
      <AgentTerminal
        runId="run-123"
        status="generating"
      />
    );

    await waitFor(() => {
      const es = MockEventSource.instances[0];
      expect(es).toBeDefined();
    });

    const es = MockEventSource.instances[0];
    es.simulateMessage({
      id: 'evt-1',
      runId: 'run-123',
      stage: 'generating',
      eventType: 'log',
      message: 'Starting code generation',
      createdAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByText('Starting code generation')).toBeInTheDocument();
    });
  });

  it('renders completed status without live indicator', async () => {
    render(
      <AgentTerminal
        runId="run-123"
        status="completed"
        branchName="openclaw/plan-1"
        prUrl="https://github.com/owner/repo/pull/5"
      />
    );
    expect(screen.queryByText('Live')).toBeNull();
  });

  it('handles SSE error gracefully', async () => {
    render(
      <AgentTerminal
        runId="run-error"
        status="generating"
      />
    );

    await waitFor(() => {
      const es = MockEventSource.instances[0];
      expect(es).toBeDefined();
    });

    MockEventSource.instances[0].simulateError();

    await waitFor(() => {
      expect(screen.getByText(/Stream unavailable/i)).toBeInTheDocument();
    });
  });

  it('deduplicates events with the same id', async () => {
    render(
      <AgentTerminal runId="run-123" status="generating" />
    );

    await waitFor(() => {
      const es = MockEventSource.instances[0];
      expect(es).toBeDefined();
    });

    const es = MockEventSource.instances[0];
    const event = {
      id: 'same-id',
      runId: 'run-123',
      stage: 'generating',
      eventType: 'log',
      message: 'Unique message',
      createdAt: new Date().toISOString(),
    };

    es.simulateMessage(event);
    es.simulateMessage(event); // duplicate

    await waitFor(() => {
      const messages = screen.getAllByText('Unique message');
      expect(messages).toHaveLength(1);
    });
  });
});
