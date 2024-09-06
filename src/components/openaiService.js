const axios = require('axios');
const { DefaultAzureCredential } = require('@azure/identity');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendToOpenAI(content, toolType) {
    try {
        const credential = new DefaultAzureCredential();
        const tokenResponse = await credential.getToken('https://cognitiveservices.azure.com/.default');
        const token = tokenResponse.token;

        console.log('Token obtained successfully.');

        let instructions;
        if (toolType === 'vpat') {
            // VPAT specific instructions
            instructions = `
You are a helpful VPAT auditor assistant. You will receive CSV data containing accessibility common issues found on the client’s site. Your task is to assess each WCAG criterion and determine whether it is 'Supported' or 'Not Supported' based on the provided information.

Please respond in markdown format. Below is an example of the expected output:

### 1.1.1 Non-text Content
- **Support Status**: Does Not Support
- **Explanation**: Some elements within the application are not marked up as buttons for keyboard users.

### 2.1.1 Keyboard
- **Support Status**: Supports
- **Explanation**: All interactive elements are accessible via keyboard.

### 4.1.2 Name, Role, Value
- **Support Status**: Does Not Support
- **Explanation**: Some form elements are missing accessible names.

**Guidelines for Determination:**
1. **Critical or Serious Issues**: If the criterion has any associated issues marked as 'Critical' or 'Serious,' it should be marked as 'Does Not Support.'
2. **Warning Level Issues**: If the criterion only has 'Warning' level issues, it may still be marked as 'Supports' if the issues are minor and there are workarounds available. Use your judgment based on the context provided.
            `;
        } else {
            // Summary tool specific instructions
            instructions = `
You are a helpful WCAG auditor assistant. You will receive filtered CSV data containing accessibility issues from a client's website. Your mission is to analyze this data and categorize the issues into the top three categories of improvement, based on common themes or patterns you identify.

Guidelines:
1. Top Three Categories: Identify the top three categories for improvement based on the issues in the dataset. These categories should be selected based on the theme or commonality of the issues. Consider grouping issues that affect sitewide components, such as the header or footer, or specific components like modals.

2. Two Examples Per Category: For each of the top three categories, provide exactly two common issue examples that, if fixed, would have a significant impact on the website's accessibility. Include the description of the issue and a link to the specific issue.

3. Issue Number Format: For each issue example, use the "Hub ID" found in the CSV data. Precede the Hub ID with a pound sign \`#\` to represent the issue number. For example, if the Hub ID in the CSV is 101, it should appear as \`#101\`.

Format:
- Your response should be in markdown format.
- Each category should be presented with its two examples in a clear and structured manner, as shown below.

Output Example:

### [Insert Category Name]
- **#101** Description of issue 1. [Link](http://example.com/issue101)
- **#102** Description of issue 2. [Link](http://example.com/issue102)

### [Insert Category Name]
- **#103** Description of issue 3. [Link](http://example.com/issue103)
- **#104** Description of issue 4. [Link](http://example.com/issue104)

### [Insert Category Name]
- **#105** Description of issue 5. [Link](http://example.com/issue105)
- **#106** Description of issue 6. [Link](http://example.com/issue106)

Important Notes:
- Ensure that only two issues are provided per category.
- The categories and examples should be chosen based on their potential impact on accessibility if remediated.
- No additional text or formatting should be included in your response.
            `;
        }

        // Log which instructions are being sent
        console.log(`Sending instructions for tool type: ${toolType}`);
        console.log(instructions);

        const maxTokens = 4096;
        const tokenSizeEstimate = 50;
        let batches = [];
        let currentBatch = [];
        let currentTokens = 0;

        content.forEach(item => {
            const itemTokenCount = JSON.stringify(item).length / tokenSizeEstimate;
            if (currentTokens + itemTokenCount > maxTokens) {
                batches.push(currentBatch);
                currentBatch = [];
                currentTokens = 0;
            }
            currentBatch.push(item);
            currentTokens += itemTokenCount;
        });

        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }

        const responses = [];

        for (const batch of batches) {
            if (batch.length === 0) continue;

            console.log('Processing batch with OpenAI...');

            try {
                const response = await axios.post(
                    'https://allyopen.openai.azure.com/openai/deployments/gpt-4o-2/chat/completions?api-version=2023-03-15-preview',
                    {
                        messages: [
                            {
                                role: "system",
                                content: instructions
                            },
                            {
                                role: "user",
                                content: JSON.stringify(batch)
                            }
                        ],
                        max_tokens: 1500,
                        temperature: 0.5,
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        }
                    }
                );

                if (response.data && response.data.choices && response.data.choices[0]) {
                    const rawResponse = response.data.choices[0].message.content;
                    console.log('Received response from OpenAI:', rawResponse);
                    responses.push(rawResponse);
                } else {
                    console.warn('No valid response from OpenAI.');
                    responses.push('No valid response from OpenAI.');
                }

            } catch (error) {
                if (error.response && error.response.status === 429) {
                    console.warn('Rate limit exceeded, retrying after delay...');
                    await sleep(20000);
                    continue;
                } else {
                    console.error('Error during OpenAI API request:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
                    throw new Error(`An error occurred while communicating with the OpenAI API: ${error.message}`);
                }
            }

            await sleep(1000);
        }

        return responses.join('\n\n'); // Combine all responses and return as a single string
    } catch (generalError) {
        console.error('General error in sendToOpenAI:', generalError);
        throw new Error(`An unexpected error occurred during processing: ${generalError.message}`);
    }
}

module.exports = { sendToOpenAI };
