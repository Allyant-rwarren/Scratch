export function handleDocumentCreation() {
    const createDocumentBtn = document.getElementById('create-document');
    createDocumentBtn.addEventListener('click', async function() {
        try {
            // Collect data from form elements
            const clientName = document.getElementById('clientName').value;
            const platform = document.getElementById('platform').value;
            const additionalInfo = document.getElementById('additionalInfo').value;

            // Collect the parsed GPT response from session storage
            const gptResponse = sessionStorage.getItem('gptResponse');
            if (!gptResponse) {
                throw new Error('GPT response not found in session storage.');
            }

            // Log each variable to ensure correctness
            console.log('Client Name:', clientName);
            console.log('Platform:', platform);
            console.log('Additional Info:', additionalInfo);
            console.log('GPT Response:', gptResponse);

            // Prepare data to be sent to the server
            const data = {
                clientName,
                platform,
                additionalInfo,
                gptResponse: JSON.parse(gptResponse)
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

            // Log success message
            console.log('Document data stored successfully.');

            // Update UI to indicate success
            const progressDiv = document.getElementById('progress');
            progressDiv.textContent = 'Document data stored successfully. Ready for document generation.';
        } catch (error) {
            console.error('Error:', error);
            const progressDiv = document.getElementById('progress');
            progressDiv.textContent = 'An error occurred while storing document data. Please try again.';
        }
    });
}