const fs = require('fs');
const fullStars = JSON.parse(fs.readFileSync('./src/data/stars_full.json', 'utf8'));

// All anchor HIP IDs needed for constellation artworks
const anchorHipIds = new Set([
    // Leo anchors + lines (Only Leo kept as per user request)
    57632, 49669, 47908, 55434, 55642, 54879, 49583, 50583, 54872, 50335, 48455, 47508
]);

// Get 100 brightest + all anchor stars
const brightStars = fullStars.stars.slice(0, 100);
const brightIds = new Set(brightStars.map(s => parseInt(s.id.replace('HIP', ''))));

// Add anchor stars that aren't already in bright list
const additionalAnchors = fullStars.stars.filter(s => {
    const hip = parseInt(s.id.replace('HIP', ''));
    return anchorHipIds.has(hip) && !brightIds.has(hip);
});

const combinedStars = [...brightStars, ...additionalAnchors];

const result = {
    metadata: {
        source: 'HYG Database v3',
        epoch: 'J2000.0',
        count: combinedStars.length,
        note: '100 brightest + Leo constellation anchor stars'
    },
    stars: combinedStars
};

fs.writeFileSync('./src/data/stars_optimized.json', JSON.stringify(result, null, 2));
console.log('Created stars_optimized.json:');
console.log('  Bright stars:', brightStars.length);
console.log('  Additional anchors:', additionalAnchors.length);
console.log('  Total:', combinedStars.length);
