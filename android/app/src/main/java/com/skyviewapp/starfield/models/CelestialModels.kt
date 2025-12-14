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

/**
 * Represents a moon orbiting a planet
 * Used for rendering Jupiter's Galilean moons and Saturn's major moons
 */
data class Moon(
    val id: String,
    val name: String,
    val parentPlanetId: String,
    val orbitalPeriodDays: Float,     // Orbital period in Earth days
    val orbitalRadiusKm: Float,       // Semi-major axis in km
    val radiusKm: Float,              // Moon's radius in km
    val magnitude: Float,             // Apparent magnitude
    val color: Int = 0xFFCCCCCC.toInt(), // Moon color (ARGB)
    // Computed orbital position (relative to parent planet)
    var orbitalAngle: Float = 0f,     // Current angle in orbit (radians)
    var relativeX: Float = 0f,        // Position relative to planet
    var relativeY: Float = 0f,
    var relativeZ: Float = 0f,
    // World position (planet position + relative)
    var worldX: Float = 0f,
    var worldY: Float = 0f,
    var worldZ: Float = 0f,
    // Screen position
    var screenX: Float = 0f,
    var screenY: Float = 0f,
    var visible: Boolean = false
) {
    /**
     * Update orbital position based on current time
     * @param julianDate Current Julian date
     * @param planetX Planet's world X position
     * @param planetY Planet's world Y position
     * @param planetZ Planet's world Z position
     */
    fun updatePosition(julianDate: Double, planetX: Float, planetY: Float, planetZ: Float) {
        // Calculate orbital angle based on period
        // Using J2000.0 epoch as reference (JD 2451545.0)
        val daysSinceEpoch = julianDate - 2451545.0
        val orbitsCompleted = daysSinceEpoch / orbitalPeriodDays
        orbitalAngle = ((orbitsCompleted * 2 * Math.PI) % (2 * Math.PI)).toFloat()
        
        // Scale orbital radius to match our coordinate system
        // Jupiter is ~5 AU away, its moons are ~400k-1.9M km away
        // We need to scale this appropriately for visual separation
        val visualOrbitalRadius = getVisualOrbitalRadius()
        
        // Calculate position in orbital plane (simplified circular orbit)
        relativeX = (kotlin.math.cos(orbitalAngle) * visualOrbitalRadius).toFloat()
        relativeY = 0f  // Moons orbit roughly in planet's equatorial plane
        relativeZ = (kotlin.math.sin(orbitalAngle) * visualOrbitalRadius).toFloat()
        
        // Apply orbital inclination for more realistic appearance
        // Jupiter's moons have slight inclinations, Saturn's are more varied
        val inclination = getOrbitalInclination()
        val inclinedY = relativeY * kotlin.math.cos(inclination) - relativeZ * kotlin.math.sin(inclination)
        val inclinedZ = relativeY * kotlin.math.sin(inclination) + relativeZ * kotlin.math.cos(inclination)
        relativeY = inclinedY.toFloat()
        relativeZ = inclinedZ.toFloat()
        
        // Set world position
        worldX = planetX + relativeX
        worldY = planetY + relativeY
        worldZ = planetZ + relativeZ
    }
    
    /**
     * Get visual orbital radius scaled for rendering
     * Real orbital radii are too small to see, so we exaggerate them
     */
    private fun getVisualOrbitalRadius(): Float {
        // Scale factor to make moons visible around planets
        // At extreme zoom (FOV < 0.5°), we want moons spread around the planet disk
        return when (parentPlanetId.lowercase()) {
            "jupiter" -> {
                // Jupiter's moons: Io=422k, Europa=671k, Ganymede=1.07M, Callisto=1.88M km
                // Jupiter radius = 69,911 km
                // Scale to 2-8 planet radii for visibility
                when (id.lowercase()) {
                    "io" -> 0.025f        // Closest
                    "europa" -> 0.04f
                    "ganymede" -> 0.055f
                    "callisto" -> 0.08f   // Farthest
                    else -> 0.04f
                }
            }
            "saturn" -> {
                // Saturn's moons: Titan=1.22M, Rhea=527k, Dione=377k, Tethys=295k km
                // Saturn radius = 58,232 km
                when (id.lowercase()) {
                    "titan" -> 0.1f       // Large and distant
                    "rhea" -> 0.055f
                    "dione" -> 0.04f
                    "tethys" -> 0.03f
                    else -> 0.04f
                }
            }
            else -> 0.04f
        }
    }
    
    /**
     * Get orbital inclination in radians
     */
    private fun getOrbitalInclination(): Double {
        return when (id.lowercase()) {
            // Jupiter's Galilean moons - nearly equatorial
            "io" -> Math.toRadians(0.04)
            "europa" -> Math.toRadians(0.47)
            "ganymede" -> Math.toRadians(0.2)
            "callisto" -> Math.toRadians(0.19)
            // Saturn's moons - more varied, plus ring plane tilt (~27°)
            "titan" -> Math.toRadians(0.33)
            "rhea" -> Math.toRadians(0.35)
            "dione" -> Math.toRadians(0.02)
            "tethys" -> Math.toRadians(1.09)
            else -> 0.0
        }
    }
    
    /**
     * Get visual size multiplier for rendering
     * Based on actual moon sizes relative to planet
     */
    fun getVisualSizeMultiplier(): Float {
        return when (id.lowercase()) {
            // Jupiter's moons relative to Jupiter (radius ratio * visual scale)
            "io" -> 0.15f           // 1,822 km radius
            "europa" -> 0.13f       // 1,561 km radius
            "ganymede" -> 0.2f      // 2,634 km radius (largest moon in solar system)
            "callisto" -> 0.18f     // 2,410 km radius
            // Saturn's moons relative to Saturn
            "titan" -> 0.22f        // 2,575 km radius
            "rhea" -> 0.1f          // 764 km radius
            "dione" -> 0.08f        // 561 km radius
            "tethys" -> 0.08f       // 531 km radius
            else -> 0.1f
        }
    }
    
    fun toEventMap(): Map<String, Any?> = mapOf(
        "id" to id,
        "name" to name,
        "parentPlanet" to parentPlanetId,
        "type" to "moon",
        "magnitude" to magnitude
    )
    
    companion object {
        /**
         * Create Jupiter's Galilean moons
         */
        fun createJupiterMoons(): List<Moon> = listOf(
            Moon(
                id = "io",
                name = "Io",
                parentPlanetId = "jupiter",
                orbitalPeriodDays = 1.769f,
                orbitalRadiusKm = 421_700f,
                radiusKm = 1_821.6f,
                magnitude = 5.0f,
                color = 0xFFE8D878.toInt()  // Yellowish (volcanic)
            ),
            Moon(
                id = "europa",
                name = "Europa",
                parentPlanetId = "jupiter",
                orbitalPeriodDays = 3.551f,
                orbitalRadiusKm = 671_034f,
                radiusKm = 1_560.8f,
                magnitude = 5.3f,
                color = 0xFFD4C8B8.toInt()  // Slightly brownish-white (ice)
            ),
            Moon(
                id = "ganymede",
                name = "Ganymede",
                parentPlanetId = "jupiter",
                orbitalPeriodDays = 7.155f,
                orbitalRadiusKm = 1_070_412f,
                radiusKm = 2_634.1f,
                magnitude = 4.6f,
                color = 0xFFB8A898.toInt()  // Gray-brown
            ),
            Moon(
                id = "callisto",
                name = "Callisto",
                parentPlanetId = "jupiter",
                orbitalPeriodDays = 16.689f,
                orbitalRadiusKm = 1_882_709f,
                radiusKm = 2_410.3f,
                magnitude = 5.7f,
                color = 0xFF8A8080.toInt()  // Dark gray (heavily cratered)
            )
        )
        
        /**
         * Create Saturn's major moons
         */
        fun createSaturnMoons(): List<Moon> = listOf(
            Moon(
                id = "titan",
                name = "Titan",
                parentPlanetId = "saturn",
                orbitalPeriodDays = 15.945f,
                orbitalRadiusKm = 1_221_870f,
                radiusKm = 2_574.7f,
                magnitude = 8.3f,
                color = 0xFFD4A860.toInt()  // Orange (thick atmosphere)
            ),
            Moon(
                id = "rhea",
                name = "Rhea",
                parentPlanetId = "saturn",
                orbitalPeriodDays = 4.518f,
                orbitalRadiusKm = 527_108f,
                radiusKm = 764.3f,
                magnitude = 9.7f,
                color = 0xFFE0E0E0.toInt()  // Bright icy
            ),
            Moon(
                id = "dione",
                name = "Dione",
                parentPlanetId = "saturn",
                orbitalPeriodDays = 2.737f,
                orbitalRadiusKm = 377_396f,
                radiusKm = 561.4f,
                magnitude = 10.4f,
                color = 0xFFD0D0D0.toInt()  // Icy
            ),
            Moon(
                id = "tethys",
                name = "Tethys",
                parentPlanetId = "saturn",
                orbitalPeriodDays = 1.888f,
                orbitalRadiusKm = 294_619f,
                radiusKm = 531.1f,
                magnitude = 10.2f,
                color = 0xFFE8E8E8.toInt()  // Very bright icy
            )
        )
    }
}
