package com.skyviewapp.starfield.gl.renderers

import android.opengl.GLES30
import android.opengl.Matrix
import com.skyviewapp.starfield.gl.LODSphereMesh
import com.skyviewapp.starfield.gl.RingMesh
import com.skyviewapp.starfield.gl.ShaderProgram
import com.skyviewapp.starfield.models.Planet
import kotlin.math.pow

/**
 * Handles rendering of planets with Level-of-Detail (LOD) system.
 * 
 * Rendering modes based on FOV:
 * - FOV > 30°: Point mode - planets as bright dots (rendered via StarRenderer)
 * - FOV 5-30°: Disk mode - small spheres, minimal detail
 * - FOV 0.5-5°: Detail mode - full sphere with textures
 * - FOV < 0.5°: High-res mode - maximum detail spheres, visible surface features
 * - FOV < 0.1°: Ultra mode - extreme zoom, highest LOD
 * 
 * Dynamic scaling ensures planets grow appropriately as you zoom in,
 * similar to how professional planetarium apps work.
 */
class PlanetRenderer {
    private val lodSphereMesh = LODSphereMesh()
    private val ringMesh = RingMesh()
    
    private val modelMatrix = FloatArray(16)
    private val mvpMatrix = FloatArray(16)
    private val normalMatrix = FloatArray(9)

    private var planets: List<Planet> = emptyList()
    
    // Current FOV for LOD selection
    private var currentFov: Float = 75f
    
    // Moon renderer for Jupiter and Saturn
    private val moonRenderer = MoonRenderer()

    fun initialize() {
        lodSphereMesh.initialize()
        ringMesh.initialize()
        moonRenderer.initialize()
    }

    fun setPlanets(planetList: List<Planet>) {
        planets = planetList
        
        // Detect and offset overlapping planets
        val minDistance = 0.08f
        for (i in planets.indices) {
            for (j in i + 1 until planets.size) {
                val p1 = planets[i]
                val p2 = planets[j]
                
                val dx = p1.x - p2.x
                val dy = p1.y - p2.y
                val dz = p1.z - p2.z
                val distance = kotlin.math.sqrt(dx * dx + dy * dy + dz * dz)
                
                if (distance < minDistance) {
                    val offset = minDistance - distance + 0.02f
                    val offsetDir = if (p1.id < p2.id) 1f else -1f
                    
                    val offsetX = offset * offsetDir * 0.7f
                    val offsetY = offset * offsetDir * 0.7f
                    p2.x += offsetX
                    p2.y += offsetY
                }
            }
        }
    }
    
    /**
     * Update current FOV for LOD calculations
     */
    fun updateFov(fov: Float) {
        currentFov = fov
    }
    
    /**
     * Update moon positions for a given Julian date
     */
    fun updateMoonPositions(julianDate: Double) {
        moonRenderer.updateMoonPositions(julianDate, planets)
    }

    fun render(
        planetShader: ShaderProgram?,
        ringShader: ShaderProgram?,
        vpMatrix: FloatArray,
        sunDirection: FloatArray,
        nightModeIntensity: Float,
        planetScale: Float
    ) {
        render(planetShader, ringShader, vpMatrix, sunDirection, nightModeIntensity, planetScale, currentFov)
    }

    fun render(
        planetShader: ShaderProgram?,
        ringShader: ShaderProgram?,
        vpMatrix: FloatArray,
        sunDirection: FloatArray,
        nightModeIntensity: Float,
        planetScale: Float,
        fov: Float
    ) {
        val shader = planetShader ?: return
        if (planets.isEmpty()) return
        
        currentFov = fov

        shader.use()
        
        // Select LOD level based on FOV
        val lodLevel = lodSphereMesh.selectLOD(fov)

        for (planet in planets) {
            if (!planet.visible) continue

            // Calculate model matrix for this planet
            Matrix.setIdentityM(modelMatrix, 0)

            // Get dynamic scale based on FOV
            val scale = getDynamicPlanetScale(planet, planetScale, fov)
            Matrix.translateM(modelMatrix, 0, planet.x * 50f, planet.y * 50f, planet.z * 50f)
            Matrix.scaleM(modelMatrix, 0, scale, scale, scale)

            // Calculate MVP
            Matrix.multiplyMM(mvpMatrix, 0, vpMatrix, 0, modelMatrix, 0)

            // Calculate normal matrix
            calculateNormalMatrix(modelMatrix, normalMatrix)

            // Set uniforms
            shader.setUniformMatrix4fv("u_MVP", mvpMatrix)
            shader.setUniformMatrix4fv("u_ModelMatrix", modelMatrix)
            GLES30.glUniformMatrix3fv(shader.getUniformLocation("u_NormalMatrix"), 1, false, normalMatrix, 0)

            shader.setUniform3f("u_LightDir", sunDirection[0], sunDirection[1], sunDirection[2])
            shader.setUniform3f("u_ViewPos", 0f, 0f, 0f)
            shader.setUniform1f("u_AmbientStrength", 0.15f)
            shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
            shader.setUniform1i("u_IsSun", if (planet.id.lowercase() == "sun") 1 else 0)
            
            // Set planet ID for procedural texturing
            val planetId = getPlanetTextureId(planet.id)
            shader.setUniform1i("u_PlanetId", planetId)

            // Draw sphere with appropriate LOD
            lodSphereMesh.draw(lodLevel)
            
            // Render Saturn's rings
            if (planet.id.lowercase() == "saturn") {
                renderSaturnRings(ringShader, vpMatrix, planet, scale, sunDirection, nightModeIntensity, fov)
                // Re-activate planet shader after ring rendering
                shader.use()
            }
            
            // Render moons for Jupiter and Saturn at appropriate zoom levels
            if (planet.id.lowercase() in listOf("jupiter", "saturn") && fov < 5f) {
                moonRenderer.renderMoonsForPlanet(
                    planetShader,
                    null,  // Star shader for dot mode - we'll use sphere mode
                    vpMatrix,
                    planet,
                    fov,
                    sunDirection,
                    nightModeIntensity,
                    scale
                )
                // Re-activate planet shader
                shader.use()
            }
        }
    }
    
