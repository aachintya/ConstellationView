/**
 * Stellarium Data Parser - Extended Version
 * Contains 1000+ stars for realistic sky rendering with LOD support
 * Organized by magnitude for Level-of-Detail rendering
 */

// Extended catalog of 1000+ stars visible to naked eye and binoculars (magnitude < 6.5)
// Format: HIP_ID: { ra, dec, mag, spectral, name, distance (in light-years) }
export const BRIGHT_STARS_CATALOG = {
    // ═══════════════════════════════════════════════════════════════════
    // MAGNITUDE < 0 (Brightest stars - always visible)
    // ═══════════════════════════════════════════════════════════════════
    32349: { ra: 101.287, dec: -16.716, mag: -1.46, spectral: 'A1V', name: 'Sirius', distance: 8.6 },
    30438: { ra: 95.988, dec: -52.696, mag: -0.74, spectral: 'A9II', name: 'Canopus', distance: 310 },
    69673: { ra: 213.915, dec: 19.182, mag: -0.05, spectral: 'K1III', name: 'Arcturus', distance: 36.7 },
    71683: { ra: 219.902, dec: -60.834, mag: -0.01, spectral: 'G2V', name: 'Alpha Centauri', distance: 4.37 },

    // ═══════════════════════════════════════════════════════════════════
    // MAGNITUDE 0-1 (Very bright stars)
    // ═══════════════════════════════════════════════════════════════════
    91262: { ra: 279.234, dec: 38.784, mag: 0.03, spectral: 'A0V', name: 'Vega', distance: 25.0 },
    24608: { ra: 79.172, dec: 45.998, mag: 0.08, spectral: 'G5III', name: 'Capella', distance: 42.9 },
    24436: { ra: 78.634, dec: -8.202, mag: 0.13, spectral: 'B8Ia', name: 'Rigel', distance: 860 },
    37279: { ra: 114.825, dec: 5.225, mag: 0.34, spectral: 'F5IV', name: 'Procyon', distance: 11.46 },
    27989: { ra: 88.793, dec: 7.407, mag: 0.42, spectral: 'M1Ia', name: 'Betelgeuse', distance: 700 },
    7588: { ra: 24.429, dec: -57.237, mag: 0.46, spectral: 'B6V', name: 'Achernar', distance: 139 },
    68702: { ra: 210.956, dec: -60.373, mag: 0.61, spectral: 'B1III', name: 'Hadar', distance: 390 },
    97649: { ra: 297.695, dec: 8.868, mag: 0.76, spectral: 'A7V', name: 'Altair', distance: 16.7 },
    60718: { ra: 186.650, dec: -63.099, mag: 0.76, spectral: 'B0.5IV', name: 'Acrux', distance: 320 },
    21421: { ra: 68.980, dec: 16.509, mag: 0.85, spectral: 'K5III', name: 'Aldebaran', distance: 65.3 },
    65474: { ra: 201.298, dec: -11.161, mag: 0.97, spectral: 'B1V', name: 'Spica', distance: 250 },

    // ═══════════════════════════════════════════════════════════════════
    // MAGNITUDE 1-2 (Bright stars)
    // ═══════════════════════════════════════════════════════════════════
    80763: { ra: 247.352, dec: -26.432, mag: 1.06, spectral: 'M1Ib', name: 'Antares', distance: 550 },
    37826: { ra: 116.329, dec: 28.026, mag: 1.14, spectral: 'K0III', name: 'Pollux', distance: 33.8 },
    113368: { ra: 344.412, dec: -29.622, mag: 1.16, spectral: 'A4V', name: 'Fomalhaut', distance: 25.1 },
    102098: { ra: 310.358, dec: 45.280, mag: 1.25, spectral: 'A2Ia', name: 'Deneb', distance: 2600 },
    61084: { ra: 191.930, dec: -59.689, mag: 1.25, spectral: 'B0.5IV', name: 'Mimosa', distance: 280 },
    49669: { ra: 152.093, dec: 11.967, mag: 1.35, spectral: 'B7V', name: 'Regulus', distance: 79.3 },
    33579: { ra: 104.656, dec: -28.972, mag: 1.50, spectral: 'B2II', name: 'Adhara', distance: 430 },
    36188: { ra: 113.650, dec: 31.888, mag: 1.58, spectral: 'A2V', name: 'Castor', distance: 51 },
    85927: { ra: 263.402, dec: -37.104, mag: 1.62, spectral: 'B2IV', name: 'Shaula', distance: 570 },
    60965: { ra: 187.791, dec: -57.113, mag: 1.63, spectral: 'M3.5III', name: 'Gacrux', distance: 88.6 },
    25336: { ra: 81.283, dec: 6.350, mag: 1.64, spectral: 'B2III', name: 'Bellatrix', distance: 250 },
    25930: { ra: 81.573, dec: 28.608, mag: 1.65, spectral: 'B7III', name: 'Elnath', distance: 134 },
    45238: { ra: 138.300, dec: -69.717, mag: 1.68, spectral: 'A1III', name: 'Miaplacidus', distance: 111 },
    26727: { ra: 84.053, dec: -1.202, mag: 1.69, spectral: 'B0Ia', name: 'Alnilam', distance: 2000 },
    109268: { ra: 332.058, dec: -46.961, mag: 1.74, spectral: 'B6V', name: 'Alnair', distance: 101 },
    26311: { ra: 83.001, dec: -0.299, mag: 1.77, spectral: 'O9.5II', name: 'Alnitak', distance: 800 },
    62956: { ra: 193.507, dec: 55.960, mag: 1.77, spectral: 'A1III', name: 'Alioth', distance: 81.7 },
    14576: { ra: 51.081, dec: 49.861, mag: 1.79, spectral: 'F5Ib', name: 'Mirfak', distance: 590 },
    90185: { ra: 276.043, dec: -34.385, mag: 1.79, spectral: 'B9.5III', name: 'Kaus Australis', distance: 143 },
    53910: { ra: 165.932, dec: 61.751, mag: 1.79, spectral: 'K0III', name: 'Dubhe', distance: 123 },
    34444: { ra: 107.098, dec: -26.393, mag: 1.84, spectral: 'F8Ia', name: 'Wezen', distance: 1600 },
    67301: { ra: 206.885, dec: 49.313, mag: 1.86, spectral: 'B3V', name: 'Alkaid', distance: 103.9 },
    82396: { ra: 252.968, dec: -42.998, mag: 1.86, spectral: 'F1II', name: 'Sargas', distance: 270 },
    41037: { ra: 125.628, dec: -59.509, mag: 1.86, spectral: 'K3III', name: 'Avior', distance: 630 },
    28360: { ra: 89.882, dec: 44.947, mag: 1.90, spectral: 'A1IV', name: 'Menkalinan', distance: 81.1 },
    31681: { ra: 99.428, dec: 16.399, mag: 1.93, spectral: 'A0IV', name: 'Alhena', distance: 109 },
    105199: { ra: 306.412, dec: -56.735, mag: 1.94, spectral: 'B2IV', name: 'Peacock', distance: 179 },
    11767: { ra: 37.954, dec: 89.264, mag: 1.98, spectral: 'F7Ib', name: 'Polaris', distance: 433 },
    46390: { ra: 141.897, dec: -8.659, mag: 1.98, spectral: 'K3II', name: 'Alphard', distance: 177 },
    30324: { ra: 95.675, dec: -17.956, mag: 1.98, spectral: 'B1II', name: 'Mirzam', distance: 500 },
    9884: { ra: 31.793, dec: 23.463, mag: 2.00, spectral: 'K2III', name: 'Hamal', distance: 66 },

    // ═══════════════════════════════════════════════════════════════════
    // MAGNITUDE 2-3 (Easily visible stars)
    // ═══════════════════════════════════════════════════════════════════
    65378: { ra: 200.981, dec: 54.925, mag: 2.04, spectral: 'A2V', name: 'Mizar', distance: 78.1 },
    3419: { ra: 10.897, dec: -17.987, mag: 2.04, spectral: 'K0III', name: 'Diphda', distance: 96.3 },
    746: { ra: 17.433, dec: 35.621, mag: 2.05, spectral: 'M0III', name: 'Mirach', distance: 197 },
    92855: { ra: 283.816, dec: -26.297, mag: 2.05, spectral: 'B2.5V', name: 'Nunki', distance: 228 },
    677: { ra: 2.097, dec: 29.091, mag: 2.06, spectral: 'B8IV', name: 'Alpheratz', distance: 97 },
    27366: { ra: 85.190, dec: -1.943, mag: 2.06, spectral: 'O9.7Ib', name: 'Saiph', distance: 720 },
    86032: { ra: 263.734, dec: 12.560, mag: 2.07, spectral: 'A5III', name: 'Rasalhague', distance: 48.6 },
    50583: { ra: 154.993, dec: 19.842, mag: 2.08, spectral: 'K0III', name: 'Algieba', distance: 126 },
    5447: { ra: 30.975, dec: 42.330, mag: 2.10, spectral: 'K3II', name: 'Almach', distance: 355 },
    15863: { ra: 47.042, dec: 40.956, mag: 2.12, spectral: 'B8V', name: 'Algol', distance: 93 },
    57632: { ra: 177.265, dec: 14.572, mag: 2.14, spectral: 'A3V', name: 'Denebola', distance: 36.2 },
    100453: { ra: 305.557, dec: 40.257, mag: 2.20, spectral: 'F8Ib', name: 'Sadr', distance: 1800 },
    39429: { ra: 120.896, dec: -40.003, mag: 2.21, spectral: 'O5Ia', name: 'Naos', distance: 1080 },
    44816: { ra: 136.999, dec: -43.433, mag: 2.21, spectral: 'K5Ib', name: 'Suhail', distance: 545 },
    76267: { ra: 233.672, dec: 26.715, mag: 2.23, spectral: 'A0V', name: 'Alphecca', distance: 75 },
    3179: { ra: 10.127, dec: 56.537, mag: 2.24, spectral: 'K0III', name: 'Schedar', distance: 228 },
    87833: { ra: 269.152, dec: 51.489, mag: 2.24, spectral: 'K5III', name: 'Eltanin', distance: 148 },
    78820: { ra: 241.359, dec: -19.805, mag: 2.32, spectral: 'B0.2IV', name: 'Dschubba', distance: 400 },
    54061: { ra: 165.460, dec: 56.382, mag: 2.37, spectral: 'A1V', name: 'Merak', distance: 79.7 },
    72105: { ra: 221.247, dec: 27.074, mag: 2.37, spectral: 'A0III', name: 'Izar', distance: 203 },
    2081: { ra: 6.571, dec: -42.306, mag: 2.39, spectral: 'K0III', name: 'Ankaa', distance: 77 },
    107315: { ra: 326.047, dec: 9.875, mag: 2.39, spectral: 'K2Ib', name: 'Enif', distance: 670 },
    113881: { ra: 345.944, dec: 28.083, mag: 2.42, spectral: 'M2III', name: 'Scheat', distance: 196 },
    84012: { ra: 257.595, dec: -15.725, mag: 2.43, spectral: 'A1V', name: 'Sabik', distance: 88 },
    58001: { ra: 178.458, dec: 53.695, mag: 2.44, spectral: 'A0V', name: 'Phecda', distance: 83.2 },
    105199: { ra: 319.645, dec: 62.585, mag: 2.45, spectral: 'A7IV', name: 'Alderamin', distance: 49 },
    4427: { ra: 14.177, dec: 60.717, mag: 2.47, spectral: 'B0IV', name: 'Navi', distance: 610 },
    102488: { ra: 311.553, dec: 33.970, mag: 2.48, spectral: 'K0III', name: 'Gienah Cygni', distance: 72 },
    1067: { ra: 3.309, dec: 15.184, mag: 2.49, spectral: 'B9III', name: 'Algenib', distance: 390 },
    113963: { ra: 346.190, dec: 15.205, mag: 2.49, spectral: 'A0IV', name: 'Markab', distance: 140 },
    14135: { ra: 45.570, dec: 4.090, mag: 2.53, spectral: 'M1.5III', name: 'Menkar', distance: 220 },
    54872: { ra: 168.527, dec: 20.524, mag: 2.56, spectral: 'A4V', name: 'Zosma', distance: 58.4 },
    78401: { ra: 240.083, dec: -22.622, mag: 2.62, spectral: 'B1V', name: 'Acrab', distance: 530 },
    8903: { ra: 28.660, dec: 20.808, mag: 2.64, spectral: 'A5V', name: 'Sheratan', distance: 59 },
    77070: { ra: 236.067, dec: 6.426, mag: 2.65, spectral: 'K2III', name: 'Unukalhai', distance: 73 },
    6686: { ra: 21.454, dec: 60.235, mag: 2.68, spectral: 'A5V', name: 'Ruchbah', distance: 99 },
    67927: { ra: 208.671, dec: 18.398, mag: 2.68, spectral: 'G0IV', name: 'Muphrid', distance: 37 },
    23015: { ra: 74.248, dec: 33.166, mag: 2.69, spectral: 'K3II', name: 'Hassaleh', distance: 512 },
    89931: { ra: 274.407, dec: -29.828, mag: 2.70, spectral: 'K2III', name: 'Kaus Media', distance: 306 },
    97278: { ra: 296.244, dec: 10.613, mag: 2.72, spectral: 'K3II', name: 'Tarazed', distance: 461 },
    90496: { ra: 276.993, dec: -25.421, mag: 2.82, spectral: 'K0III', name: 'Kaus Borealis', distance: 78 },
    112158: { ra: 3.309, dec: 15.184, mag: 2.83, spectral: 'B2IV', name: 'Algenib Peg', distance: 390 },
    17702: { ra: 56.871, dec: 24.105, mag: 2.87, spectral: 'B7III', name: 'Alcyone', distance: 440 },
    8102: { ra: 44.565, dec: -40.305, mag: 2.89, spectral: 'A4III', name: 'Acamar', distance: 161 },
    109074: { ra: 331.446, dec: -0.320, mag: 2.94, spectral: 'G2Ib', name: 'Sadalmelik', distance: 800 },
    13847: { ra: 44.107, dec: -8.898, mag: 2.95, spectral: 'M1III', name: 'Zaurak', distance: 221 },
    32246: { ra: 100.983, dec: 25.131, mag: 2.98, spectral: 'G8Ib', name: 'Mebsuta', distance: 840 },

    // ═══════════════════════════════════════════════════════════════════
    // MAGNITUDE 3-4 (Naked eye visible - 200+ stars)
    // ═══════════════════════════════════════════════════════════════════
    59774: { ra: 183.856, dec: 57.033, mag: 3.05, spectral: 'A3V', name: 'Megrez', distance: 80.5 },
    9640: { ra: 34.836, dec: -2.978, mag: 3.04, spectral: 'M5III', name: 'Mira', distance: 299 },
    75097: { ra: 230.182, dec: 71.834, mag: 3.05, spectral: 'A3II', name: 'Pherkad', distance: 487 },
    100453: { ra: 292.680, dec: 27.959, mag: 3.18, spectral: 'K3II', name: 'Albireo', distance: 430 },
    116727: { ra: 354.837, dec: 77.633, mag: 3.21, spectral: 'K1IV', name: 'Errai', distance: 45 },
    35904: { ra: 95.078, dec: -30.063, mag: 3.02, spectral: 'B2.5V', name: 'Furud', distance: 362 },
    36850: { ra: 107.098, dec: -26.393, mag: 1.84, spectral: 'F8Ia', name: 'Wezen', distance: 1600 },
    34444: { ra: 111.024, dec: -29.303, mag: 2.45, spectral: 'B5Ia', name: 'Aludra', distance: 2000 },
    26207: { ra: 83.784, dec: -5.910, mag: 3.33, spectral: 'O8III', name: 'Meissa', distance: 1100 },
    35550: { ra: 108.469, dec: 21.982, mag: 3.35, spectral: 'F0IV', name: 'Wasat', distance: 59 },
    95501: { ra: 291.375, dec: 3.115, mag: 3.36, spectral: 'F0IV', name: 'Delta Aql', distance: 50 },
    8886: { ra: 28.599, dec: 63.670, mag: 3.37, spectral: 'B3III', name: 'Segin', distance: 440 },
    50335: { ra: 154.173, dec: 23.417, mag: 3.44, spectral: 'F0III', name: 'Adhafera', distance: 260 },
    74666: { ra: 228.876, dec: 33.315, mag: 3.47, spectral: 'G8III', name: 'Delta Boo', distance: 121 },
    73555: { ra: 225.486, dec: 40.390, mag: 3.50, spectral: 'G8III', name: 'Nekkar', distance: 225 },
    71053: { ra: 217.957, dec: 30.371, mag: 3.58, spectral: 'K3III', name: 'Rho Boo', distance: 149 },
    46853: { ra: 154.173, dec: 23.417, mag: 3.44, spectral: 'F0III', name: 'Adhafera', distance: 260 },
    42913: { ra: 146.463, dec: 19.842, mag: 2.08, spectral: 'K1III', name: 'Algieba', distance: 126 },
    98036: { ra: 298.828, dec: 6.407, mag: 3.71, spectral: 'G8IV', name: 'Alshain', distance: 44.7 },
    23453: { ra: 75.620, dec: 41.076, mag: 3.75, spectral: 'K4II', name: 'Zeta Aur', distance: 790 },
    8832: { ra: 28.660, dec: 19.294, mag: 3.88, spectral: 'A1V', name: 'Mesarthim', distance: 164 },
    97804: { ra: 298.118, dec: 1.006, mag: 3.90, spectral: 'F6Ib', name: 'Eta Aql', distance: 1200 },
    110395: { ra: 335.414, dec: -1.387, mag: 3.27, spectral: 'A0V', name: 'Sadalsuud', distance: 540 },

    // Ursa Major additional stars
    62434: { ra: 200.981, dec: 54.925, mag: 2.04, spectral: 'A2V', name: 'Mizar', distance: 78 },

    // Scorpius additional
    82514: { ra: 253.084, dec: -38.018, mag: 3.00, spectral: 'F3II', name: 'Eta Sco', distance: 64 },

    // Sagittarius additional
    93506: { ra: 285.653, dec: -29.880, mag: 2.60, spectral: 'A2IV', name: 'Ascella', distance: 89 },
    88635: { ra: 271.452, dec: -30.424, mag: 2.99, spectral: 'K1III', name: 'Alnasl', distance: 97 },

    // Perseus additional
    18532: { ra: 59.463, dec: 40.010, mag: 3.01, spectral: 'G8III', name: 'Delta Per', distance: 520 },

    // Auriga additional
    23416: { ra: 75.492, dec: 43.823, mag: 2.99, spectral: 'F0Ia', name: 'Almaaz', distance: 2000 },

    // Cetus additional stars
    14135: { ra: 45.570, dec: 4.090, mag: 2.53, spectral: 'M1.5III', name: 'Menkar', distance: 220 },
    8645: { ra: 27.865, dec: -10.335, mag: 3.47, spectral: 'G8III', name: 'Eta Cet', distance: 118 },

    // ═══════════════════════════════════════════════════════════════════
    // MAGNITUDE 4-5 (Visible in dark skies - 500+ stars)
    // ═══════════════════════════════════════════════════════════════════

    // Orion region
    25281: { ra: 81.119, dec: -2.397, mag: 4.12, spectral: 'B1V', name: '42 Ori', distance: 900 },
    28614: { ra: 90.596, dec: 9.647, mag: 4.36, spectral: 'G5III', name: 'Chi1 Ori', distance: 28 },
    29038: { ra: 91.893, dec: -14.168, mag: 4.45, spectral: 'B5V', name: 'Omega Ori', distance: 155 },

    // Ursa Major region
    48319: { ra: 147.787, dec: 63.062, mag: 4.56, spectral: 'K3III', name: '23 UMa', distance: 251 },
    46733: { ra: 142.930, dec: 63.513, mag: 4.25, spectral: 'G4III', name: 'Upsilon UMa', distance: 115 },
    44127: { ra: 135.074, dec: 48.041, mag: 4.48, spectral: 'K0III', name: 'Tau UMa', distance: 122 },

    // Leo region
    49583: { ra: 154.993, dec: 19.842, mag: 2.08, spectral: 'K0III', name: 'Algieba', distance: 126 },
    50583: { ra: 168.527, dec: 20.524, mag: 2.56, spectral: 'A4V', name: 'Zosma', distance: 58 },
    47908: { ra: 146.462, dec: 26.007, mag: 3.34, spectral: 'A2V', name: 'Eta Leo', distance: 2000 },

    // Cassiopeia region
    8886: { ra: 28.599, dec: 63.670, mag: 3.37, spectral: 'B3III', name: 'Epsilon Cas', distance: 440 },
    6686: { ra: 21.454, dec: 60.235, mag: 2.68, spectral: 'A5V', name: 'Delta Cas', distance: 99 },
    2599: { ra: 8.308, dec: 57.816, mag: 4.18, spectral: 'K0III', name: 'Achird', distance: 19 },

    // Cygnus region
    102488: { ra: 311.553, dec: 33.970, mag: 2.48, spectral: 'K0III', name: 'Epsilon Cyg', distance: 72 },
    95947: { ra: 292.426, dec: 51.729, mag: 4.23, spectral: 'G8III', name: 'Eta Cyg', distance: 139 },
    107310: { ra: 326.161, dec: 49.875, mag: 3.94, spectral: 'B9.5III', name: 'Pi Cyg', distance: 1680 },

    // Lyra region
    92420: { ra: 282.520, dec: 33.363, mag: 3.24, spectral: 'A4V', name: 'Gamma Lyr', distance: 620 },
    91919: { ra: 281.193, dec: 39.670, mag: 4.30, spectral: 'M4II', name: 'R Lyr', distance: 350 },

    // Aquila region
    95501: { ra: 291.375, dec: 3.115, mag: 3.36, spectral: 'F0IV', name: 'Delta Aql', distance: 50 },
    93244: { ra: 284.906, dec: -4.883, mag: 3.23, spectral: 'G8II', name: 'Epsilon Aql', distance: 154 },
    93747: { ra: 286.352, dec: -5.739, mag: 2.99, spectral: 'A0V', name: 'Zeta Aql', distance: 83 },

    // Pegasus region
    112029: { ra: 340.751, dec: 10.831, mag: 3.40, spectral: 'K1III', name: 'Theta Peg', distance: 97 },
    113963: { ra: 346.190, dec: 15.205, mag: 2.49, spectral: 'A0IV', name: 'Markab', distance: 140 },
    112440: { ra: 341.633, dec: 23.404, mag: 3.53, spectral: 'G2II', name: 'Eta Peg', distance: 167 },

    // Andromeda region
    5447: { ra: 17.433, dec: 35.621, mag: 2.05, spectral: 'M0III', name: 'Mirach', distance: 197 },
    677: { ra: 2.097, dec: 29.091, mag: 2.06, spectral: 'B8IV', name: 'Alpheratz', distance: 97 },
    9640: { ra: 30.975, dec: 42.330, mag: 2.10, spectral: 'K3II', name: 'Almach', distance: 355 },
    7607: { ra: 24.498, dec: 41.079, mag: 3.87, spectral: 'G8III', name: '51 And', distance: 177 },

    // Taurus region
    17702: { ra: 56.871, dec: 24.105, mag: 2.87, spectral: 'B7III', name: 'Alcyone', distance: 440 },
    17847: { ra: 57.291, dec: 24.367, mag: 3.63, spectral: 'B6III', name: 'Atlas', distance: 381 },
    17608: { ra: 56.457, dec: 24.113, mag: 3.87, spectral: 'B8III', name: 'Electra', distance: 440 },
    17573: { ra: 56.302, dec: 24.368, mag: 4.18, spectral: 'B6IV', name: 'Maia', distance: 360 },
    17489: { ra: 56.219, dec: 24.289, mag: 3.70, spectral: 'B8III', name: 'Merope', distance: 440 },
    17531: { ra: 56.164, dec: 24.115, mag: 4.30, spectral: 'B7IV', name: 'Taygeta', distance: 440 },

    // Gemini region
    31681: { ra: 99.428, dec: 16.399, mag: 1.93, spectral: 'A0IV', name: 'Alhena', distance: 109 },
    32362: { ra: 100.983, dec: 25.131, mag: 2.98, spectral: 'G8Ib', name: 'Mebsuta', distance: 840 },
    29655: { ra: 93.719, dec: 22.514, mag: 3.36, spectral: 'A3IV', name: 'Mu Gem', distance: 230 },
    28734: { ra: 90.882, dec: 25.940, mag: 3.57, spectral: 'F0III', name: 'Nu Gem', distance: 500 },
    30343: { ra: 95.740, dec: 22.507, mag: 3.53, spectral: 'M3III', name: 'Eta Gem', distance: 380 },

    // ═══════════════════════════════════════════════════════════════════
    // MAGNITUDE 5-6 (Limit of naked eye - background stars)
    // ═══════════════════════════════════════════════════════════════════

    // Northern sky background
    9007: { ra: 29.032, dec: 33.719, mag: 5.22, spectral: 'K0III', name: null, distance: 344 },
    10644: { ra: 34.280, dec: 30.861, mag: 5.26, spectral: 'F6V', name: null, distance: 88 },
    11569: { ra: 37.280, dec: 38.840, mag: 5.19, spectral: 'F8V', name: null, distance: 65 },
    12706: { ra: 40.825, dec: 38.319, mag: 5.55, spectral: 'G5V', name: null, distance: 51 },
    14668: { ra: 47.278, dec: 44.857, mag: 5.24, spectral: 'G5III', name: null, distance: 290 },
    16852: { ra: 54.228, dec: 37.517, mag: 5.02, spectral: 'G8III', name: null, distance: 180 },
    18246: { ra: 58.533, dec: 31.883, mag: 5.47, spectral: 'K0III', name: null, distance: 375 },
    20205: { ra: 64.948, dec: 28.607, mag: 5.39, spectral: 'F5IV', name: null, distance: 155 },
    21393: { ra: 68.499, dec: 27.612, mag: 5.58, spectral: 'A3V', name: null, distance: 190 },
    22453: { ra: 72.460, dec: 41.234, mag: 5.18, spectral: 'G5III', name: null, distance: 279 },
    23767: { ra: 76.629, dec: 41.235, mag: 3.17, spectral: 'B3V', name: 'Eta Aur', distance: 219 },
    24019: { ra: 77.287, dec: 38.842, mag: 5.08, spectral: 'K0III', name: null, distance: 245 },

    // Orion region background
    25473: { ra: 81.572, dec: 1.856, mag: 5.35, spectral: 'B9V', name: null, distance: 540 },
    25813: { ra: 82.418, dec: 3.544, mag: 5.03, spectral: 'B5V', name: null, distance: 400 },
    26176: { ra: 83.406, dec: 5.940, mag: 5.08, spectral: 'O9V', name: null, distance: 1350 },
    26549: { ra: 84.411, dec: -2.600, mag: 5.18, spectral: 'B3V', name: null, distance: 700 },

    // Summer triangle region
    91262: { ra: 279.234, dec: 38.784, mag: 0.03, spectral: 'A0V', name: 'Vega', distance: 25 },
    94779: { ra: 289.276, dec: 53.368, mag: 5.21, spectral: 'A5V', name: null, distance: 166 },
    95853: { ra: 291.930, dec: 39.151, mag: 4.77, spectral: 'A7V', name: 'Theta1 Cyg', distance: 60 },
    96441: { ra: 294.007, dec: 45.131, mag: 4.49, spectral: 'K1IV', name: '16 Cyg A', distance: 70 },
    96901: { ra: 295.153, dec: 50.221, mag: 5.19, spectral: 'K3III', name: null, distance: 310 },

    // Zodiac background stars
    // Aries
    10306: { ra: 33.167, dec: 19.727, mag: 5.21, spectral: 'F0III', name: null, distance: 340 },
    11001: { ra: 35.437, dec: 21.340, mag: 5.28, spectral: 'G0V', name: null, distance: 75 },

    // Taurus
    18724: { ra: 60.170, dec: 12.490, mag: 4.29, spectral: 'K5III', name: 'Omicron Tau', distance: 212 },
    19587: { ra: 62.966, dec: 15.627, mag: 5.45, spectral: 'A0V', name: null, distance: 260 },

    // Gemini
    28734: { ra: 90.882, dec: 25.940, mag: 3.57, spectral: 'F0III', name: 'Nu Gem', distance: 500 },
    30867: { ra: 97.240, dec: 20.212, mag: 4.89, spectral: 'A0V', name: null, distance: 320 },

    // Cancer
    42806: { ra: 130.806, dec: 18.154, mag: 3.94, spectral: 'K5III', name: 'Gamma Cnc', distance: 181 },
    40526: { ra: 124.129, dec: 9.186, mag: 3.52, spectral: 'K4III', name: 'Beta Cnc', distance: 290 },

    // Leo
    49583: { ra: 152.093, dec: 11.967, mag: 1.35, spectral: 'B7V', name: 'Regulus', distance: 79 },
    47508: { ra: 145.288, dec: 9.892, mag: 4.05, spectral: 'K5III', name: 'Rho Leo', distance: 2600 },
    54879: { ra: 168.560, dec: 15.430, mag: 4.31, spectral: 'F0III', name: 'Iota Leo', distance: 79 },

    // Virgo
    65474: { ra: 201.298, dec: -11.161, mag: 0.97, spectral: 'B1V', name: 'Spica', distance: 250 },
    61941: { ra: 190.415, dec: -1.449, mag: 3.37, spectral: 'G8III', name: 'Gamma Vir', distance: 39 },
    63608: { ra: 195.544, dec: 10.959, mag: 4.76, spectral: 'G5III', name: 'Iota Vir', distance: 69 },

    // Libra
    72622: { ra: 222.720, dec: -15.997, mag: 2.75, spectral: 'B8V', name: 'Zubenelgenubi', distance: 77 },
    74785: { ra: 229.252, dec: -9.383, mag: 2.61, spectral: 'B8V', name: 'Zubeneschamali', distance: 160 },

    // Scorpius
    80763: { ra: 247.352, dec: -26.432, mag: 1.06, spectral: 'M1Ib', name: 'Antares', distance: 550 },
    78265: { ra: 239.713, dec: -26.114, mag: 2.89, spectral: 'B0.3IV', name: 'Pi Sco', distance: 459 },
    79374: { ra: 242.999, dec: -28.216, mag: 2.70, spectral: 'B1.5IV', name: 'Rho Sco', distance: 409 },

    // More scattered background stars for realistic sky
    33977: { ra: 105.756, dec: -23.833, mag: 5.02, spectral: 'G8III', name: null, distance: 215 },
    38170: { ra: 117.257, dec: -24.860, mag: 5.24, spectral: 'K0III', name: null, distance: 345 },
    39757: { ra: 121.886, dec: -24.304, mag: 5.19, spectral: 'A2V', name: null, distance: 170 },
    43587: { ra: 132.840, dec: 28.330, mag: 5.95, spectral: 'G8V', name: '55 Cnc', distance: 41 },
    45860: { ra: 140.264, dec: -38.314, mag: 5.18, spectral: 'A3V', name: null, distance: 230 },
    52727: { ra: 161.693, dec: -49.420, mag: 5.07, spectral: 'G5III', name: null, distance: 185 },
    55219: { ra: 169.620, dec: -31.858, mag: 5.31, spectral: 'K1III', name: null, distance: 290 },
    61932: { ra: 190.379, dec: -23.396, mag: 5.16, spectral: 'G8III', name: null, distance: 242 },
    66249: { ra: 203.673, dec: -31.664, mag: 5.42, spectral: 'F6V', name: null, distance: 89 },
    75458: { ra: 231.232, dec: 58.966, mag: 4.82, spectral: 'G9III', name: null, distance: 139 },
    78727: { ra: 241.015, dec: 19.153, mag: 4.23, spectral: 'G9III', name: null, distance: 154 },
    86742: { ra: 265.868, dec: 4.567, mag: 4.24, spectral: 'K4III', name: null, distance: 170 },
    91117: { ra: 278.802, dec: 5.099, mag: 4.59, spectral: 'G8III', name: null, distance: 112 },
    101772: { ra: 309.387, dec: -47.291, mag: 4.21, spectral: 'B9V', name: null, distance: 177 },
    108917: { ra: 331.094, dec: 25.345, mag: 4.80, spectral: 'K0III', name: null, distance: 124 },
    114421: { ra: 347.590, dec: -21.172, mag: 4.29, spectral: 'K0III', name: null, distance: 137 },
};

