// Function to display markdown content in a specified HTML element
function displayMarkdownResponse(markdown, responseDiv) {
    responseDiv.innerHTML = ''; // Clear the previous response

    // Ensure 'marked' is properly recognized as a function. This might occur if the library is loaded differently.
    if (typeof marked !== 'function' && marked.marked) {
        marked = marked.marked;
    }

    // Convert the markdown text into HTML using the 'marked' library
    const markdownContainer = document.createElement('div');
    markdownContainer.innerHTML = marked(markdown); // Convert Markdown to HTML
    responseDiv.appendChild(markdownContainer); // Append the converted HTML to the response container
}

// Function to handle responses received via WebSocket
export function handleSocketResponse(socket) {
    // Listen for the 'gptResponse' event, which carries the markdown response from GPT
    socket.on('gptResponse', (markdown) => {
        const responseDiv = document.getElementById('gpt-response'); // The container where the GPT response will be displayed
        const progressDiv = document.getElementById('summaryProgress'); // The container showing upload/processing progress
        const ariaStatus = document.getElementById('ariaStatus'); // The ARIA live region for accessibility
        const submitButton = document.querySelector('input[type="submit"]'); // The submit button for the form

        try {
            // Check if the markdown response is valid
            if (!markdown) {
                throw new Error('Received undefined response from OpenAI.');
            }

            // Display the markdown response in the specified container
            displayMarkdownResponse(markdown, responseDiv);

            // Update progress and ARIA status to inform the user that processing is complete
            progressDiv.textContent = 'Processing completed. Displaying results...';
            ariaStatus.textContent = 'Processing completed. Displaying results.';
        } catch (err) {
            // Handle any errors that occur during the display of the GPT response
            console.error('Error displaying GPT response:', err);
            progressDiv.textContent = 'An error occurred while processing the response. Please try again.';
            ariaStatus.textContent = 'An error occurred. Unable to display results.';
            responseDiv.innerHTML = `<p>Error: ${err.message}</p>`;
        } finally {
            // Ensure the document creation button is visible and re-enable the submit button
            document.getElementById('create-document').classList.remove('hidden');
            submitButton.disabled = false;
        }
    });
}

// Function to handle WebSocket disconnection events
export function handleSocketDisconnection(socket) {
    socket.on('disconnect', () => {
        const progressDiv = document.getElementById('progress'); // The container showing upload/processing progress
        const ariaStatus = document.getElementById('ariaStatus'); // The ARIA live region for accessibility
        progressDiv.textContent = 'Connection lost. Please try again.'; // Notify the user of the lost connection
        ariaStatus.textContent = 'Connection lost. Please try again.'; // Update the ARIA status for accessibility
    });
}
