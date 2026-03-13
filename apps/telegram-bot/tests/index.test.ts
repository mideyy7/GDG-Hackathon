import { bot, handleTextMessage } from '../src/index';
import axios from 'axios';
import { Context } from 'telegraf';

jest.mock('axios');

describe('Telegram Bot message formatting', () => {
    let mockReply: jest.Mock;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        mockReply = jest.fn();
        originalEnv = process.env;
        process.env.TELEGRAM_BOT_TOKEN = 'mock-token';
        process.env.GATEWAY_URL = 'http://test-gateway';
        process.env.BOT_GATEWAY_TIMEOUT_MS = '60000';
        (axios.post as jest.Mock).mockResolvedValue({ status: 200 });
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    it('should create a valid telegraf instance', () => {
        expect(bot).toBeDefined();
    });

    it('should reject messages without /task or /request prefix', async () => {
        const mockCtx = {
            message: { text: 'Hello, bot!', message_id: 123 },
            chat: { id: 456 },
            from: { id: 789, username: 'testuser' },
            reply: mockReply,
        } as any;

        await handleTextMessage(mockCtx);

        expect(mockReply).toHaveBeenCalledWith(
            'Invalid command. Please use /help to see the list of available commands and the setup flow.'
        );
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('should accept messages with /task prefix', async () => {
        const mockCtx = {
            message: { text: '/task Please fix the bug', message_id: 124 },
            chat: { id: 456 },
            from: { id: 789, username: 'testuser' },
            reply: mockReply,
        } as any;

        await handleTextMessage(mockCtx);

        expect(axios.post).toHaveBeenCalledWith(
            'http://test-gateway',
            {
                provider: 'telegram',
                payload: {
                    chatId: 456,
                    userId: 789,
                    username: 'testuser',
                    text: '/task Please fix the bug',
                    messageId: 124,
                    timestamp: expect.any(String),
                    type: 'task'
                }
            },
            expect.objectContaining({ timeout: 1200000 })
        );
        expect(mockReply).toHaveBeenCalledWith('Task received and sent to gateway. Evaluating...');
    });

    it('should accept messages with /request prefix', async () => {
        const mockCtx = {
            message: { text: '/request Please build a new feature', message_id: 125 },
            chat: { id: 456 },
            from: { id: 789, username: 'testuser' },
            reply: mockReply,
        } as any;

        await handleTextMessage(mockCtx);

        expect(axios.post).toHaveBeenCalledWith(
            'http://test-gateway',
            expect.any(Object),
            expect.objectContaining({ timeout: 1200000 })
        );
        expect(mockReply).toHaveBeenCalledWith('Task received and sent to gateway. Evaluating...');
    });
});