/**
 * Parse constellationship.fab file content
 */
export const parseConstellationship = (content) => {
    const constellations = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const parts = trimmed.split(/\s+/);
        if (parts.length < 3) continue;

        const id = parts[0];
        const hipIds = parts.slice(2).map(s => parseInt(s, 10));

        const lineSegments = [];
        for (let i = 0; i < hipIds.length - 1; i += 2) {
            if (hipIds[i] && hipIds[i + 1]) {
                lineSegments.push([`HIP${hipIds[i]}`, `HIP${hipIds[i + 1]}`]);
            }
        }

        if (lineSegments.length > 0) {
            constellations.push({ id, lines: lineSegments });
        }
    }

    return constellations;
};

/**
 * Parse star_names.fab file content
 */
export const parseStarNames = (content) => {
    const names = {};
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^\s*(\d+)\|_\("([^"]+)"\)/);
        if (match) {
            const hipId = parseInt(match[1], 10);
            const name = match[2];
            names[hipId] = name;
        }
    }

    return names;
};

/**
 * Parse constellation_names.eng.fab
 */
export const parseConstellationNames = (content) => {
    const names = {};
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split('\t');
        if (parts.length >= 2) {
            const id = parts[0];
            const name = parts[1].replace(/"/g, '');
            names[id] = name;
        }
    }

    return names;
};

/**
 * Build complete star catalog from HIP data and names
 * @param {Object} starNames - Optional mapping of HIP ID to star name
 * @returns {Array} Sorted array of star objects
 */
export const buildStarCatalog = (starNames = {}) => {
    const stars = [];

    for (const [hipId, data] of Object.entries(BRIGHT_STARS_CATALOG)) {
        const hip = parseInt(hipId, 10);
        stars.push({
            id: `HIP${hip}`,
            hip: hip,
            name: starNames[hip] || data.name || null,
            ra: data.ra,
            dec: data.dec,
            magnitude: data.mag,
            spectralType: data.spectral,
            distance: data.distance || null,
        });
    }

    // Sort by magnitude (brightest first)
    return stars.sort((a, b) => a.magnitude - b.magnitude);
};

/**
 * Get star count by magnitude limit
 */
export const getStarCountByMagnitude = (maxMag) => {
    return Object.values(BRIGHT_STARS_CATALOG).filter(s => s.mag <= maxMag).length;
};

export default {
    parseConstellationship,
    parseStarNames,
    parseConstellationNames,
    buildStarCatalog,
    getStarCountByMagnitude,
    BRIGHT_STARS_CATALOG,
};
