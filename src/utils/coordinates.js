/**
 * Coordinate conversion utilities for astronomical calculations
 * Handles RA/Dec to Azimuth/Altitude and screen projection
 */

// Convert degrees to radians
export const degToRad = (deg) => (deg * Math.PI) / 180;

// Convert radians to degrees
export const radToDeg = (rad) => (rad * 180) / Math.PI;

/**
 * Convert Right Ascension and Declination (equatorial coordinates)
 * to Altitude and Azimuth (horizontal coordinates)
 * 
 * @param {number} ra - Right Ascension in degrees (0-360)
 * @param {number} dec - Declination in degrees (-90 to 90)
 * @param {number} lat - Observer latitude in degrees
 * @param {number} lon - Observer longitude in degrees
 * @param {Date} date - Current date/time
 * @returns {{altitude: number, azimuth: number}} Horizontal coordinates in degrees
 */
export const equatorialToHorizontal = (ra, dec, lat, lon, date = new Date()) => {
  // Calculate Local Sidereal Time (LST)
  const jd = getJulianDate(date);
  const T = (jd - 2451545.0) / 36525;
  
  // Greenwich Mean Sidereal Time in degrees
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
             0.000387933 * T * T - T * T * T / 38710000;
  gmst = ((gmst % 360) + 360) % 360;
  
  // Local Sidereal Time
  const lst = (gmst + lon + 360) % 360;
  
  // Hour Angle
  const ha = (lst - ra + 360) % 360;
  
  // Convert to radians for calculation
  const haRad = degToRad(ha);
  const decRad = degToRad(dec);
  const latRad = degToRad(lat);
  
  // Calculate altitude
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
                 Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = radToDeg(Math.asin(sinAlt));
  
  // Calculate azimuth
  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
                (Math.cos(latRad) * Math.cos(degToRad(altitude)));
  let azimuth = radToDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  
  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }
  
  return { altitude, azimuth };
};

/**
 * Get Julian Date from a JavaScript Date object
 * @param {Date} date 
 * @returns {number} Julian Date
 */
export const getJulianDate = (date) => {
  const time = date.getTime();
  return time / 86400000 + 2440587.5;
};

/**
 * Convert horizontal coordinates (azimuth/altitude) to screen coordinates
 * using stereographic projection
 * 
 * @param {number} azimuth - Azimuth in degrees (0-360, 0=North)
 * @param {number} altitude - Altitude in degrees (0-90)
 * @param {number} viewAzimuth - Center of view azimuth in degrees
 * @param {number} viewAltitude - Center of view altitude in degrees
 * @param {number} fieldOfView - Field of view in degrees
 * @param {number} screenWidth - Screen width in pixels
 * @param {number} screenHeight - Screen height in pixels
 * @returns {{x: number, y: number, visible: boolean}} Screen coordinates
 */
export const horizontalToScreen = (
  azimuth,
  altitude,
  viewAzimuth,
  viewAltitude,
  fieldOfView,
  screenWidth,
  screenHeight
) => {
  // Convert to radians
  const az = degToRad(azimuth);
  const alt = degToRad(altitude);
  const vAz = degToRad(viewAzimuth);
  const vAlt = degToRad(viewAltitude);
  const fov = degToRad(fieldOfView);
  
  // Convert spherical to Cartesian coordinates
  const x1 = Math.cos(alt) * Math.sin(az);
  const y1 = Math.cos(alt) * Math.cos(az);
  const z1 = Math.sin(alt);
  
  // Rotate to view center
  // First rotate around Z axis (azimuth)
  const x2 = x1 * Math.cos(-vAz) - y1 * Math.sin(-vAz);
  const y2 = x1 * Math.sin(-vAz) + y1 * Math.cos(-vAz);
  const z2 = z1;
  
  // Then rotate around X axis (altitude)
  const x3 = x2;
  const y3 = y2 * Math.cos(-vAlt) - z2 * Math.sin(-vAlt);
  const z3 = y2 * Math.sin(-vAlt) + z2 * Math.cos(-vAlt);
  
  // Object is behind the viewer
  if (y3 <= 0) {
    return { x: 0, y: 0, visible: false };
  }
  
  // Stereographic projection
  const scale = screenWidth / (2 * Math.tan(fov / 2));
  const screenX = screenWidth / 2 + x3 / y3 * scale;
  const screenY = screenHeight / 2 - z3 / y3 * scale;
  
  // Check if within screen bounds (with some margin)
  const margin = 50;
  const visible = screenX >= -margin && 
                  screenX <= screenWidth + margin &&
                  screenY >= -margin && 
                  screenY <= screenHeight + margin;
  
  return { x: screenX, y: screenY, visible };
};

/**
 * Calculate angular distance between two points on the celestial sphere
 * @param {number} ra1 - RA of first point in degrees
 * @param {number} dec1 - Dec of first point in degrees
 * @param {number} ra2 - RA of second point in degrees
 * @param {number} dec2 - Dec of second point in degrees
 * @returns {number} Angular distance in degrees
 */
export const angularDistance = (ra1, dec1, ra2, dec2) => {
  const ra1Rad = degToRad(ra1);
  const dec1Rad = degToRad(dec1);
  const ra2Rad = degToRad(ra2);
  const dec2Rad = degToRad(dec2);
  
  const cosDist = Math.sin(dec1Rad) * Math.sin(dec2Rad) +
                  Math.cos(dec1Rad) * Math.cos(dec2Rad) * Math.cos(ra1Rad - ra2Rad);
  
  return radToDeg(Math.acos(Math.max(-1, Math.min(1, cosDist))));
};

/**
 * Normalize angle to 0-360 range
 * @param {number} angle - Angle in degrees
 * @returns {number} Normalized angle
 */
export const normalizeAngle = (angle) => {
  return ((angle % 360) + 360) % 360;
};
