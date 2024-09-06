const path = require('path');
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const socketIo = require('socket.io');
const authRoutes = require('./authRoutes');
const { handleFileUpload } = require('./fileUploadHandler');
const setupWebSocketServer = require('./webSocketServer');
const { fillTemplate } = require('./templateProcessor');
const { parseMarkdown } = require('./markdownParser');

const app = express();
const server = require('http').createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

// Setup session with secure handling
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' } 
}));

app.use(cookieParser());
app.use(express.json());

app.use(authRoutes);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// Middleware to ensure authentication before handling specific routes
function ensureAuthenticated(req, res, next) {
    if (req.cookies.accessToken) {
        return next();
    } else {
        console.log('Access token missing, redirecting to login.');
        res.redirect('/login');
    }
}

// File upload route for Summary Document Generator
app.post('/upload', ensureAuthenticated, async (req, res) => {
    try {
        await handleFileUpload(req, res, UPLOAD_DIR, 'summary');
    } catch (error) {
        console.error('Error during file upload:', error);
        res.status(500).json({ message: 'An error occurred during the upload. Please try again later.' });
    }
});

// File upload route for VPAT Generator
app.post('/vpat-upload', ensureAuthenticated, async (req, res) => {
    try {
        await handleFileUpload(req, res, UPLOAD_DIR, 'vpat');
    } catch (error) {
        console.error('Error during VPAT file upload:', error);
        res.status(500).json({ message: 'An error occurred during the VPAT upload. Please try again later.' });
    }
});

// Handle GPT response and save to session
app.post('/gpt-response', ensureAuthenticated, (req, res) => {
    try {
        const { clientName, platform, gptResponse, teamToLink, issuesReportLink } = req.body;

        req.session.clientName = clientName;
        req.session.platform = platform;
        req.session.gptResponse = gptResponse;
        req.session.teamToLink = teamToLink;
        req.session.issuesReportLink = issuesReportLink;

        console.log('Session updated with GPT response and links:', {
            clientName: req.session.clientName,
            platform: req.session.platform,
            gptResponse: req.session.gptResponse,
            teamToLink: req.session.teamToLink,
            issuesReportLink: req.session.issuesReportLink
        });

        req.session.save((err) => {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).json({ message: 'Failed to save session.' });
            }
            res.status(200).json({ message: 'Session updated successfully with GPT response and links' });
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

        const { clientName, platform, projectUrl, numViews, numIssues, gptResponse, teamToLink, issuesReportLink } = req.session;

        if (!gptResponse) {
            console.error('Error: gptResponse is missing.');
            return res.status(400).json({ error: 'gptResponse is missing.' });
        }

        const parsedGptResponse = parseMarkdown(gptResponse);

        // Log variables for debugging
        console.log(`Variables for template filling:`);
        console.log(`clientName: ${clientName}`);
        console.log(`platform: ${platform}`);
        console.log(`projectUrl: ${projectUrl}`);
        console.log(`numViews: ${numViews}`);
        console.log(`numIssues: ${numIssues}`);
        console.log(`teamToLink: ${teamToLink}`);
        console.log(`issuesReportLink: ${issuesReportLink}`);
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
            topIssues: parsedGptResponse.categories,
            teamToLink,  // Include the team link URL
            issuesReportLink // Include the issues report URL
        });

        console.log('Generated Document Path:', outputPath);

        // Send the generated document to the user
        res.download(outputPath, (err) => {
            if (err) {
                console.error('Error sending document:', err);
                res.status(500).send('Error sending document');
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

module.exports = server;
