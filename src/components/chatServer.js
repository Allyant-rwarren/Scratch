const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        console.log('Received:', message);

        // Simple bot logic
        const response = `Bot: You said "${message}"`;
        ws.send(response);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    ws.send('Welcome to the chat!');
});

console.log('WebSocket server is running on ws://localhost:8080');
