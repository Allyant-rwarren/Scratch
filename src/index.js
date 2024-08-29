const server = require('./components/app');
const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
try {
    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
} catch (err) {
    console.error('Error starting server:', err);
}