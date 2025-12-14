package com.skyviewapp.starfield.gl.renderers

import android.opengl.GLES30
import android.opengl.Matrix
import com.skyviewapp.starfield.gl.LODSphereMesh
import com.skyviewapp.starfield.gl.ShaderProgram
import com.skyviewapp.starfield.models.Moon
import com.skyviewapp.starfield.models.Planet

/**
 * Renders moons of planets (Jupiter's Galilean moons, Saturn's major moons)
 * 
 * Rendering modes based on FOV:
 * - FOV > 5°: Moons not visible (too small)
 * - FOV 1-5°: Moons as dots
 * - FOV < 1°: Moons as small spheres with proper positioning
 * - FOV < 0.2°: Moons with LOD sphere rendering
 */
class MoonRenderer {
    private val lodSphereMesh = LODSphereMesh()
    
    private val modelMatrix = FloatArray(16)
    private val mvpMatrix = FloatArray(16)
    private val normalMatrix = FloatArray(9)
    
    // Moon collections by parent planet
    private var jupiterMoons: List<Moon> = Moon.createJupiterMoons()
    private var saturnMoons: List<Moon> = Moon.createSaturnMoons()
    
    // Julian date for orbital calculations
    private var currentJulianDate: Double = 2460000.0  // Approximate current epoch
    
    fun initialize() {
        lodSphereMesh.initialize()
    }
    
    /**
     * Update moon positions based on current time
     */
    fun updateMoonPositions(julianDate: Double, planets: List<Planet>) {
        currentJulianDate = julianDate
        
        val jupiter = planets.find { it.id.lowercase() == "jupiter" }
        val saturn = planets.find { it.id.lowercase() == "saturn" }
        
        jupiter?.let { jup ->
            jupiterMoons.forEach { moon ->
                moon.updatePosition(julianDate, jup.x * 50f, jup.y * 50f, jup.z * 50f)
            }
        }
        
        saturn?.let { sat ->
            saturnMoons.forEach { moon ->
                moon.updatePosition(julianDate, sat.x * 50f, sat.y * 50f, sat.z * 50f)
            }
        }
    }
    
    /**
     * Render moons for a specific planet
     * 
     * @param planetShader Shader for moon sphere rendering
     * @param starShader Shader for point/dot rendering (used at medium zoom)
     * @param vpMatrix View-Projection matrix
     * @param planet Parent planet
     * @param fov Current field of view
     * @param sunDirection Direction to sun for lighting
     * @param nightModeIntensity Night mode red filter intensity
     * @param planetScale Current planet visual scale
     */
    fun renderMoonsForPlanet(
        planetShader: ShaderProgram?,
        starShader: ShaderProgram?,
        vpMatrix: FloatArray,
        planet: Planet,
        fov: Float,
        sunDirection: FloatArray,
        nightModeIntensity: Float,
        planetScale: Float
    ) {
        if (!planet.visible) return
        
        // Get moons for this planet
        val moons = when (planet.id.lowercase()) {
            "jupiter" -> jupiterMoons
            "saturn" -> saturnMoons
            else -> return
        }
        
        // Determine rendering mode based on FOV
        when {
            fov > 5f -> {
                // Moons not visible at wide FOV
                return
            }
            fov > 1f -> {
                // Render moons as small spheres (medium zoom)
                renderMoonsAsDots(planetShader, vpMatrix, moons, nightModeIntensity, fov, sunDirection)
            }
            else -> {
                // Render moons as full spheres (close zoom)
                renderMoonsAsSpheres(planetShader, vpMatrix, moons, fov, sunDirection, nightModeIntensity, planetScale)
            }
        }
    }
    
    /**
     * Render moons as small spheres (medium zoom)
     * Uses low LOD sphere instead of point sprites for better visual quality
     */
    private fun renderMoonsAsDots(
        planetShader: ShaderProgram?,
        vpMatrix: FloatArray,
        moons: List<Moon>,
        nightModeIntensity: Float,
        fov: Float,
        sunDirection: FloatArray = floatArrayOf(1f, 0f, 0f)
    ) {
        // Use small spheres instead of points for better visual quality
        // At medium zoom (1-5° FOV), render moons as tiny spheres
        renderMoonsAsSpheres(planetShader, vpMatrix, moons, fov, sunDirection, nightModeIntensity, 0.5f)
    }
    
