const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const router = express.Router();

const PORT = process.env.PORT || 3000;

// Generate PKCE code verifier and challenge
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('hex');
}

function generateCodeChallenge(codeVerifier) {
    return crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Middleware to ensure authentication before serving any routes or static files
function ensureAuthenticated(req, res, next) {
    if (req.cookies.accessToken) {
        return next();
    } else {
        console.log('Access token missing, redirecting to login.');
        res.redirect('/login');
    }
}

// Force login on root access
router.get('/', (req, res) => {
    res.redirect('/login');
});

// Login route to initiate authentication with Microsoft
router.get('/login', (req, res) => {
    const codeVerifier = generateCodeVerifier();
    res.cookie('codeVerifier', codeVerifier, { maxAge: 1000 * 60 * 15, httpOnly: true }); // Store codeVerifier in cookie, expires in 15 minutes
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const authUrl = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=http://localhost:${PORT}/auth/callback&response_mode=query&scope=openid profile email&state=12345&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    res.redirect(authUrl);
});

// Handle authentication callback
router.get('/auth/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const codeVerifier = req.cookies.codeVerifier; // Retrieve the codeVerifier from cookies
        if (!codeVerifier) {
            throw new Error('Code verifier is missing from cookies.');
        }

        const tokenResponse = await axios.post(
            `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET || '',
                scope: 'openid profile email',
                code,
                redirect_uri: `http://localhost:${PORT}/auth/callback`,
                grant_type: 'authorization_code',
                code_verifier: codeVerifier  // Use the stored codeVerifier from cookies
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // Store access token in cookies and session, set to expire in 24 hours
        res.cookie('accessToken', accessToken, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true });
        req.session.accessToken = accessToken;

        res.clearCookie('codeVerifier'); // Clear the codeVerifier cookie as it's no longer needed

        res.redirect('/protected');  // Redirect to the protected route after successful login
    } catch (error) {
        console.error('Error during authentication:', error.response ? error.response.data : error.message);
        res.status(500).send('Error during authentication');
    }
});

// Example protected route
router.get('/protected', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
});

module.exports = router;
