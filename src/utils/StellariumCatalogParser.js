/**
 * Stellarium Star Catalog Parser
 * 
 * Parses Stellarium's binary .cat star catalog files.
 * Based on Stellarium's ZoneArray format.
 * 
 * Catalog Structure:
 * - Header: magic number, type, major/minor version, level, mag_min, mag_range, mag_steps
 * - Zones: Each zone contains stars for a HEALPix tile
 * - Stars: Packed binary data with position, magnitude, spectral type
 */

import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

// Stellarium catalog magic number
const CATALOG_MAGIC = 0x835F040A;
const CATALOG_MAGIC_OTHER = 0x835F040B;

/**
 * Star data structure after parsing
 */
class Star {
  constructor(hip, ra, dec, magnitude, spectralType) {
    this.hip = hip;           // Hipparcos ID (if available)
    this.ra = ra;             // Right Ascension in degrees
    this.dec = dec;           // Declination in degrees
    this.magnitude = magnitude;
    this.spectralType = spectralType;
  }
}

/**
 * Parse a Stellarium .cat binary catalog file
 * @param {string} filePath - Path to the .cat file
 * @param {number} maxMagnitude - Only load stars brighter than this (for LOD)
 * @returns {Promise<Star[]>} Array of parsed stars
 */
export async function parseStellariumCatalog(filePath, maxMagnitude = 99) {
  try {
    // Read file as base64 and convert to buffer
    const base64Data = await RNFS.readFile(filePath, 'base64');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const stars = [];
    let offset = 0;
    
    // Read header
    const magic = buffer.readUInt32LE(offset); offset += 4;
    
    if (magic !== CATALOG_MAGIC && magic !== CATALOG_MAGIC_OTHER) {
      console.warn('Invalid catalog magic number:', magic.toString(16));
      return stars;
    }
    
    const catalogType = buffer.readUInt32LE(offset); offset += 4;
    const majorVersion = buffer.readUInt32LE(offset); offset += 4;
    const minorVersion = buffer.readUInt32LE(offset); offset += 4;
    const level = buffer.readUInt32LE(offset); offset += 4;
    const magMin = buffer.readInt32LE(offset); offset += 4;
    const magRange = buffer.readUInt32LE(offset); offset += 4;
    const magSteps = buffer.readUInt32LE(offset); offset += 4;
    
    console.log(`Catalog: type=${catalogType}, v${majorVersion}.${minorVersion}, level=${level}`);
    console.log(`Magnitude: min=${magMin/1000}, range=${magRange/1000}, steps=${magSteps}`);
    
    // Calculate number of zones based on HEALPix level
    const nZones = 12 * Math.pow(4, level);
    
    // Read zone offsets
    const zoneOffsets = [];
    for (let i = 0; i <= nZones; i++) {
      zoneOffsets.push(buffer.readUInt32LE(offset));
      offset += 4;
    }
    
    // Parse stars from each zone
    for (let zoneId = 0; zoneId < nZones; zoneId++) {
      const zoneStart = zoneOffsets[zoneId];
      const zoneEnd = zoneOffsets[zoneId + 1];
      
      if (zoneStart === zoneEnd) continue; // Empty zone
      
      // Parse stars in this zone based on catalog type
      const zoneStars = parseZoneStars(buffer, zoneStart, zoneEnd, catalogType, magMin, magRange, magSteps, maxMagnitude);
      stars.push(...zoneStars);
    }
    
    console.log(`Parsed ${stars.length} stars from catalog`);
    return stars;
    
  } catch (error) {
    console.error('Error parsing Stellarium catalog:', error);
    return [];
  }
}

/**
 * Parse stars within a single zone
 */
function parseZoneStars(buffer, start, end, catalogType, magMin, magRange, magSteps, maxMagnitude) {
  const stars = [];
  let offset = start;
  
  // Star record size depends on catalog type
  // Type 0: 28 bytes (HIP stars with full data)
  // Type 1: 10 bytes (extended catalog, compact format)
  // Type 2: 6 bytes (deep catalog, minimal format)
  
  const recordSize = catalogType === 0 ? 28 : (catalogType === 1 ? 10 : 6);
  
  while (offset + recordSize <= end) {
    try {
      let star;
      
      if (catalogType === 0) {
        // HIP catalog format (28 bytes)
        star = parseHipStar(buffer, offset, magMin, magRange, magSteps);
      } else if (catalogType === 1) {
        // Extended catalog format (10 bytes)
        star = parseExtendedStar(buffer, offset, magMin, magRange, magSteps);
      } else {
        // Deep catalog format (6 bytes)
        star = parseDeepStar(buffer, offset, magMin, magRange, magSteps);
      }
      
      if (star && star.magnitude <= maxMagnitude) {
        stars.push(star);
      }
      
      offset += recordSize;
    } catch (e) {
      offset += recordSize;
    }
  }
  
  return stars;
}