    /**
     * Render moons as 3D spheres (close zoom)
     */
    private fun renderMoonsAsSpheres(
        shader: ShaderProgram?,
        vpMatrix: FloatArray,
        moons: List<Moon>,
        fov: Float,
        sunDirection: FloatArray,
        nightModeIntensity: Float,
        planetScale: Float
    ) {
        shader ?: return
        
        shader.use()
        
        // Select LOD based on FOV
        val lodLevel = lodSphereMesh.selectLOD(fov * 2f)  // Use lower LOD for moons (smaller)
        
        for (moon in moons) {
            // Calculate moon scale - smaller than planets
            val moonScale = getMoonScale(moon, planetScale, fov)
            
            // Build model matrix
            Matrix.setIdentityM(modelMatrix, 0)
            Matrix.translateM(modelMatrix, 0, moon.worldX, moon.worldY, moon.worldZ)
            Matrix.scaleM(modelMatrix, 0, moonScale, moonScale, moonScale)
            
            // Calculate MVP
            Matrix.multiplyMM(mvpMatrix, 0, vpMatrix, 0, modelMatrix, 0)
            
            // Calculate normal matrix
            calculateNormalMatrix(modelMatrix, normalMatrix)
            
            // Set shader uniforms
            shader.setUniformMatrix4fv("u_MVP", mvpMatrix)
            shader.setUniformMatrix4fv("u_ModelMatrix", modelMatrix)
            GLES30.glUniformMatrix3fv(shader.getUniformLocation("u_NormalMatrix"), 1, false, normalMatrix, 0)
            
            shader.setUniform3f("u_LightDir", sunDirection[0], sunDirection[1], sunDirection[2])
            shader.setUniform3f("u_ViewPos", 0f, 0f, 0f)
            shader.setUniform1f("u_AmbientStrength", 0.2f)
            shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
            shader.setUniform1i("u_IsSun", 0)
            
            // Use moon-specific planet ID for procedural coloring
            // Moon = 1, so moons get similar gray coloring
            val moonTextureId = getMoonTextureId(moon)
            shader.setUniform1i("u_PlanetId", moonTextureId)
            
            // Draw sphere
            lodSphereMesh.draw(lodLevel)
        }
    }
    
    /**
     * Get appropriate scale for moon based on zoom level
     */
    private fun getMoonScale(moon: Moon, planetScale: Float, fov: Float): Float {
        // Base scale relative to planet
        val baseScale = moon.getVisualSizeMultiplier() * planetScale
        
        // Scale increases as FOV decreases (zooming in)
        val fovScaleFactor = when {
            fov < 0.1f -> 3f    // Extreme zoom - moons very visible
            fov < 0.5f -> 2f    // Close zoom
            fov < 1f -> 1.5f    // Medium-close
            else -> 1f
        }
        
        return baseScale * fovScaleFactor
    }
    
    /**
     * Get texture ID for procedural moon coloring
     * Maps to planet shader's u_PlanetId values
     */
    private fun getMoonTextureId(moon: Moon): Int {
        // All moons use the Moon texture (1) for base coloring
        // We could extend the shader to have moon-specific colors
        return 1  // Moon texture ID in planet_fragment.glsl
    }
    
    private fun calculateNormalMatrix(model: FloatArray, result: FloatArray) {
        result[0] = model[0]; result[1] = model[1]; result[2] = model[2]
        result[3] = model[4]; result[4] = model[5]; result[5] = model[6]
        result[6] = model[8]; result[7] = model[9]; result[8] = model[10]
    }
    
    /**
     * Get all moons for a planet
     */
    fun getMoonsForPlanet(planetId: String): List<Moon> {
        return when (planetId.lowercase()) {
            "jupiter" -> jupiterMoons
            "saturn" -> saturnMoons
            else -> emptyList()
        }
    }
    
    /**
     * Get all moons
     */
    fun getAllMoons(): List<Moon> = jupiterMoons + saturnMoons
    
    fun delete() {
        lodSphereMesh.delete()
    }
}

