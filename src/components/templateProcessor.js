const fs = require('fs').promises;
const path = require('path');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');

async function fillTemplate(templatePath, data) {
    try {
        console.log('Starting template processing...');
        console.log('Template path:', templatePath);
        console.log('Data received:', data);

        // Load the DOCX file as a binary
        const content = await fs.readFile(templatePath, 'binary');
        console.log('Template file loaded successfully.');

        // Load the content into PizZip
        const zip = new PizZip(content);
        console.log('Content loaded into PizZip.');

        // Load the zip file into Docxtemplater
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });
        console.log('Content loaded into Docxtemplater.');

        // Prepare the data for the placeholders
        const placeholders = {
            client: data.clientName,
            domain: data.domain,
            'proposal date': new Date().toLocaleDateString(),
            x: data.issueCount,
            y: data.viewCount,
            'Concept of ISSUES #1': data.topIssues[0].category_name,
            'Example issue 1.1': `${data.topIssues[0].examples[0].Description} [Link](${data.topIssues[0].examples[0]["Issue Link"]})`,
            'Example issue 1.2': `${data.topIssues[0].examples[1].Description} [Link](${data.topIssues[0].examples[1]["Issue Link"]})`,
            'Concept of ISSUES #2': data.topIssues[1].category_name,
            'Example issue 2.1': `${data.topIssues[1].examples[0].Description} [Link](${data.topIssues[1].examples[0]["Issue Link"]})`,
            'Example issue 2.2': `${data.topIssues[1].examples[1].Description} [Link](${data.topIssues[1].examples[1]["Issue Link"]})`,
            'Concept of ISSUE #3': data.topIssues[2].category_name,
            'Example issue 3.1': `${data.topIssues[2].examples[0].Description} [Link](${data.topIssues[2].examples[0]["Issue Link"]})`,
            'Example issue 3.2': `${data.topIssues[2].examples[1].Description} [Link](${data.topIssues[2].examples[1]["Issue Link"]})`,
        };

        // Handle optional third issues if they exist
        if (data.topIssues[0].examples[2]) {
            placeholders['Example issue 1.3'] = `${data.topIssues[0].examples[2].Description} [Link](${data.topIssues[0].examples[2]["Issue Link"]})`;
        }
        if (data.topIssues[1].examples[2]) {
            placeholders['Example issue 2.3'] = `${data.topIssues[1].examples[2].Description} [Link](${data.topIssues[1].examples[2]["Issue Link"]})`;
        }
        if (data.topIssues[2].examples[2]) {
            placeholders['Example issue 3.3'] = `${data.topIssues[2].examples[2].Description} [Link](${data.topIssues[2].examples[2]["Issue Link"]})`;
        }

        // Log placeholders to ensure they are correct
        console.log('Placeholders being set:', placeholders);

        // Apply the placeholders in the document
        doc.setData(placeholders);

        try {
            // Render the document (replace the placeholders with actual data)
            doc.render();
            console.log('Document rendered successfully.');
        } catch (error) {
            const e = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                properties: error.properties,
            };
            console.log('Error during document rendering:', JSON.stringify({ error: e }));
            throw error;
        }

        // Create output file name using client name and current date
        const filledTemplatePath = path.join(__dirname, 'filled', `AuditSummaryReport-${data.clientName}-${new Date().toISOString().split('T')[0]}.docx`);
        console.log('Output file path:', filledTemplatePath);

        // Generate the document and save it
        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        console.log('Document generated successfully.');

        // Ensure the 'filled' directory exists
        await fs.mkdir(path.dirname(filledTemplatePath), { recursive: true });
        console.log('Ensured "filled" directory exists.');

        // Save the generated document to the file system
        await fs.writeFile(filledTemplatePath, buf);
        console.log('Template successfully processed and saved to', filledTemplatePath);

        return filledTemplatePath;

    } catch (err) {
        console.error('Error processing template:', err);
        throw err;
    }
}

module.exports = { fillTemplate };