    private fun renderSaturnRings(
        shader: ShaderProgram?,
        vpMatrix: FloatArray,
        saturn: Planet,
        planetScale: Float,
        sunDirection: FloatArray,
        nightModeIntensity: Float,
        fov: Float
    ) {
        shader ?: return
        
        // Don't render rings at very wide FOV (they're too small to see)
        if (fov > 30f) return
        
        shader.use()
        
        // Calculate ring model matrix
        Matrix.setIdentityM(modelMatrix, 0)
        Matrix.translateM(modelMatrix, 0, saturn.x * 50f, saturn.y * 50f, saturn.z * 50f)
        
        // Saturn's axial tilt is about 26.7 degrees
        Matrix.rotateM(modelMatrix, 0, 26.7f, 1f, 0f, 0f)
        
        // Scale rings relative to planet size
        // Rings extend about 2.3x the planet's radius
        val ringScale = planetScale * 1.0f
        Matrix.scaleM(modelMatrix, 0, ringScale, ringScale, ringScale)
        
        // Calculate MVP
        Matrix.multiplyMM(mvpMatrix, 0, vpMatrix, 0, modelMatrix, 0)
        
        // Set uniforms
        shader.setUniformMatrix4fv("u_MVP", mvpMatrix)
        shader.setUniform3f("u_LightDir", sunDirection[0], sunDirection[1], sunDirection[2])
        shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
        
        // Enable blending for transparent rings
        GLES30.glEnable(GLES30.GL_BLEND)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        
        // Disable face culling to see both sides of rings
        GLES30.glDisable(GLES30.GL_CULL_FACE)
        
        // Draw rings
        ringMesh.draw()
        
        // Restore state
        GLES30.glEnable(GLES30.GL_CULL_FACE)
    }

    /**
     * Calculate dynamic planet scale based on FOV
     * 
     * This creates the "zoom into detail" effect where planets grow
     * as you zoom in, eventually revealing surface features.
     * 
     * The scaling follows an inverse relationship with FOV:
     * - At wide FOV (60°+), planets are small dots
     * - At medium FOV (5-30°), planets are visible disks
     * - At narrow FOV (<5°), planets fill more of the view
     * - At extreme FOV (<0.5°), planets dominate the view with full detail
     */
    private fun getDynamicPlanetScale(planet: Planet, planetScaleSetting: Float, fov: Float): Float {
        // Base scale for each planet type (relative sizes)
        val baseScale = when (planet.id.lowercase()) {
            "sun" -> 4.5f
            "moon" -> 3.5f
            "jupiter" -> 3f
            "saturn" -> 2.5f
            "mars" -> 2f
            "venus" -> 2f
            "mercury" -> 1.5f
            "uranus" -> 1.8f
            "neptune" -> 1.7f
            else -> 1.5f
        }
        
        // Standard scale factor from settings
        val settingsScale = 0.5f + planetScaleSetting * 0.8f
        
        // Dynamic FOV-based scaling
        // This creates smooth zoom-dependent scaling
        val fovScale = when {
            fov > 60f -> 1f                    // Wide view - normal size
            fov > 30f -> 1f + (60f - fov) / 60f   // Gradual increase
            fov > 5f -> 1.5f + (30f - fov) / 25f  // Medium zoom - larger
            fov > 1f -> 2.5f + (5f - fov) / 2f    // Close zoom - much larger
            fov > 0.1f -> 4.5f + (1f - fov) * 5f  // Very close - dominant
            else -> {
                // Extreme zoom (<0.1°) - planet fills view
                // Use logarithmic scaling to prevent it from getting too huge
                val logScale = 10f + kotlin.math.ln((0.1f / fov.coerceAtLeast(0.01f)) + 1f) * 8f
                logScale.coerceAtMost(50f)
            }
        }
        
        return baseScale * settingsScale * fovScale
    }

    private fun getPlanetTextureId(planetName: String): Int {
        return when (planetName.lowercase()) {
            "sun" -> 0
            "moon" -> 1
            "mercury" -> 2
            "venus" -> 3
            "mars" -> 4
            "jupiter" -> 5
            "saturn" -> 6
            "uranus" -> 7
            "neptune" -> 8
            else -> -1
        }
    }

    private fun calculateNormalMatrix(model: FloatArray, result: FloatArray) {
        result[0] = model[0]; result[1] = model[1]; result[2] = model[2]
        result[3] = model[4]; result[4] = model[5]; result[5] = model[6]
        result[6] = model[8]; result[7] = model[9]; result[8] = model[10]
    }

    fun getTriangleCount(): Int = lodSphereMesh.getTriangleCount(LODSphereMesh.LODLevel.MEDIUM)
    
    /**
     * Get moons for a specific planet
     */
    fun getMoonsForPlanet(planetId: String) = moonRenderer.getMoonsForPlanet(planetId)
    
    /**
     * Get all moons
     */
    fun getAllMoons() = moonRenderer.getAllMoons()

    fun delete() {
        lodSphereMesh.delete()
        ringMesh.destroy()
        moonRenderer.delete()
    }
}
