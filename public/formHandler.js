// Function to display markdown content in a specified HTML element
function displayMarkdownResponse(markdown, responseDiv) {
    responseDiv.innerHTML = ''; // Clear previous response

    // Ensure 'marked' is recognized as a function for converting markdown to HTML
    if (typeof marked !== 'function' && marked.marked) {
        marked = marked.marked;
    }

    // Convert the markdown text into HTML using 'marked'
    const markdownContainer = document.createElement('div');
    markdownContainer.innerHTML = marked(markdown); // Convert Markdown to HTML
    responseDiv.appendChild(markdownContainer); // Append the HTML to the response container
}

// Function to handle form submission for both the Summary Document tool and VPAT tool
export function handleFormSubmission(event, progressId) {
    event.preventDefault(); // Prevent the default form submission behavior

    const formData = new FormData(event.target); // Collect form data

    console.log('Sending form data:', Object.fromEntries(formData.entries())); // Log the form data for debugging

    // Update the progress indicator to inform the user that the file is being uploaded
    const progressDiv = document.getElementById(progressId);
    if (progressDiv) {
        progressDiv.textContent = 'Uploading file...';  // Provide immediate feedback to the user
    } else {
        console.error(`Progress indicator with ID ${progressId} not found.`);
    }

    // Create a POST request to the server with the form data
    const action = event.target.getAttribute('action'); // Get the form's action URL
    fetch(action, {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json()) // Parse the server's JSON response
    .then(data => {
        console.log('Success:', data);

        // Update the progress indicator to inform the user that the processing is complete
        if (progressDiv) {
            progressDiv.textContent = 'File uploaded successfully. Processing...';
        }

        // Check if the server's response contains a GPT response
        if (data.gptResponse) {
            const responseDiv = document.getElementById('gpt-response'); // Get the GPT response container
            displayMarkdownResponse(data.gptResponse, responseDiv); // Display the GPT markdown response

            // Store the GPT response in session storage
            sessionStorage.setItem('gptResponse', data.gptResponse);

            // Store the selected tool type in session storage
            const selectedTool = document.getElementById('toolSelect').value;
            sessionStorage.setItem('selectedTool', selectedTool);

            // Show the "Generate Document" button
            const createDocumentBtn = document.getElementById('create-document');
            createDocumentBtn.classList.remove('hidden');
        } else {
            throw new Error('Invalid response from the server.');
        }
    })
    .catch((error) => {
        console.error('Error:', error);

        // Update the progress indicator to inform the user that an error occurred
        if (progressDiv) {
            progressDiv.textContent = 'An error occurred during the upload. Please try again.';
        }
    });
}
