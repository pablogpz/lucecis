const cwd = process.cwd();

module.exports = {
    apps: [
        {
            name: 'lucecis-websocket',
            script: 'npm',
            args: 'run server',
            env: { NODE_ENV: 'production' },
            cwd,
            exec_mode: 'fork',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            error_file: '/var/log/pm2/lucecis-websocket-error.log',
            out_file: '/var/log/pm2/lucecis-websocket-out.log',
            log_file: '/var/log/pm2/lucecis-websocket.log',
        },
        {
            name: 'lucecis-nextjs',
            script: 'npm',
            args: 'run start',
            env: { NODE_ENV: 'production' },
            cwd,
            exec_mode: 'fork',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            error_file: '/var/log/pm2/lucecis-nextjs-error.log',
            out_file: '/var/log/pm2/lucecis-nextjs-out.log',
            log_file: '/var/log/pm2/lucecis-nextjs.log',
        },
    ],
};
