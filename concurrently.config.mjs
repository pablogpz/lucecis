import concurrently from "concurrently";

const nodeEnv = process.argv[2].trim() === 'production' ? 'production' : 'development';
const nextCommand = nodeEnv === 'production' ? 'start' : 'dev';

const { result } = concurrently(
    [
        { command: 'npm run server', name: 'ws-server', prefixColor: 'magenta', env: { NODE_ENV: nodeEnv } },
        { command: `npm run ${nextCommand}`, name: 'web-server', prefixColor: 'blue', env: { NODE_ENV: nodeEnv } }],
    {
        prefix: '[{time} process: {name}]',
        maxProcesses: 2,
        restartTries: 3,
        killOthersOn: ['failure', 'success'],
    },
);

result.then(
    () => {
        console.log('Both processes completed successfully.');
    },
    (error) => {
        console.error('One of the processes failed:', error);
    },
);