/**
 * Parse a HIP catalog star (Type 0, 28 bytes)
 */
function parseHipStar(buffer, offset, magMin, magRange, magSteps) {
  // Format: hip(4) + componentIds(1) + x0(4) + x1(4) + bV(1) + mag(1) + spInt(2) + dx0(4) + dx1(4) + plx(4)
  const hip = buffer.readInt32LE(offset);
  const x0 = buffer.readInt32LE(offset + 5);
  const x1 = buffer.readInt32LE(offset + 9);
  const magByte = buffer.readUInt8(offset + 14);
  const spInt = buffer.readUInt16LE(offset + 15);
  
  // Convert packed position to RA/Dec
  const { ra, dec } = unpackPosition(x0, x1);
  
  // Convert magnitude byte to actual magnitude
  const magnitude = (magMin + magByte * magRange / magSteps) / 1000;
  
  // Convert spectral type integer to string
  const spectralType = decodeSpectralType(spInt);
  
  return new Star(hip, ra, dec, magnitude, spectralType);
}

/**
 * Parse an extended catalog star (Type 1, 10 bytes)
 */
function parseExtendedStar(buffer, offset, magMin, magRange, magSteps) {
  // Format: x0(3) + x1(3) + bV(1) + mag(2) + spInt(1)
  const x0 = buffer.readUIntLE(offset, 3);
  const x1 = buffer.readUIntLE(offset + 3, 3);
  const magShort = buffer.readUInt16LE(offset + 7);
  
  const { ra, dec } = unpackPositionSmall(x0, x1);
  const magnitude = (magMin + magShort * magRange / 65535) / 1000;
  
  return new Star(0, ra, dec, magnitude, '');
}

/**
 * Parse a deep catalog star (Type 2, 6 bytes)
 */
function parseDeepStar(buffer, offset, magMin, magRange, magSteps) {
  // Format: x0(2) + x1(2) + mag(2)
  const x0 = buffer.readUInt16LE(offset);
  const x1 = buffer.readUInt16LE(offset + 2);
  const magShort = buffer.readUInt16LE(offset + 4);
  
  const { ra, dec } = unpackPositionTiny(x0, x1);
  const magnitude = (magMin + magShort * magRange / 65535) / 1000;
  
  return new Star(0, ra, dec, magnitude, '');
}

/**
 * Convert packed 32-bit position to RA/Dec
 */
function unpackPosition(x0, x1) {
  // Stellarium uses a custom projection; this is simplified
  const scale = 1.0 / 2147483647.0; // 2^31 - 1
  const nx = x0 * scale;
  const ny = x1 * scale;
  
  // Convert to spherical coordinates
  const r2 = nx * nx + ny * ny;
  if (r2 > 1) {
    return { ra: 0, dec: 0 };
  }
  
  const nz = Math.sqrt(1 - r2);
  
  // Convert to RA/Dec (degrees)
  const dec = Math.asin(nz) * 180 / Math.PI;
  const ra = Math.atan2(ny, nx) * 180 / Math.PI;
  
  return { 
    ra: ra < 0 ? ra + 360 : ra, 
    dec 
  };
}

function unpackPositionSmall(x0, x1) {
  const scale = 1.0 / 8388607.0; // 2^23 - 1
  return unpackPosition(x0 * (2147483647 / 8388607), x1 * (2147483647 / 8388607));
}

function unpackPositionTiny(x0, x1) {
  const scale = 1.0 / 32767.0; // 2^15 - 1
  return unpackPosition(x0 * (2147483647 / 32767), x1 * (2147483647 / 32767));
}

/**
 * Decode spectral type from integer
 */
function decodeSpectralType(spInt) {
  const classes = ['O', 'B', 'A', 'F', 'G', 'K', 'M', 'R', 'S', 'N', 'W', 'C'];
  const luminosity = ['Ia', 'Ib', 'II', 'III', 'IV', 'V', 'VI', ''];
  
  if (spInt === 0) return '';
  
  const classIdx = Math.floor((spInt >> 8) / 10);
  const subClass = (spInt >> 8) % 10;
  const lumIdx = spInt & 0x07;
  
  if (classIdx >= classes.length) return '';
  
  return `${classes[classIdx]}${subClass}${luminosity[lumIdx] || ''}`;
}

export default {
  parseStellariumCatalog,
  Star
};
