package com.skyviewapp.starfield.models

/**
 * Data models for celestial objects in the star field
 */

/**
 * Represents a star with its astronomical properties and screen position
 */
data class Star(
    val id: String,
    val name: String?,
    val ra: Float,              // Right Ascension in degrees
    val dec: Float,             // Declination in degrees
    val magnitude: Float,       // Apparent magnitude
    val spectralType: String?,  // Spectral classification (O, B, A, F, G, K, M)
    val constellation: String?, // IAU constellation abbreviation
    val distance: Float?,       // Distance in light-years
    // Pre-computed 3D unit vector position
    var x: Float = 0f,
    var y: Float = 0f,
    var z: Float = 0f,
    // Screen position (updated each frame)
    var screenX: Float = 0f,
    var screenY: Float = 0f,
    var visible: Boolean = false
) {
    /**
     * Compute 3D position from RA/Dec
     */
    fun computePosition() {
        val raRad = Math.toRadians(ra.toDouble())
        val decRad = Math.toRadians(dec.toDouble())
        x = (kotlin.math.cos(decRad) * kotlin.math.cos(raRad)).toFloat()
        y = (kotlin.math.cos(decRad) * kotlin.math.sin(raRad)).toFloat()
        z = kotlin.math.sin(decRad).toFloat()
    }

    /**
     * Convert star data to a map for React Native events
     */
    fun toEventMap(): Map<String, Any?> = mapOf(
        "id" to id,
        "name" to (name ?: ""),
        "magnitude" to magnitude,
        "spectralType" to (spectralType ?: ""),
        "constellation" to (constellation ?: ""),
        "distance" to (distance ?: 0f),
        "type" to "star",
        "ra" to ra,
        "dec" to dec
    )

    companion object {
        fun fromMap(data: Map<String, Any>): Star {
            return Star(
                id = data["id"] as? String ?: "",
                name = data["name"] as? String,
                ra = (data["ra"] as? Number)?.toFloat() ?: 0f,
                dec = (data["dec"] as? Number)?.toFloat() ?: 0f,
                magnitude = (data["magnitude"] as? Number)?.toFloat() ?: 6f,
                spectralType = data["spectralType"] as? String,
                constellation = data["constellation"] as? String,
                distance = (data["distance"] as? Number)?.toFloat()
            ).also { it.computePosition() }
        }
    }
}

/**
 * Represents a planet with its astronomical properties and screen position
 */
data class Planet(
    val id: String,
    val name: String,
    val ra: Float,
    val dec: Float,
    val magnitude: Float,
    // Pre-computed 3D position
    var x: Float = 0f,
    var y: Float = 0f,
    var z: Float = 0f,
    // Screen position
    var screenX: Float = 0f,
    var screenY: Float = 0f,
    var visible: Boolean = false
) {
    fun computePosition() {
        val raRad = Math.toRadians(ra.toDouble())
        val decRad = Math.toRadians(dec.toDouble())
        x = (kotlin.math.cos(decRad) * kotlin.math.cos(raRad)).toFloat()
        y = (kotlin.math.cos(decRad) * kotlin.math.sin(raRad)).toFloat()
        z = kotlin.math.sin(decRad).toFloat()
    }

    fun toEventMap(): Map<String, Any?> = mapOf(
        "id" to id,
        "name" to name,
        "magnitude" to magnitude,
        "spectralType" to "",
        "type" to "planet",
        "ra" to ra,
        "dec" to dec
    )

    companion object {
        fun fromMap(data: Map<String, Any>): Planet {
            val id = (data["id"] as? String ?: data["name"] as? String ?: "").lowercase()
            return Planet(
                id = id,
                name = data["name"] as? String ?: id,
                ra = (data["ra"] as? Number)?.toFloat() ?: 0f,
                dec = (data["dec"] as? Number)?.toFloat() ?: 0f,
                magnitude = (data["magnitude"] as? Number)?.toFloat() ?: 0f
            ).also { it.computePosition() }
        }
    }
}

/**
 * Represents a line connecting two stars in a constellation
 */
data class ConstellationLine(
    val starId1: String,
    val starId2: String
)
