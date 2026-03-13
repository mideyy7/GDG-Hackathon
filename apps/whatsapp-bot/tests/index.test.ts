import { client, handleMessage } from '../src/index';
import axios from 'axios';

jest.mock('axios');

describe('WhatsApp Client message formatting', () => {
    let mockReply: jest.Mock;
    let mockGetContact: jest.Mock;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        mockReply = jest.fn();
        mockGetContact = jest.fn().mockResolvedValue({ number: '1234567890', pushname: 'testuser' });
        originalEnv = process.env;
        process.env.GATEWAY_URL = 'http://test-gateway';
        process.env.BOT_GATEWAY_TIMEOUT_MS = '60000';
        (axios.post as jest.Mock).mockResolvedValue({ status: 200 });
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    it('should create a valid client instance', () => {
        expect(client).toBeDefined();
    });

    it('should ignore status messages', async () => {
        const mockMsg = {
            isStatus: true,
            type: 'chat',
            body: '/task do something',
            reply: mockReply,
        };
        await handleMessage(mockMsg);
        expect(mockReply).not.toHaveBeenCalled();
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('should ignore non-chat messages', async () => {
        const mockMsg = {
            isStatus: false,
            type: 'image',
            body: '/task do something',
            reply: mockReply,
        };
        await handleMessage(mockMsg);
        expect(mockReply).not.toHaveBeenCalled();
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('should reject standard messages without /task or /request prefix', async () => {
        const mockMsg = {
            isStatus: false,
            type: 'chat',
            body: 'Hello, bot!',
            reply: mockReply,
        };

        await handleMessage(mockMsg);

        expect(mockReply).toHaveBeenCalledWith(
            `I didn't understand that. 🤔\n\nUse /help to see available commands, or /task [description] to create a new task.`
        );
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('should accept messages with /task prefix', async () => {
        const mockMsg = {
            isStatus: false,
            type: 'chat',
            body: '/task Please fix the bug',
            from: '1234567890@c.us',
            id: { _serialized: 'msg123' },
            getContact: mockGetContact,
            reply: mockReply,
        };

        await handleMessage(mockMsg);

        expect(axios.post).toHaveBeenCalledWith(
            'http://test-gateway',
            {
                provider: 'whatsapp',
                payload: {
                    chatId: '1234567890@c.us',
                    userId: '1234567890',
                    username: 'testuser',
                    text: '/task Please fix the bug',
                    messageId: 'msg123',
                    timestamp: expect.any(String),
                    type: 'task'
                }
            },
            expect.objectContaining({ timeout: 1200000 })
        );
        expect(mockReply).toHaveBeenCalledWith('🤖 Task received! Generating an architecture plan...');
    });

    it('should accept messages with /request prefix', async () => {
        const mockMsg = {
            isStatus: false,
            type: 'chat',
            body: '/request Please build a new feature',
            from: '1234567890@c.us',
            id: { _serialized: 'msg124' },
            getContact: mockGetContact,
            reply: mockReply,
        };

        await handleMessage(mockMsg);

        expect(axios.post).toHaveBeenCalledWith(
            'http://test-gateway',
            expect.any(Object),
            expect.objectContaining({ timeout: 1200000 })
        );
        expect(mockReply).toHaveBeenCalledWith('🤖 Task received! Generating an architecture plan...');
    });
});
