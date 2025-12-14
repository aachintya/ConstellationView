package com.skyviewapp.starfield.gl.utils

import android.graphics.Color

/**
 * Maps Harvard spectral classification to RGB colors.
 * 
 * Spectral types (hottest to coolest):
 * O - Blue (30,000-60,000K)
 * B - Blue-white (10,000-30,000K)
 * A - White (7,500-10,000K)
 * F - Yellow-white (6,000-7,500K)
 * G - Yellow (5,000-6,000K) - like our Sun
 * K - Orange (3,500-5,000K)
 * M - Red (2,000-3,500K)
 * 
 * Additional types (less common):
 * L - Dark red/brown dwarfs
 * T - Methane dwarfs
 * Y - Ultra-cool brown dwarfs
 * W - Wolf-Rayet stars (very hot)
 * C - Carbon stars (red)
 * S - Zirconium oxide stars
 */
object SpectralColorMapper {
    
    // Spectral type to color mapping (Harvard classification)
    private val spectralColors = mapOf(
        'O' to Color.rgb(155, 176, 255),   // Blue - very hot
        'B' to Color.rgb(170, 191, 255),   // Blue-white
        'A' to Color.rgb(202, 215, 255),   // White
        'F' to Color.rgb(248, 247, 255),   // Yellow-white
        'G' to Color.rgb(255, 244, 234),   // Yellow (Sun-like)
        'K' to Color.rgb(255, 210, 161),   // Orange
        'M' to Color.rgb(255, 204, 111),   // Red - cool
        'L' to Color.rgb(255, 180, 100),   // Dark red (brown dwarf)
        'T' to Color.rgb(255, 150, 80),    // Methane dwarf
        'Y' to Color.rgb(200, 100, 50),    // Ultra-cool
        'W' to Color.rgb(140, 160, 255),   // Wolf-Rayet (very hot blue)
        'C' to Color.rgb(255, 140, 100),   // Carbon star (red)
        'S' to Color.rgb(255, 180, 140)    // Zirconium oxide
    )
    
    // Approximate temperatures in Kelvin
    private val spectralTemperatures = mapOf(
        'O' to 40000,
        'B' to 20000,
        'A' to 8500,
        'F' to 6750,
        'G' to 5500,
        'K' to 4250,
        'M' to 3000,
        'L' to 1800,
        'T' to 1200,
        'Y' to 500,
        'W' to 50000,
        'C' to 3000,
        'S' to 3000
    )
    
    /**
     * Get RGB color as Android Color int from spectral type.
     * 
     * @param spectralType The spectral classification string (e.g., "G2V", "K5III")
     * @return Android Color int
     */
    fun getColor(spectralType: String?): Int {
        val type = spectralType?.firstOrNull()?.uppercaseChar()
        return spectralColors[type] ?: Color.WHITE
    }
    
    /**
     * Get RGB color as float array [r, g, b] in 0-1 range.
     * Suitable for direct use in shaders.
     * 
     * @param spectralType The spectral classification string
     * @return FloatArray of [r, g, b] in 0-1 range
     */
    fun getColorComponents(spectralType: String?): FloatArray {
        val color = getColor(spectralType)
        return floatArrayOf(
            Color.red(color) / 255f,
            Color.green(color) / 255f,
            Color.blue(color) / 255f
        )
    }
    
    /**
     * Get approximate surface temperature in Kelvin.
     * 
     * @param spectralType The spectral classification string
     * @return Temperature in Kelvin, or 5500K (Sun-like) if unknown
     */
    fun getTemperatureKelvin(spectralType: String?): Int {
        val type = spectralType?.firstOrNull()?.uppercaseChar()
        return spectralTemperatures[type] ?: 5500
    }
    
    /**
     * Get color from temperature using black-body radiation approximation.
     * Useful for objects without spectral classification.
     * 
     * @param temperatureK Temperature in Kelvin
     * @return Android Color int
     */
    fun getColorFromTemperature(temperatureK: Int): Int {
        // Simplified black-body color approximation
        val temp = temperatureK / 100f
        
        val r: Float
        val g: Float
        val b: Float
        
        // Red
        r = if (temp <= 66) {
            255f
        } else {
            (329.698727446f * Math.pow((temp - 60).toDouble(), -0.1332047592).toFloat())
                .coerceIn(0f, 255f)
        }
        
        // Green
        g = if (temp <= 66) {
            (99.4708025861f * Math.log(temp.toDouble()).toFloat() - 161.1195681661f)
                .coerceIn(0f, 255f)
        } else {
            (288.1221695283f * Math.pow((temp - 60).toDouble(), -0.0755148492).toFloat())
                .coerceIn(0f, 255f)
        }
        
        // Blue
        b = if (temp >= 66) {
            255f
        } else if (temp <= 19) {
            0f
        } else {
            (138.5177312231f * Math.log((temp - 10).toDouble()).toFloat() - 305.0447927307f)
                .coerceIn(0f, 255f)
        }
        
        return Color.rgb(r.toInt(), g.toInt(), b.toInt())
    }
    
    /**
     * Get luminosity class description.
     * 
     * @param luminosityClass Roman numeral (I, II, III, IV, V, etc.)
     * @return Human-readable description
     */
    fun getLuminosityDescription(luminosityClass: String?): String {
        return when (luminosityClass?.uppercase()) {
            "IA", "IA-0", "0" -> "Hypergiant"
            "IAB" -> "Intermediate Supergiant"
            "IB" -> "Less Luminous Supergiant"
            "I" -> "Supergiant"
            "II" -> "Bright Giant"
            "III" -> "Giant"
            "IV" -> "Subgiant"
            "V" -> "Main Sequence (Dwarf)"
            "VI", "SD" -> "Subdwarf"
            "VII", "D" -> "White Dwarf"
            else -> "Unknown"
        }
    }
}

