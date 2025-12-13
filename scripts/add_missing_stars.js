const fs = require('fs');

// Missing stars data from HYGdata.csv
// Format: hip, ra, dec, mag, spect, proper, con
const missingStars = [
  { hip: 13209, ra: 2.177416, dec: 53.214741, mag: 8.17, spect: 'A0', proper: '', con: 'Per' },
  { hip: 13914, ra: 2.265508, dec: 15.819073, mag: 8.06, spect: 'F8', proper: '', con: 'Ari' },
  { hip: 8832, ra: 1.441369, dec: -30.275606, mag: 7.46, spect: 'K1III', proper: '', con: 'Scl' },
  { hip: 37740, ra: 7.740793, dec: 24.397993, mag: 3.57, spect: 'G8III', proper: 'Kappa Geminorum', con: 'Gem' },
  { hip: 32362, ra: 6.754824, dec: 12.895591, mag: 3.35, spect: 'F5IV', proper: 'Alzirr', con: 'Gem' },
  { hip: 28734, ra: 4.584824, dec: 57.420382, mag: 6.65, spect: 'F0', proper: '', con: 'Cam' },
  { hip: 44066, ra: 8.974784, dec: 11.857701, mag: 4.26, spect: 'A5m', proper: 'Acubens', con: 'Cnc' },
  { hip: 40526, ra: 8.275256, dec: 9.185545, mag: 3.53, spect: 'K4III', proper: 'Tarf', con: 'Cnc' },
  { hip: 40843, ra: 8.334406, dec: 27.217707, mag: 5.13, spect: 'F6V', proper: 'Chi Cancri', con: 'Cnc' },
  { hip: 72220, ra: 14.770812, dec: 1.892885, mag: 3.73, spect: 'A0V', proper: '109 Virginis', con: 'Vir' },
  { hip: 57380, ra: 7.37365, dec: 33.224436, mag: 8.07, spect: 'B9', proper: '', con: 'Gem' },
  { hip: 65474, ra: 13.419883, dec: -11.161322, mag: 0.98, spect: 'B1V', proper: 'Spica', con: 'Vir' },
  { hip: 76333, ra: 8.937087, dec: 24.447757, mag: 6.74, spect: 'F3V', proper: '', con: 'Cnc' },
  { hip: 74785, ra: 15.283449, dec: -9.382917, mag: 2.61, spect: 'B8V', proper: 'Zubeneschamali', con: 'Lib' },
  { hip: 72622, ra: 14.847977, dec: -16.041778, mag: 2.75, spect: 'A3IV', proper: 'Zubenelgenubi', con: 'Lib' },
  { hip: 84143, ra: 9.744508, dec: 52.793597, mag: 8.28, spect: 'F5', proper: '', con: 'UMa' },
  { hip: 82396, ra: 9.524961, dec: -9.986932, mag: 8.33, spect: 'F0', proper: '', con: 'Hya' },
  { hip: 82514, ra: 9.52584, dec: -35.71475, mag: 5.86, spect: 'K3III', proper: '', con: 'Ant' },
  { hip: 92855, ra: 10.733524, dec: 46.206651, mag: 7.28, spect: 'F9V', proper: '', con: 'UMa' },
  { hip: 90185, ra: 10.406918, dec: -7.588141, mag: 7.91, spect: 'K5', proper: '', con: 'Sex' },
  { hip: 86228, ra: 9.941132, dec: -30.875382, mag: 8.63, spect: 'K0III', proper: '', con: 'Ant' },
  { hip: 65378, ra: 7.952403, dec: -33.249903, mag: 7.31, spect: 'B3V', proper: '', con: 'Pup' },
  { hip: 62956, ra: 12.900472, dec: 55.959821, mag: 1.76, spect: 'A0p', proper: 'Alioth', con: 'UMa' },
  { hip: 53910, ra: 11.030677, dec: 56.382427, mag: 2.34, spect: 'A1V', proper: 'Merak', con: 'UMa' },
  { hip: 17999, ra: 3.847896, dec: 23.96147, mag: 6.95, spect: 'A2V', proper: '', con: 'Tau' },
  { hip: 21421, ra: 4.598677, dec: 16.509301, mag: 0.87, spect: 'K5III', proper: 'Aldebaran', con: 'Tau' },
  { hip: 18907, ra: 3.027115, dec: -28.091554, mag: 5.88, spect: 'G8/K0V', proper: 'Epsilon Fornacis', con: 'For' },
];

// Read existing stars
const starsPath = './src/data/stars_100.json';
const data = JSON.parse(fs.readFileSync(starsPath, 'utf8'));
const stars = data.stars || data; // Handle both formats

// Convert RA from hours to degrees (RA in HYG is in hours)
function raHoursToDegrees(raHours) {
  return raHours * 15; // 1 hour = 15 degrees
}

// Add missing stars
let addedCount = 0;
for (const star of missingStars) {
  const id = `HIP${star.hip}`;
  
  // Check if already exists
  if (stars.some(s => s.id === id)) {
    console.log(`Star ${id} already exists, skipping`);
    continue;
  }
  
  const newStar = {
    id: id,
    name: star.proper || null,
    ra: raHoursToDegrees(star.ra),
    dec: star.dec,
    magnitude: star.mag,
    spectralType: star.spect || null,
    constellation: star.con || null,
    distance: null
  };
  
  stars.push(newStar);
  addedCount++;
  console.log(`Added ${id} (${star.proper || 'unnamed'}) - mag ${star.mag}`);
}

// Sort by magnitude (brightest first)
stars.sort((a, b) => a.magnitude - b.magnitude);

// Write back (preserve metadata if present)
if (data.metadata) {
  data.stars = stars;
  fs.writeFileSync(starsPath, JSON.stringify(data, null, 2));
} else {
  fs.writeFileSync(starsPath, JSON.stringify(stars, null, 2));
}
console.log(`\nAdded ${addedCount} new stars. Total: ${stars.length} stars.`);

// Additional missing stars for Sagittarius
const additionalMissing = [
  { hip: 95294, ra: 11.026618, dec: 66.449708, mag: 7.8, spect: 'K0', proper: '', con: 'UMa' },
  { hip: 87072, ra: 17.792674, dec: -27.830788, mag: 4.53, spect: 'F7II', proper: '3 Sagittarii', con: 'Sgr' },
];

console.log('\nAdding additional missing stars...');
const data2 = JSON.parse(fs.readFileSync(starsPath, 'utf8'));
const stars2 = data2.stars || data2;

function raHoursToDegrees2(raHours) {
  return raHours * 15;
}

for (const star of additionalMissing) {
  const id = `HIP${star.hip}`;
  if (stars2.some(s => s.id === id)) {
    console.log(`Star ${id} already exists, skipping`);
    continue;
  }
  
  const newStar = {
    id: id,
    name: star.proper || null,
    ra: raHoursToDegrees2(star.ra),
    dec: star.dec,
    magnitude: star.mag,
    spectralType: star.spect || null,
    constellation: star.con || null,
    distance: null
  };
  
  stars2.push(newStar);
  console.log(`Added ${id} (${star.proper || 'unnamed'}) - mag ${star.mag}`);
}

stars2.sort((a, b) => a.magnitude - b.magnitude);

if (data2.metadata) {
  data2.stars = stars2;
  fs.writeFileSync(starsPath, JSON.stringify(data2, null, 2));
} else {
  fs.writeFileSync(starsPath, JSON.stringify(stars2, null, 2));
}
console.log(`Total: ${stars2.length} stars.`);
