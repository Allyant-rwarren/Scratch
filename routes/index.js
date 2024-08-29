// routes/index.js
const express = require('express');
const { ensureAuthenticated } = require('../middlewares/auth');
const router = express.Router();

router.get('/', (req, res) => {
    console.log('Accessing root route, forcing login...');
    res.redirect('/login');
});

router.get('/protected', ensureAuthenticated, (req, res) => {
    console.log('Accessing protected route...');
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
});

module.exports = router;
