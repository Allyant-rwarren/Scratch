const WebSocket = require('ws');

function setupWebSocketServer(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('New client connected');

        ws.on('message', (message) => {
            console.log('Received message:', message);

            // Assuming the message is JSON and parsing it
            let parsedMessage;
            try {
                parsedMessage = JSON.parse(message);
            } catch (error) {
                console.error('Error parsing message as JSON:', error);
                ws.send(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }

            // Simple bot logic or echo message back
            const response = {
                bot: `You said: "${parsedMessage.content || message}"`
            };
            
            // Send response to the client
            ws.send(JSON.stringify(response));

            // Broadcast message to all clients except the sender
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ broadcast: parsedMessage.content || message }));
                }
            });
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        ws.send('Welcome to the WebSocket chat!');
    });

    return wss;
}

module.exports = setupWebSocketServer;
