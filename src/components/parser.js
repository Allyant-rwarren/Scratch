const fs = require('fs');
const csv = require('csv-parser');

const validColumns = [
    "HUB ID", "Location", "Name", "Sitewide?", "Component", 
    "Description of item/issue", "Priority", "Issue Link", "Allyant Status"
];

async function parseCSV(filePath) {
    console.log('Starting CSV parsing for file:', filePath);
    const results = [];
    let projectIssueReportURL = '';

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                const filteredData = {};
                let isValidRow = true;

                validColumns.forEach(col => {
                    if (col in data) {
                        filteredData[col] = data[col];
                    } else {
                        filteredData[col] = '';
                        if (col === "HUB ID" || col === "Location") {
                            isValidRow = false;
                        }
                    }
                });

                if (isValidRow) {
                    const issueLink = filteredData["Issue Link"];
                    const match = issueLink.match(/issues\/(\d+)/);
                    if (match) {
                        const projectId = match[1];
                        projectIssueReportURL = `https://hub.accessible360.com/projects/${projectId}/issues`;
                    }
                    results.push(filteredData);
                } else {
                    console.error(`Invalid row skipped: ${JSON.stringify(data)}`);
                }
            })
            .on('end', () => {
                console.log('CSV parsing completed. Total valid rows:', results.length);
                resolve({ results, projectIssueReportURL });
            })
            .on('error', (error) => {
                console.error('Error during CSV parsing:', error);
                reject(error);
            });
    });
}

module.exports = { parseCSV };