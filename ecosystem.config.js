module.exports = {
  apps: [
    {
      name: 'openclaw-gateway',
      script: 'services/openclaw-gateway/dist/index.js',
      cwd: '/var/www/devclaw',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'orchestrator',
      script: 'services/orchestrator/dist/index.js',
      cwd: '/var/www/devclaw',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'openclaw-engine',
      script: 'services/openclaw-engine/dist/index.js',
      cwd: '/var/www/devclaw',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'agent-runner',
      script: 'services/agent-runner/dist/index.js',
      cwd: '/var/www/devclaw',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'telegram-bot',
      script: 'apps/telegram-bot/dist/index.js',
      cwd: '/var/www/devclaw',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'whatsapp-bot',
      script: 'apps/whatsapp-bot/dist/index.js',
      cwd: '/var/www/devclaw',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'ceoclaw-founder',
      script: 'services/ceoclaw-founder/dist/index.js',
      cwd: '/var/www/devclaw',
      env: {
        NODE_ENV: 'production',
        PORT: 3050
      }
    }
  ]
};
