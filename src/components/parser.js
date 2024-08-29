const fs = require('fs');
const csv = require('csv-parser');

// Define the columns we expect in the CSV
const validColumns = [
    "HUB ID", "Location", "Name", "Sitewide?", "Component", 
    "Description of item/issue", "Priority", "Issue Link", "Allyant Status"
];

// Parse the CSV file, ensuring we only capture the columns we're interested in
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
                        filteredData[col] = ''; // Handle missing columns with an empty string
                        if (col === "HUB ID" || col === "Location") {
                            // Consider the row invalid if essential fields are missing
                            isValidRow = false;
                        }
                    }
                });

                if (isValidRow) {
                    // Extract project ID from the Issue Link
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