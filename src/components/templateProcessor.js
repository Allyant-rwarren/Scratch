const fs = require('fs').promises;
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

async function fillTemplate(templatePath, data) {
    try {
        console.log('Starting template processing...');
        console.log('Template path:', templatePath);
        console.log('Data received:', JSON.stringify(data, null, 2));

        const content = await fs.readFile(templatePath, 'binary');
        console.log('Template file loaded successfully.');

        const zip = new PizZip(content);
        
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        const placeholders = {
            client: data.clientName,
            domain: data.domain,
            'proposal date': new Date().toLocaleDateString(),
            x: data.numIssues,
            y: data.numViews,
        };

        if (data.topIssues && Array.isArray(data.topIssues)) {
            data.topIssues.slice(0, 3).forEach((category, index) => {
                const categoryIndex = index + 1;
                placeholders[`Concept of ISSUES #${categoryIndex}`] = category.title;

                if (Array.isArray(category.issues)) {
                    category.issues.slice(0, 2).forEach((issue, issueIndex) => {
                        const issueNumber = issueIndex + 1;
                        const hubIdMatch = issue.description.match(/\*\*#(\d+)\*\*/);
                        const hubId = hubIdMatch ? hubIdMatch[1] : `Issue ${issueNumber}`;
                        const issueDescription = issue.description.replace(/\*\*#\d+\*\*\s*-*\s*/, '').trim();
                        
                        // Remove any remaining formatting and extra dashes
                        const cleanDescription = issueDescription.replace(/^\s*-\s*/, '');
                        
                        // Separate hub ID and description
                        placeholders[`hubid${categoryIndex}.${issueNumber}`] = `#${hubId}`;
                        placeholders[`Example issue ${categoryIndex}.${issueNumber}`] = cleanDescription;
                    });

                    // Fill remaining placeholders if less than 2 issues
                    for (let i = category.issues.length + 1; i <= 2; i++) {
                        placeholders[`hubid${categoryIndex}.${i}`] = '';
                        placeholders[`Example issue ${categoryIndex}.${i}`] = '';
                    }
                }
            });

            // Ensure we have placeholders for all three categories even if there are fewer
            for (let i = data.topIssues.length + 1; i <= 3; i++) {
                placeholders[`Concept of ISSUES #${i}`] = '';
                placeholders[`hubid${i}.1`] = '';
                placeholders[`Example issue ${i}.1`] = '';
                placeholders[`hubid${i}.2`] = '';
                placeholders[`Example issue ${i}.2`] = '';
            }
        }

        console.log('Placeholders prepared:', JSON.stringify(placeholders, null, 2));

        doc.setData(placeholders);

        doc.render();
        console.log('Document rendered successfully.');

        const buf = doc.getZip().generate({type: 'nodebuffer'});

        const filledTemplatePath = path.join(__dirname, 'filled', `AuditSummaryReport-${data.clientName}-${new Date().toISOString().split('T')[0]}.docx`);
        console.log('Output file path:', filledTemplatePath);

        await fs.mkdir(path.dirname(filledTemplatePath), { recursive: true });
        await fs.writeFile(filledTemplatePath, buf);
        
        console.log('Template successfully processed and saved to', filledTemplatePath);

        return filledTemplatePath;
    } catch (err) {
        console.error('Error processing template:', err);
        throw err;
    }
}

module.exports = { fillTemplate };