
export const renderMarkdownToHTML = (text: string): string => {
    // 1. Header Processing with SOAP specific colors and icons
    // We replace specific headers like ## Subjective with custom styled HTML.
    
    let processedText = text
        // Subjective - Blue
        .replace(/^##\s*Subjective/gim, 
            '<h2 class="text-lg font-bold mt-6 mb-3 text-blue-400 border-b border-blue-900/30 pb-1 flex items-center gap-2">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>' +
            'Subjective</h2>')
        // Objective - Red
        .replace(/^##\s*Objective/gim, 
            '<h2 class="text-lg font-bold mt-6 mb-3 text-red-400 border-b border-red-900/30 pb-1 flex items-center gap-2">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>' +
            'Objective</h2>')
        // Assessment - Green
        .replace(/^##\s*Assessment/gim, 
            '<h2 class="text-lg font-bold mt-6 mb-3 text-green-400 border-b border-green-900/30 pb-1 flex items-center gap-2">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>' +
            'Assessment</h2>')
        // Plan - Yellow
        .replace(/^##\s*Plan/gim, 
            '<h2 class="text-lg font-bold mt-6 mb-3 text-yellow-400 border-b border-yellow-900/30 pb-1 flex items-center gap-2">' +
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' +
            'Plan</h2>')
        // Fallback Headers
        .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2 text-gray-200">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-5 mb-3 border-b border-gray-700 pb-1 text-gray-100">$1</h2>');

    // 2. Text Formatting
    processedText = processedText
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-100 font-semibold">$1</strong>') // Bold to lighter white
        .replace(/\*(.*?)\*/g, '<em class="text-gray-400">$1</em>'); // Italic to grey

    // 3. Block Processing (Lists vs Paragraphs)
    const lines = processedText.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
        const trimmed = line.trim();
        
        if (!trimmed) continue;

        // List detection
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            if (!inList) {
                inList = true;
                html += '<ul class="list-disc list-outside ml-5 space-y-1 mb-4 text-gray-300 text-sm leading-relaxed marker:text-gray-500">';
            }
            html += `<li class="pl-1">${content}</li>`;
        } else {
            if (inList) {
                inList = false;
                html += '</ul>';
            }
            
            // HTML headers (passed through from step 1)
            if (trimmed.startsWith('<h')) {
                html += trimmed;
            } 
            // Regular paragraphs
            else {
                html += `<p class="mb-3 text-gray-300 text-sm leading-relaxed">${trimmed}</p>`;
            }
        }
    }
    
    if (inList) html += '</ul>';

    return html;
};
