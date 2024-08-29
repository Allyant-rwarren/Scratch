const axios = require('axios');
const { DefaultAzureCredential } = require('@azure/identity');

async function sendToOpenAI(content) {
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://cognitiveservices.azure.com/.default');

    const requestData = {
        messages: [
            {
                role: "user",
                content: JSON.stringify(content),
            },
        ],
        max_tokens: 1500,
        temperature: 0.5,
    };

    const requestHeaders = {
        'Authorization': `Bearer ${tokenResponse.token}`,
        'Content-Type': 'application/json',
    };

    const requestUrl = `${process.env.OPENAI_API_ENDPOINT}/openai/deployments/${process.env.ASSISTANT_ID}/completions?api-version=2023-03-15-preview`;

    // Log the request details for debugging
    console.log('Sending request to OpenAI:', {
        url: requestUrl,
        headers: requestHeaders,
        data: requestData,
    });

    try {
        const response = await axios.post(requestUrl, requestData, { headers: requestHeaders });

        const rawResponse = response.data.choices[0].message.content.trim();
        console.log('Raw response from OpenAI:', rawResponse);

        try {
            const jsonResponse = JSON.parse(rawResponse);
            console.log('Parsed OpenAI response:', JSON.stringify(jsonResponse, null, 2));
            return jsonResponse;
        } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            console.error('Failed response content:', rawResponse);

            // Fallback: Return raw response as a plain text string
            return { error: "Failed to parse the response as JSON.", rawResponse: rawResponse };
        }

    } catch (error) {
        console.error('Error from OpenAI API:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { sendToOpenAI };
