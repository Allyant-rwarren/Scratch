// middlewares/auth.js
const crypto = require('crypto');

function ensureAuthenticated(req, res, next) {
    if (req.session.accessToken) {
        return next();
    } else {
        console.log('Access token missing, redirecting to login.');
        res.redirect('/login');
    }
}

function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('hex');
}

function generateCodeChallenge(codeVerifier) {
    return crypto.createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

module.exports = { ensureAuthenticated, generateCodeVerifier, generateCodeChallenge };
