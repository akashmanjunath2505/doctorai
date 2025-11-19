export const renderMarkdownToHTML = (text: string): string => {
    let html = text
        .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-5 mb-3 border-b border-aivana-light-grey pb-1">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Process tables
    const lines = html.split('\n');
    let inTable = false;
    const processedLines = lines.map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
            const cells = trimmedLine.split('|').slice(1, -1);
            if (!inTable) {
                inTable = true;
                // This is a header row
                const header = cells.map(cell => `<th>${cell.trim()}</th>`).join('');
                return `<div class="overflow-x-auto my-3"><table class="w-full text-left border-collapse"><thead><tr class="bg-aivana-grey">${header}</tr></thead><tbody>`;
            } else if (cells.every(cell => cell.trim().match(/^--+$/))) {
                // This is the separator line, ignore it
                return '';
            } else {
                // This is a body row
                const row = cells.map(cell => `<td>${cell.trim()}</td>`).join('');
                return `<tr>${row}</tr>`;
            }
        } else {
            if (inTable) {
                inTable = false;
                return `</tbody></table></div>${trimmedLine ? `<p>${trimmedLine}</p>` : ''}`;
            }
            return trimmedLine; // Pass through non-table lines for list/paragraph processing
        }
    }).join('\n');

    // Process lists and paragraphs on the result of table processing
    const listLines = processedLines.split('\n');
    let inList = false;
    let finalHtml = listLines.map(line => {
        const trimmedLine = line.trim();
         if (trimmedLine.startsWith('- ')) {
            const listItem = `<li>${trimmedLine.substring(2)}</li>`;
            if (!inList) {
                inList = true;
                return `<ul class="list-disc list-outside ml-5 space-y-1">${listItem}`;
            }
            return listItem;
        } else {
            if (inList) {
                inList = false;
                // Check if the line is an HTML tag (like a table)
                if (trimmedLine.startsWith('<')) {
                    return `</ul>${trimmedLine}`;
                }
                return `</ul>${trimmedLine ? `<p>${trimmedLine}</p>` : ''}`;
            }
             if (trimmedLine.startsWith('<')) {
                return trimmedLine;
            }
            return trimmedLine ? `<p>${trimmedLine}</p>` : '';
        }
    }).join('');

    if (inTable) finalHtml += '</tbody></table></div>';
    if (inList) finalHtml += '</ul>';

    return finalHtml.replace(/<p>\s*<\/p>/g, ''); // Clean up empty paragraphs
};
