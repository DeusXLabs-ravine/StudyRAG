/**
 * Utility for Sage Tutor to transform monolithic markdown responses
 * into structured segments for the Learning Canvas.
 */

export const segmentMarkdown = (text) => {
    if (!text) return [];

    // Split by headings (## or ###) but keep the heading in the segment
    // Also look for specific section markers like "Example:", "Note:", etc.

    const segments = [];
    const lines = text.split('\n');
    let currentBlock = [];
    let currentType = 'explanation'; // Default type
    let currentTitle = '';
    let isCollectingList = false;

    const flush = () => {
        if (currentBlock.length > 0) {
            segments.push({
                id: Math.random().toString(36).substr(2, 9),
                type: currentType,
                title: currentTitle,
                content: currentBlock.join('\n').trim()
            });
            currentBlock = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for headings
        const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
            flush();
            currentTitle = headingMatch[2];

            // Determine type based on heading text for Gamification/Interactivity
            const lowerTitle = currentTitle.toLowerCase();
            if (lowerTitle.includes('example') || lowerTitle.includes('practice')) {
                currentType = 'example';
            } else if (lowerTitle.includes('quiz') || lowerTitle.includes('check') || lowerTitle.includes('challenge')) {
                currentType = 'quiz';
            } else if (lowerTitle.includes('summary') || lowerTitle.includes('takeaway') || lowerTitle.includes('tip') || lowerTitle.includes('key term')) {
                currentType = 'summary';
            } else if (lowerTitle.includes('diagram') || lowerTitle.includes('visual')) {
                currentType = 'diagram';
            } else if (lowerTitle.includes('game') || lowerTitle.includes('level up')) {
                currentType = 'game';
            } else {
                currentType = 'explanation';
            }

            // We don't necessarily want the heading *inside* the card if it's the title
            continue;
        }

        // Inline markers for deep interactives
        if (line.match(/^(Example|Note|Quiz|Recall|Challenge|Visual|Tip|Key Term):\s*/i)) {
            flush();
            const marker = line.split(':')[0].trim();
            currentTitle = marker;

            const lowerMarker = marker.toLowerCase();
            if (lowerMarker === 'example') currentType = 'example';
            else if (lowerMarker === 'quiz' || lowerMarker === 'challenge') currentType = 'quiz';
            else if (lowerMarker === 'visual') currentType = 'diagram';
            else if (lowerMarker === 'tip' || lowerMarker === 'key term') currentType = 'summary';
            else currentType = 'note';

            currentBlock.push(line.split(':').slice(1).join(':').trim());
            continue;
        }

        currentBlock.push(line);
    }

    flush();

    // If we ended up with only one segment and it has no title, 
    // treat as standard "chat" to keep it simple.
    if (segments.length === 1 && !segments[0].title) {
        segments[0].type = 'chat';
    }

    return segments;
};
