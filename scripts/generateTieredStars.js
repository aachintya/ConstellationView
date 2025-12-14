#!/usr/bin/env node
/**
 * Generate Tiered Star Catalog from HYG Database
 * 
 * Creates a magnitude-based star catalog for dynamic loading:
 * - Extended range up to magnitude 7.5 for deep zoom
 * - ~8000 stars total for rich sky experience
 * - Magnitude sorted for efficient filtering
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Extended magnitude thresholds - more stars for immersive experience
const TIERS = [
    { name: 'tier1', maxMag: 2.0, maxCount: 100, description: 'Brightest stars - always visible' },
    { name: 'tier2', maxMag: 3.5, maxCount: 400, description: 'Bright stars - FOV < 80°' },
    { name: 'tier3', maxMag: 4.5, maxCount: 1000, description: 'Medium stars - FOV < 50°' },
    { name: 'tier4', maxMag: 5.5, maxCount: 2000, description: 'Dim stars - FOV < 30°' },
    { name: 'tier5', maxMag: 6.5, maxCount: 3000, description: 'Faint stars - FOV < 15°' },
    { name: 'tier6', maxMag: 7.5, maxCount: 2000, description: 'Very faint stars - FOV < 5° (deep zoom)' }
];
// Target: ~8500 total stars for rich sky

// Maps constellation abbreviations
const CONSTELLATION_NAMES = {
    'And': 'Andromeda', 'Ant': 'Antlia', 'Aps': 'Apus', 'Aqr': 'Aquarius',
    'Aql': 'Aquila', 'Ara': 'Ara', 'Ari': 'Aries', 'Aur': 'Auriga',
    'Boo': 'Boötes', 'Cae': 'Caelum', 'Cam': 'Camelopardalis', 'Cnc': 'Cancer',
    'CVn': 'Canes Venatici', 'CMa': 'Canis Major', 'CMi': 'Canis Minor',
    'Cap': 'Capricornus', 'Car': 'Carina', 'Cas': 'Cassiopeia', 'Cen': 'Centaurus',
    'Cep': 'Cepheus', 'Cet': 'Cetus', 'Cha': 'Chamaeleon', 'Cir': 'Circinus',
    'Col': 'Columba', 'Com': 'Coma Berenices', 'CrA': 'Corona Australis',
    'CrB': 'Corona Borealis', 'Crv': 'Corvus', 'Crt': 'Crater', 'Cru': 'Crux',
    'Cyg': 'Cygnus', 'Del': 'Delphinus', 'Dor': 'Dorado', 'Dra': 'Draco',
    'Equ': 'Equuleus', 'Eri': 'Eridanus', 'For': 'Fornax', 'Gem': 'Gemini',
    'Gru': 'Grus', 'Her': 'Hercules', 'Hor': 'Horologium', 'Hya': 'Hydra',
    'Hyi': 'Hydrus', 'Ind': 'Indus', 'Lac': 'Lacerta', 'Leo': 'Leo',
    'LMi': 'Leo Minor', 'Lep': 'Lepus', 'Lib': 'Libra', 'Lup': 'Lupus',
    'Lyn': 'Lynx', 'Lyr': 'Lyra', 'Men': 'Mensa', 'Mic': 'Microscopium',
    'Mon': 'Monoceros', 'Mus': 'Musca', 'Nor': 'Norma', 'Oct': 'Octans',
    'Oph': 'Ophiuchus', 'Ori': 'Orion', 'Pav': 'Pavo', 'Peg': 'Pegasus',
    'Per': 'Perseus', 'Phe': 'Phoenix', 'Pic': 'Pictor', 'Psc': 'Pisces',
    'PsA': 'Piscis Austrinus', 'Pup': 'Puppis', 'Pyx': 'Pyxis', 'Ret': 'Reticulum',
    'Sge': 'Sagitta', 'Sgr': 'Sagittarius', 'Sco': 'Scorpius', 'Scl': 'Sculptor',
    'Sct': 'Scutum', 'Ser': 'Serpens', 'Sex': 'Sextans', 'Tau': 'Taurus',
    'Tel': 'Telescopium', 'Tri': 'Triangulum', 'TrA': 'Triangulum Australe',
    'Tuc': 'Tucana', 'UMa': 'Ursa Major', 'UMi': 'Ursa Minor', 'Vel': 'Vela',
    'Vir': 'Virgo', 'Vol': 'Volans', 'Vul': 'Vulpecula'
};

async function parseHYGData(filePath) {
    const stars = [];
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    
    let isFirstLine = true;
    let headerMap = {};
    
    for await (const line of rl) {
        if (isFirstLine) {
            // Parse header
            const headers = line.split(',').map(h => h.replace(/"/g, ''));
            headers.forEach((h, i) => headerMap[h] = i);
            isFirstLine = false;
            continue;
        }
        
        // Parse CSV line (handling quoted fields)
        const fields = parseCSVLine(line);
        
        const id = fields[headerMap['id']];
        const hip = fields[headerMap['hip']];
        const proper = fields[headerMap['proper']];
        const ra = parseFloat(fields[headerMap['ra']]);
        const dec = parseFloat(fields[headerMap['dec']]);
        const mag = parseFloat(fields[headerMap['mag']]);
        const spect = fields[headerMap['spect']];
        const dist = parseFloat(fields[headerMap['dist']]);
        const con = fields[headerMap['con']];
        const bayer = fields[headerMap['bayer']];
        
        // Skip invalid entries
        if (isNaN(ra) || isNaN(dec) || isNaN(mag)) continue;
        
        // Skip Sun (mag -26.7)
        if (mag < -20) continue;
        
        // Include stars up to magnitude 7.5 (beyond naked eye for deep zoom)
        if (mag > 7.5) continue;
        
        // Convert RA from hours to degrees (HYG uses hours)
        const raDeg = ra * 15; // 1 hour = 15 degrees
        
        // Determine tier
        let tier = 6;
        for (let i = 0; i < TIERS.length; i++) {
            if (mag < TIERS[i].maxMag) {
                tier = i + 1;
                break;
            }
        }
        
        // Create star entry
        const star = {
            id: hip ? `HIP${hip}` : `HYG${id}`,
            name: proper || null,
            constellation: con || '',
            ra: raDeg,
            dec: dec,
            magnitude: Math.round(mag * 100) / 100,
            spectralType: spect || '',
            distance: isNaN(dist) || dist <= 0 ? null : Math.round(dist * 3.26156 * 100) / 100, // parsecs to light-years
            tier: tier,
            bayer: bayer || null
        };
        
        stars.push(star);
    }
    
    return stars;
}

function parseCSVLine(line) {
    const fields = [];
    let field = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(field);
            field = '';
        } else {
            field += char;
        }
    }
    fields.push(field);
    
    return fields;
}

async function main() {
    const hygPath = path.join(__dirname, '..', 'HYGdata.csv');
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'stars_tiered.json');
    const androidOutputPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'stars_tiered.json');
    
    console.log('Parsing HYG Database...');
    const allStars = await parseHYGData(hygPath);
    
    console.log(`Found ${allStars.length} stars with magnitude <= 7.5`);
    
    // Organize by tier
    const tieredStars = {
        tier1: [],
        tier2: [],
        tier3: [],
        tier4: [],
        tier5: [],
        tier6: []
    };
    
    allStars.forEach(star => {
        const tierKey = `tier${star.tier}`;
        if (tieredStars[tierKey]) {
            tieredStars[tierKey].push(star);
        }
    });
    
    // Sort each tier by magnitude (brightest first) and limit count
    Object.keys(tieredStars).forEach((tier, index) => {
        tieredStars[tier].sort((a, b) => a.magnitude - b.magnitude);
        // Limit to maxCount for each tier
        if (TIERS[index]) {
            const maxCount = TIERS[index].maxCount;
            if (tieredStars[tier].length > maxCount) {
                tieredStars[tier] = tieredStars[tier].slice(0, maxCount);
            }
        }
    });
    
    // Create output
    const output = {
        metadata: {
            source: 'HYG Database v3',
            epoch: 'J2000.0',
            coordinates: 'ICRS/Equatorial',
            raUnit: 'degrees',
            decUnit: 'degrees',
            distanceUnit: 'light-years',
            generatedAt: new Date().toISOString(),
            description: 'Extended magnitude star catalog for immersive sky view',
            tiers: {
                tier1: { maxMagnitude: 2.0, fovThreshold: 150, description: 'Always visible - brightest stars' },
                tier2: { maxMagnitude: 3.5, fovThreshold: 80, description: 'Visible at FOV < 80°' },
                tier3: { maxMagnitude: 4.5, fovThreshold: 50, description: 'Visible at FOV < 50°' },
                tier4: { maxMagnitude: 5.5, fovThreshold: 30, description: 'Visible at FOV < 30°' },
                tier5: { maxMagnitude: 6.5, fovThreshold: 15, description: 'Visible at FOV < 15° (naked eye limit)' },
                tier6: { maxMagnitude: 7.5, fovThreshold: 5, description: 'Visible at FOV < 5° (deep zoom)' }
            },
            counts: {
                tier1: tieredStars.tier1.length,
                tier2: tieredStars.tier2.length,
                tier3: tieredStars.tier3.length,
                tier4: tieredStars.tier4.length,
                tier5: tieredStars.tier5.length,
                tier6: tieredStars.tier6.length,
                total: tieredStars.tier1.length + tieredStars.tier2.length + 
                       tieredStars.tier3.length + tieredStars.tier4.length + 
                       tieredStars.tier5.length + tieredStars.tier6.length
            }
        },
        stars: tieredStars
    };
    
    // Write output
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\nWritten to ${outputPath}`);
    
    // Also write to Android assets
    fs.writeFileSync(androidOutputPath, JSON.stringify(output, null, 2));
    console.log(`Written to ${androidOutputPath}`);
    
    // Print summary
    const totalStars = tieredStars.tier1.length + tieredStars.tier2.length + 
                      tieredStars.tier3.length + tieredStars.tier4.length + 
                      tieredStars.tier5.length + tieredStars.tier6.length;
    console.log('\n=== Star Catalog Summary ===');
    console.log(`Tier 1 (mag < 2.0):  ${tieredStars.tier1.length} stars - Always visible`);
    console.log(`Tier 2 (mag 2.0-3.5): ${tieredStars.tier2.length} stars - FOV < 80°`);
    console.log(`Tier 3 (mag 3.5-4.5): ${tieredStars.tier3.length} stars - FOV < 50°`);
    console.log(`Tier 4 (mag 4.5-5.5): ${tieredStars.tier4.length} stars - FOV < 30°`);
    console.log(`Tier 5 (mag 5.5-6.5): ${tieredStars.tier5.length} stars - FOV < 15°`);
    console.log(`Tier 6 (mag 6.5-7.5): ${tieredStars.tier6.length} stars - FOV < 5° (deep zoom)`);
    console.log(`Total: ${totalStars} stars (from ${allStars.length} available)`);
    
    // Print some notable stars
    console.log('\n=== Notable Stars in Tier 1 ===');
    tieredStars.tier1.slice(0, 10).forEach(s => {
        console.log(`  ${s.name || s.id}: mag ${s.magnitude}, ${s.constellation}`);
    });
}

main().catch(console.error);
