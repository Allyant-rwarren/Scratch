// routes/auth.js
const express = require('express');
const axios = require('axios');
const { generateCodeVerifier, generateCodeChallenge } = require('../middlewares/auth');
const router = express.Router();

router.get('/login', (req, res) => {
    console.log('Initiating login process...');
    const codeVerifier = generateCodeVerifier();
    req.session.codeVerifier = codeVerifier;
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const authUrl = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=http://localhost:${process.env.PORT}/auth/callback&response_mode=query&scope=openid profile email&state=12345&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    console.log('Redirecting to:', authUrl);
    res.redirect(authUrl);
});

router.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    console.log('Received authorization code:', code);

    try {
        const tokenResponse = await axios.post(
            `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET || '',
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

        req.session.accessToken = tokenResponse.data.access_token;
        console.log('Authentication successful:', tokenResponse.data);
        res.redirect('/protected');
    } catch (error) {
        console.error('Error during authentication:', error.response ? error.response.data : error.message);
        res.status(500).send('Error during authentication');
    }
});

module.exports = router;
