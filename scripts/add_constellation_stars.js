const fs = require('fs');
const path = require('path');

// Stars needed for constellation lines (HIP IDs)
const neededStars = new Set([
    // LEO
    55434, 55642, 54879, 49669, 49583, 50583, 54872, 57632, 50335, 48455, 47908, 47508,
    // ARI  
    13209, 9884, 8903, 9153, 13061, 13914, 14838, 10306, 8832,
    // TAU
    25428, 21881, 20889, 26451, 20205, 20455, 18724, 16369, 21421, 20894, 20648, 17847, 18907, 15900,
    // GEM
    31681, 34088, 35550, 35350, 32362, 36962, 37740, 37826, 36046, 34693, 36850, 33018, 32246, 30883, 30343, 29655, 28734,
    // CNC
    43103, 42806, 40843, 42911, 44066, 40526,
    // VIR
    57380, 60030, 61941, 65474, 69427, 69701, 71957, 66249, 68520, 72220, 63090, 63608,
    // LIB
    74785, 76333, 77853, 78207, 72622, 73714, 76600, 76470, 74392,
    // SCO
    80112, 80763, 81266, 78401, 82396, 82545, 82729, 84143, 86228, 87073, 86670, 85927, 85696, 78265, 78820,
    // SGR
    94141, 93683, 93085, 93864, 92855, 93506, 89931, 92041, 88635, 89642, 90185, 90496, 89341, 95168, 98162, 98688,
    // UMA
    67301, 65378, 62956, 59774, 54061, 53910, 58001, 57399, 54539, 50372, 50801, 48402, 46853, 44471, 44127, 48319, 41704, 46733
]);

// Read existing stars
const starsPath = path.join(__dirname, '../src/data/stars_100.json');
const starsData = JSON.parse(fs.readFileSync(starsPath, 'utf8'));
const existingStars = starsData.stars;

// Get existing HIP IDs
const existingHips = new Set();
existingStars.forEach(star => {
    const match = star.id.match(/HIP(\d+)/);
    if (match) existingHips.add(parseInt(match[1]));
});

console.log('Existing stars:', existingHips.size);
console.log('Needed stars:', neededStars.size);

// Find missing stars
const missingHips = [...neededStars].filter(hip => !existingHips.has(hip));
console.log('Missing stars:', missingHips.length);
console.log('Missing:', missingHips.join(', '));

// Read HYG data
const hygPath = path.join(__dirname, '../HYGdata.csv');
const hygData = fs.readFileSync(hygPath, 'utf8');
const lines = hygData.split('\n');
const header = lines[0].split(',').map(h => h.replace(/"/g, ''));

// Parse HYG data and find missing stars
const newStars = [];
for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
    if (values.length < 15) continue;
    
    const hip = parseInt(values[header.indexOf('hip')]);
    if (!missingHips.includes(hip)) continue;
    
    const ra = parseFloat(values[header.indexOf('ra')]) * 15; // Convert hours to degrees
    const dec = parseFloat(values[header.indexOf('dec')]);
    const mag = parseFloat(values[header.indexOf('mag')]);
    const spect = values[header.indexOf('spect')] || '';
    const proper = values[header.indexOf('proper')] || null;
    const con = values[header.indexOf('con')] || '';
    const dist = parseFloat(values[header.indexOf('dist')]) || 1000;
    
    newStars.push({
        id: 'HIP' + hip,
        name: proper || null,
        constellation: con,
        ra: ra,
        dec: dec,
        magnitude: mag,
        spectralType: spect.charAt(0) || 'G',
        distance: dist
    });
}

console.log('Found', newStars.length, 'new stars from HYG');

// Combine and sort by magnitude
const allStars = [...existingStars, ...newStars].sort((a, b) => a.magnitude - b.magnitude);

// Update metadata
starsData.metadata.count = allStars.length;
starsData.metadata.note = 'Expanded star catalog with constellation anchor stars';
starsData.stars = allStars;

// Write updated file
fs.writeFileSync(starsPath, JSON.stringify(starsData, null, 2));
console.log('Updated stars_100.json with', allStars.length, 'stars');
