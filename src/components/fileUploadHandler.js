const formidable = require('formidable');
const { parseCSV } = require('./parser');
const { sendToOpenAI } = require('./openaiService');

async function handleFileUpload(req, res, UPLOAD_DIR, toolType) {
    console.log('Starting file upload processing...');

    const form = new formidable.IncomingForm({ uploadDir: UPLOAD_DIR, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Error parsing form:', err);
            return res.status(500).json({ error: 'Error parsing form' });
        }

        const file = files.file && files.file[0];
        if (!file || !file.filepath) {
            console.error('File not found or invalid');
            return res.status(400).json({ error: 'File not found or invalid' });
        }

        const filePath = file.filepath;

        try {
            const { results: csvData, projectIssueReportURL } = await parseCSV(filePath);

            if (!csvData || csvData.length === 0) {
                console.error('No valid data found in CSV.');
                return res.status(400).json({ error: 'No valid data found in CSV.' });
            }

            console.log('Sending instructions for tool type:', toolType);

            const gptResponse = await sendToOpenAI(csvData, toolType);

            req.session.projectIssueReportURL = projectIssueReportURL;
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session:', err);
                    return res.status(500).json({ message: 'Failed to save session.' });
                }

                console.log('Form fields:', fields);
                console.log('OpenAI response:', gptResponse);

                return res.status(200).json({ message: 'File uploaded successfully.', gptResponse });
            });
        } catch (error) {
            console.error('Error processing file upload:', error);
            return res.status(500).json({ error: 'Error processing file upload', details: error.message });
        }
    });
}

module.exports = { handleFileUpload };