export function downloadFile(response, filename) {
    response.blob()
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error:', error);
            const progressDiv = document.getElementById('progress');
            progressDiv.textContent = 'An error occurred during document creation. Please try again.';
        });
}
