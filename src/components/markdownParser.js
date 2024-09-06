function parseMarkdown(markdown) {
    const categories = [];
    const lines = markdown.split('\n');
    let currentCategory = null;

    lines.forEach(line => {
        if (line.startsWith('### ')) {
            if (currentCategory) {
                categories.push(currentCategory);
            }
            currentCategory = {
                title: line.substring(4).trim(),
                issues: []
            };
        } else if (line.startsWith('- **#')) {
            if (currentCategory) {
                const issueDescription = line.replace(/\[Link\]\((.*?)\)/g, "").trim();
                const issueLinkMatch = line.match(/\[Link\]\((.*?)\)/);
                const issueLink = issueLinkMatch ? issueLinkMatch[1] : '';

                currentCategory.issues.push({
                    description: issueDescription,
                    link: issueLink
                });
            }
        }
    });

    if (currentCategory) {
        categories.push(currentCategory);
    }

    return { categories };
}

module.exports = {
    parseMarkdown
};
