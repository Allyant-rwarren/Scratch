import { downloadFile } from './fileDownload.js';

export function handleDocumentCreation() {
    document.addEventListener('DOMContentLoaded', () => {
        const createDocumentBtn = document.getElementById('create-document');

        if (!createDocumentBtn) {
            console.error('Create Document button not found in the DOM.');
            return;
        }

        createDocumentBtn.addEventListener('click', async function () {
            try {
                console.log('Create Document button clicked.');

                const toolSelect = document.getElementById('toolSelect').value;
                let clientName, platform, projectUrl, numViews, numIssues;

                if (toolSelect === 'summary') {
                    clientName = document.getElementById('clientName');
                    platform = document.getElementById('platform');
                    projectUrl = document.getElementById('projectUrl');
                    numViews = document.getElementById('numViews');
                    numIssues = document.getElementById('numIssues');
                } else if (toolSelect === 'vpat') {
                    clientName = document.getElementById('clientNameVpat');
                } else {
                    throw new Error('No tool selected or tool not recognized.');
                }

                if (!clientName || !platform || (toolSelect === 'summary' && (!projectUrl || !numViews || !numIssues))) {
                    throw new Error('One or more form elements are missing from the DOM.');
                }

                const clientNameValue = clientName.value;
                const platformValue = platform ? platform.value : '';
                const projectUrlValue = projectUrl ? projectUrl.value : '';
                const numViewsValue = numViews ? numViews.value : '';
                const numIssuesValue = numIssues ? numIssues.value : '';

                console.log('Form values:', {
                    clientNameValue,
                    platformValue,
                    projectUrlValue,
                    numViewsValue,
                    numIssuesValue
                });

                const gptResponse = sessionStorage.getItem('gptResponse');
                if (!gptResponse) {
                    throw new Error('GPT response not found in session storage.');
                }

                const selectedTool = sessionStorage.getItem('selectedTool');
                if (!selectedTool) {
                    throw new Error('Selected tool not found in session storage.');
                }

                const data = {
                    clientName: clientNameValue,
                    platform: platformValue,
                    projectUrl: projectUrlValue,
                    numViews: numViewsValue,
                    numIssues: numIssuesValue,
                    gptResponse,
                    toolType: selectedTool
                };

                console.log('Data to be sent to server:', data);

                const response = await fetch('/store-document-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error(`Failed to store document data with status: ${response.status}`);
                }

                console.log('Document data stored successfully.');

                const progressDiv = document.getElementById('progress');
                if (progressDiv) {
                    progressDiv.textContent = 'Document data stored successfully. Ready for document generation.';
                }

                // Trigger document creation
                const createResponse = await fetch('/create-document', {
                    method: 'GET'
                });

                if (!createResponse.ok) {
                    throw new Error(`Failed to create document with status: ${createResponse.status}`);
                }

                console.log('Document created successfully.');

                // Download the document
                downloadFile(createResponse, 'AuditSummaryReport.docx');

            } catch (error) {
                console.error('Error:', error);
                const progressDiv = document.getElementById('progress');
                if (progressDiv) {
                    progressDiv.textContent = 'An error occurred while storing document data. Please try again.';
                }
            }
        });
    });
}