process.env.GATEWAY_URL = 'http://localhost:3001/api/ingress/message';
// Use a random high port so parallel test runs don't collide on 3003
process.env.BOT_HTTP_PORT = '0';
