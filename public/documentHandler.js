export function handleDocumentCreation() {
    document.addEventListener('DOMContentLoaded', () => {
        const createDocumentBtn = document.getElementById('create-document');

        if (!createDocumentBtn) {
            console.error('Create Document button not found in the DOM.');
            return;
        }

        createDocumentBtn.addEventListener('click', async function () {
            try {
                // Determine which tool form is currently active (Summary or VPAT)
                const toolSelect = document.getElementById('toolSelect').value;
                let clientName, platform, projectUrl, numViews, numIssues;

                if (toolSelect === 'summary') {
                    // If the Summary Document Generator form is active, get its elements
                    clientName = document.getElementById('clientName');
                    platform = document.getElementById('platform');
                    projectUrl = document.getElementById('projectUrl');
                    numViews = document.getElementById('numViews');
                    numIssues = document.getElementById('numIssues');
                } else if (toolSelect === 'vpat') {
                    // If the VPAT Generator form is active, get its elements
                    clientName = document.getElementById('clientNameVpat');
                } else {
                    throw new Error('No tool selected or tool not recognized.');
                }

                // Ensure all necessary elements exist and are not null
                if (!clientName || !platform || (toolSelect === 'summary' && (!projectUrl || !numViews || !numIssues))) {
                    throw new Error('One or more form elements are missing from the DOM.');
                }

                // Collect the values from the form elements
                const clientNameValue = clientName.value;
                const platformValue = platform ? platform.value : ''; // Platform is only in Summary
                const projectUrlValue = projectUrl ? projectUrl.value : ''; // Project URL is only in Summary
                const numViewsValue = numViews ? numViews.value : ''; // Number of Views is only in Summary
                const numIssuesValue = numIssues ? numIssues.value : ''; // Number of Issues is only in Summary

                // Collect the GPT response from session storage
                const gptResponse = sessionStorage.getItem('gptResponse');
                if (!gptResponse) {
                    throw new Error('GPT response not found in session storage.');
                }

                // Retrieve the selected tool type from session storage
                const selectedTool = sessionStorage.getItem('selectedTool');
                if (!selectedTool) {
                    throw new Error('Selected tool not found in session storage.');
                }

                // Prepare data to be sent to the server
                const data = {
                    clientName: clientNameValue,
                    platform: platformValue,
                    projectUrl: projectUrlValue,
                    numViews: numViewsValue,
                    numIssues: numIssuesValue,
                    gptResponse, // Just pass the markdown response directly
                    toolType: selectedTool
                };

                // Send data to the server to store it for later document generation
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
