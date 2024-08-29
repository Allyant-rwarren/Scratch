// routes/upload.js
const express = require('express');
const formidable = require('formidable');
const { parseCSV } = require('../Services/fileprocessing');
const { fillTemplate } = require('../Services/openai');
const { ensureAuthenticated } = require('../middlewares/auth');
const path = require('path');

const router = express.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

router.post('/upload', ensureAuthenticated, (req, res) => {
    const form = new formidable.IncomingForm({ uploadDir: UPLOAD_DIR, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Error parsing form:', err);
            return res.status(500).send('Error parsing form');
        }

        const file = files.file[0];
        const filePath = file.filepath;

        try {
            const csvData = await parseCSV(filePath);

            if (csvData.length === 0) {
                return res.status(400).send('No relevant data found in the CSV file.');
            }

            const openAIResponse = await sendToOpenAI(csvData);
            const topIssues = JSON.parse(openAIResponse.choices[0].message.content).slice(0, 3);

            io.emit('gptResponse', topIssues);

            const filledDocumentPath = await fillTemplate(path.join(__dirname, 'doctemplate', 'TEMPLATE-AuditSummaryReport-[Client]-[Project]-[Date].docx'), {
                clientName: fields.clientName[0],
                platform: fields.platform[0],
                topIssues,
            });

            res.download(filledDocumentPath, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                    res.status(500).send('Error sending file');
                }
            });
        } catch (error) {
            console.error('Error processing file:', error);
            res.status(500).send('Error processing file');
        }
    });
});

module.exports = router;
