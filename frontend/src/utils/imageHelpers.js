// A simple helper to get deterministic aesthetic photos from Unsplash for UI placeholders
export const getAestheticPhoto = (seedStr, width = 800, height = 600) => {
    if (!seedStr) return `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=${width}&h=${height}&fit=crop&q=80`;

    // Simple string hash
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Pre-selected study/aesthetic terms
    const topics = [
        'abstract,gradient',
        'study,desk',
        'library,books',
        'technology,code',
        'art,painting',
        'nature,calm',
        'architecture,modern',
        'space,stars',
        'coffee,aesthetic',
        'minimalist,interior'
    ];

    const index = Math.abs(hash) % topics.length;
    const topic = topics[index];

    // Adding random number derived from hash to bypass simple caching if needed, though Unsplash source URL randomizes on its own.
    // Using source.unsplash.com is deprecated, so we use the actual unsplash image ids or a stable random generator if we had one.
    // Since we want deterministic but variety, let's use a curated list of reliable Unsplash photo IDs.

    const curatedPositives = [
        '1513542789411-b6a5d4f314cb', // Abstract colors
        '1497032205947-10ce33ce672d', // Aesthetic desk
        '1457369804613-52c61a46114e', // Books
        '1526374965328-7f61d4dc18c5', // Code / Tech Matrix
        '1541701494587-cb58502866ab', // Abstract paint
        '1472214103451-9374bd1c798e', // Nature / Mountains
        '1486406146926-c627a92ad1ab', // Modern architecture
        '1462331940025-496dfbfc7564', // Stars / Space
        '1497935586351-b67a49e012bf', // Coffee
        '1493612278156-ee2b6fb16b51', // Minimalist
        '1507842217343-581d6c8e3178', // Study notes
        '1516321497487-e288fb1971ea', // Workspace
        '1550684848-fac1c5b4e853', // Abstract liquid
        '1557672172-298e090bd0f1', // Geometry
        '1618005182384-a83a8bd57fbe', // Abstract 3D
    ];

    const photoId = curatedPositives[Math.abs(hash) % curatedPositives.length];

    return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
};
