const fs = require('fs');
const path = require('path');

function generateVPAT(data, outputFilePath) {
	const vpatContent = `
		VPAT Report
		===========
		HUB ID: ${data.hubId}
		Name: ${data.name}
		Description: ${data.description}
		Priority: ${data.priority}
		Issue Link: ${data.issueLink}
	`;

	fs.writeFileSync(outputFilePath, vpatContent);
}

module.exports = { generateVPAT };