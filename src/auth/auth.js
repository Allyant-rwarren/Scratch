const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const authRoutes = express.Router();

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

authRoutes.get('/login', (req, res) => {
    const codeVerifier = generateCodeVerifier();
    req.session.codeVerifier = codeVerifier;
    const codeChallenge = generateCodeChallenge(codeVerifier);

    res.redirect(`https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=http://localhost:${process.env.PORT}/auth/callback&response_mode=query&scope=openid profile email&state=12345&code_challenge=${codeChallenge}&code_challenge_method=S256`);
});

authRoutes.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const tokenResponse = await axios.post(
            `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                scope: 'openid profile email',
                code: code,
                redirect_uri: `http://localhost:${process.env.PORT}/auth/callback`,
                grant_type: 'authorization_code',
                code_verifier: req.session.codeVerifier
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        req.session.tokens = tokenResponse.data;
        res.redirect('/');
    } catch (error) {
        console.error('Error during authentication:', error.response ? error.response.data : error.message);
        res.status(500).send('Authentication failed.');
    }
});

// Log the successful creation of authRoutes
console.log('authRoutes successfully created');

module.exports = { authRoutes };
