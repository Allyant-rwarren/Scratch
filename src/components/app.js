const path = require('path');
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const socketIo = require('socket.io');
const authRoutes = require('./authRoutes');
const { handleFileUpload } = require('./fileUploadHandler'); // Correct import for handling file uploads
const setupWebSocketServer = require('./webSocketServer');
const { fillTemplate } = require('./templateProcessor');

const app = express();
const server = require('http').createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',  // Secret key for session encryption
    resave: false,  // Prevents resaving session data if it wasn't modified during the request
    saveUninitialized: true,  // Saves a session even if it's new and not modified yet
    cookie: { secure: false }  // Should be true if using HTTPS in production for secure cookies
}));

app.use(cookieParser());  // Parses cookies attached to the client request object
app.use(express.json());  // Parses incoming JSON requests and makes the data accessible via req.body

// Auth routes setup
app.use(authRoutes);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// Middleware to ensure authentication before handling specific routes
function ensureAuthenticated(req, res, next) {
    if (req.cookies.accessToken) {
        return next();  // User is authenticated; proceed to the next middleware/route handler
    } else {
        console.log('Access token missing, redirecting to login.');
        res.redirect('/login');  // Redirect to login if the access token is missing
    }
}

// File upload route for Summary Document Generator
app.post('/upload', ensureAuthenticated, async (req, res) => {
    try {
        await handleFileUpload(req, res, UPLOAD_DIR, 'summary');  // Handle the upload specifically for the summary tool
    } catch (error) {
        console.error('Error during file upload:', error);
        res.status(500).json({ message: 'An error occurred during the upload. Please try again later.' });
    }
});

// File upload route for VPAT Generator
app.post('/vpat-upload', ensureAuthenticated, async (req, res) => {
    try {
        await handleFileUpload(req, res, UPLOAD_DIR, 'vpat');  // Handle the upload specifically for the VPAT tool
    } catch (error) {
        console.error('Error during VPAT file upload:', error);
        res.status(500).json({ message: 'An error occurred during the VPAT upload. Please try again later.' });
    }
});

// Handle GPT response and save to session
app.post('/gpt-response', ensureAuthenticated, (req, res) => {
    try {
        const { clientName, platform, gptResponse } = req.body;

        // Store important information in the session
        req.session.clientName = clientName;
        req.session.platform = platform;

        // Parse the GPT response if needed and store it
        req.session.gptResponse = typeof gptResponse === 'string' ? gptResponse : JSON.stringify(gptResponse);

        console.log('Session updated with GPT response:', {
            clientName: req.session.clientName,
            platform: req.session.platform,
            gptResponse: req.session.gptResponse
        });

        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).json({ message: 'Failed to save session.' });
            }
            res.status(200).json({ message: 'Session updated successfully with GPT response' });
        });
    } catch (error) {
        console.error('Error handling GPT response:', error);
        res.status(500).json({ message: 'An error occurred while processing GPT response. Please try again later.' });
    }
});

// Route to store document data
app.post('/store-document-data', ensureAuthenticated, (req, res) => {
    try {
        const { clientName, platform, projectUrl, numViews, numIssues, gptResponse, toolType } = req.body;

        // Store important information in the session
        req.session.clientName = clientName;
        req.session.platform = platform;
        req.session.projectUrl = projectUrl;
        req.session.numViews = numViews;
        req.session.numIssues = numIssues;
        req.session.gptResponse = gptResponse;
        req.session.toolType = toolType;

        console.log('Session updated with document data:', {
            clientName: req.session.clientName,
            platform: req.session.platform,
            projectUrl: req.session.projectUrl,
            numViews: req.session.numViews,
            numIssues: req.session.numIssues,
            gptResponse: req.session.gptResponse,
            toolType: req.session.toolType
        });

        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).json({ message: 'Failed to save session.' });
            }
            res.status(200).json({ message: 'Session updated successfully with document data' });
        });
    } catch (error) {
        console.error('Error handling document data:', error);
        res.status(500).json({ message: 'An error occurred while processing document data. Please try again later.' });
    }
});

// Document creation route
app.get('/create-document', ensureAuthenticated, async (req, res) => {
    try {
        console.log('Attempting to create document...');
        console.log('Session data at document creation:', req.session);

        const { clientName, platform, projectUrl, numViews, numIssues, gptResponse } = req.session;

        if (!gptResponse) {
            console.error('Error: gptResponse is missing.');
            return res.status(400).json({ error: 'gptResponse is missing.' });
        }

        // Parse gptResponse if it's still in string format
        let parsedGptResponse;
        try {
            parsedGptResponse = JSON.parse(gptResponse);
        } catch (err) {
            console.error('Error parsing GPT response:', err);
            return res.status(400).json({ error: 'Failed to parse GPT response.' });
        }

        // Ensure the gptResponse has the expected format
        if (!Array.isArray(parsedGptResponse.categories)) {
            console.error('Error: gptResponse is not in the expected format:', parsedGptResponse);
            return res.status(400).json({ error: 'gptResponse is not in the expected format.' });
        }

        // Log variables for debugging
        console.log('Variables for template filling:');
        console.log(`clientName: ${clientName}`);
        console.log(`platform: ${platform}`);
        console.log(`projectUrl: ${projectUrl}`);
        console.log(`numViews: ${numViews}`);
        console.log(`numIssues: ${numIssues}`);
        console.log('Parsed GPT Response:', parsedGptResponse);

        // Construct the path to the template document
        const templatePath = path.join(__dirname, '..', '..', 'doctemplates', 'TEMPLATE-AuditSummaryReport-[Client]-[Project]-[Date].docx');
        console.log('Template Path:', templatePath);

        // Fill the template with the relevant data
        const outputPath = await fillTemplate(templatePath, {
            clientName,
            platform,
            domain: projectUrl,
            x: numIssues,
            y: numViews,
            topIssues: parsedGptResponse.categories
        });

        console.log('Generated Document Path:', outputPath);

        // Send the generated document to the user
        res.download(outputPath, (err) => {
            if (err) {
                console.error('Error sending the document:', err);
                res.status(500).send('Error sending the document');
            } else {
                // Destroy the session after the document is downloaded
                req.session.destroy(err => {
                    if (err) {
                        console.error('Failed to destroy session:', err);
                    } else {
                        console.log('Session destroyed after document creation.');
                    }
                });
            }
        });

    } catch (error) {
        console.error('Error creating document:', error);
        res.status(500).send('Error creating document');
    }
});

// Setup WebSocket server for chat or real-time updates
setupWebSocketServer(io);

// Start the server and listen on the specified port
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = server;  // Export the server for use in other parts of the application (e.g., testing)
