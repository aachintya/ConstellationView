package com.skyviewapp.starfield.gl.renderers

import android.opengl.GLES30
import android.opengl.Matrix
import com.skyviewapp.starfield.gl.RingMesh
import com.skyviewapp.starfield.gl.ShaderProgram
import com.skyviewapp.starfield.gl.SphereMesh
import com.skyviewapp.starfield.models.Planet

/**
 * Handles rendering of planets including Saturn's rings.
 * Manages sphere mesh, ring mesh, and procedural planet texturing.
 */
class PlanetRenderer {
    private val sphereMesh = SphereMesh()
    private val ringMesh = RingMesh()
    
    private val modelMatrix = FloatArray(16)
    private val mvpMatrix = FloatArray(16)
    private val normalMatrix = FloatArray(9)

    private var planets: List<Planet> = emptyList()

    fun initialize() {
        sphereMesh.initialize()
        ringMesh.initialize()
    }

    fun setPlanets(planetList: List<Planet>) {
        planets = planetList
    }

    fun render(
        planetShader: ShaderProgram?,
        ringShader: ShaderProgram?,
        vpMatrix: FloatArray,
        sunDirection: FloatArray,
        nightModeIntensity: Float,
        planetScale: Float
    ) {
        val shader = planetShader ?: return
        if (planets.isEmpty()) return

        shader.use()

        for (planet in planets) {
            if (!planet.visible) continue

            // Calculate model matrix for this planet
            Matrix.setIdentityM(modelMatrix, 0)

            // Position the planet at its celestial coordinates
            val scale = getPlanetScale(planet, planetScale)
            Matrix.translateM(modelMatrix, 0, planet.x * 50f, planet.y * 50f, planet.z * 50f)
            Matrix.scaleM(modelMatrix, 0, scale, scale, scale)

            // Calculate MVP
            Matrix.multiplyMM(mvpMatrix, 0, vpMatrix, 0, modelMatrix, 0)

            // Calculate normal matrix (3x3 upper-left of model matrix)
            calculateNormalMatrix(modelMatrix, normalMatrix)

            // Set uniforms
            shader.setUniformMatrix4fv("u_MVP", mvpMatrix)
            shader.setUniformMatrix4fv("u_ModelMatrix", modelMatrix)
            GLES30.glUniformMatrix3fv(shader.getUniformLocation("u_NormalMatrix"), 1, false, normalMatrix, 0)

            shader.setUniform3f("u_LightDir", sunDirection[0], sunDirection[1], sunDirection[2])
            shader.setUniform3f("u_ViewPos", 0f, 0f, 0f)  // Camera at origin
            shader.setUniform1f("u_AmbientStrength", 0.15f)
            shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
            shader.setUniform1i("u_IsSun", if (planet.id.lowercase() == "sun") 1 else 0)
            
            // Set planet ID for procedural texturing
            val planetId = getPlanetTextureId(planet.id)
            shader.setUniform1i("u_PlanetId", planetId)

            // Draw sphere
            sphereMesh.draw()
            
            // Render Saturn's rings
            if (planet.id.lowercase() == "saturn") {
                renderSaturnRings(ringShader, vpMatrix, planet, scale, sunDirection, nightModeIntensity)
                // Re-activate planet shader after ring rendering
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
        nightModeIntensity: Float
    ) {
        shader ?: return
        
        shader.use()
        
        // Calculate ring model matrix - same position as Saturn but with ring tilt
        Matrix.setIdentityM(modelMatrix, 0)
        Matrix.translateM(modelMatrix, 0, saturn.x * 50f, saturn.y * 50f, saturn.z * 50f)
        
        // Saturn's axial tilt is about 26.7 degrees
        Matrix.rotateM(modelMatrix, 0, 26.7f, 1f, 0f, 0f)
        
        // Scale rings relative to planet size
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
        
        // Disable face culling so we see both sides of rings
        GLES30.glDisable(GLES30.GL_CULL_FACE)
        
        // Draw rings
        ringMesh.draw()
        
        // Restore state
        GLES30.glEnable(GLES30.GL_CULL_FACE)
    }

    private fun getPlanetScale(planet: Planet, planetScaleSetting: Float): Float {
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
        return baseScale * (0.5f + planetScaleSetting * 0.8f)
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
        // Extract 3x3 from 4x4 - for uniform scale, upper-left 3x3 is sufficient
        result[0] = model[0]; result[1] = model[1]; result[2] = model[2]
        result[3] = model[4]; result[4] = model[5]; result[5] = model[6]
        result[6] = model[8]; result[7] = model[9]; result[8] = model[10]
    }

    fun getTriangleCount(): Int = sphereMesh.getTriangleCount()

    fun delete() {
        sphereMesh.delete()
        ringMesh.destroy()
    }
}
