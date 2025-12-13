package com.skyviewapp.starfield.gl

import android.content.Context
import android.graphics.Color
import android.opengl.GLES30
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.util.Log
import com.skyviewapp.R
import com.skyviewapp.starfield.models.Planet
import com.skyviewapp.starfield.models.Star
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

/**
 * OpenGL ES 3.0 Renderer for the sky view
 * Implements GLSurfaceView.Renderer for hardware-accelerated rendering
 */
class GLSkyRenderer(private val context: Context) : GLSurfaceView.Renderer {
    companion object {
        private const val TAG = "GLSkyRenderer"
    }

    // Shader programs
    private var starShader: ShaderProgram? = null
    private var lineShader: ShaderProgram? = null
    private var planetShader: ShaderProgram? = null
    private var skyboxShader: ShaderProgram? = null

    // GPU buffers
    private val starBuffer = StarBuffer()
    private val lineBuffer = LineBuffer()
    private val sphereMesh = SphereMesh()
    private val galacticBandMesh = GalacticBandMesh()  // Milky Way band around galactic plane
    private val textureLoader by lazy { GLTextureLoader(context) }
    private var milkywayTextureId = 0

    // Matrices
    private val viewMatrix = FloatArray(16)
    private val projectionMatrix = FloatArray(16)
    private val vpMatrix = FloatArray(16)
    private val mvpMatrix = FloatArray(16)
    private val modelMatrix = FloatArray(16)
    private val normalMatrix = FloatArray(9)

    // Screen dimensions
    private var screenWidth = 1
    private var screenHeight = 1

    // Camera/view parameters
    var azimuth = 0f
    var altitude = 0f
    var fov = 75f

    // Render settings
    var nightModeIntensity = 0f  // 0 = off, 1 = full red
    var starBrightness = 0.5f
    var planetScale = 0.5f

    // Sun direction for planet lighting (unit vector toward sun)
    var sunDirection = floatArrayOf(1f, 0f, 0f)

    // Data
    private var stars: List<Star> = emptyList()
    private var planets: List<Planet> = emptyList()
    private var lineVertices: FloatArray = FloatArray(0)
    private var lineVertexCount = 0

    // Planet textures (loaded by name)
    private val planetTextures = mutableMapOf<String, Int>()

    // Dirty flags
    private var starsNeedUpdate = false
    private var linesNeedUpdate = false

    // Crosshair callback
    var onCrosshairObjectChanged: ((String?, String?) -> Unit)? = null

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        Log.d(TAG, "onSurfaceCreated")

        // Set clear color (transparent for overlay)
        GLES30.glClearColor(0f, 0f, 0f, 0f)

        // Enable depth testing for proper planet rendering
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)
        GLES30.glDepthFunc(GLES30.GL_LEQUAL)

        // Enable blending for stars and lines
        GLES30.glEnable(GLES30.GL_BLEND)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)

        // Note: GL_PROGRAM_POINT_SIZE is not needed in OpenGL ES 3.0
        // Point size from vertex shader (gl_PointSize) is always enabled

        // Initialize shaders
        initShaders()

        // Initialize buffers
        starBuffer.initialize()
        lineBuffer.initialize()
        sphereMesh.initialize()
        galacticBandMesh.initialize()

        // Load Milky Way texture
        milkywayTextureId = textureLoader.loadTextureFromAssets("milkyway.png")
        Log.d(TAG, "Milky Way texture loaded: $milkywayTextureId")

        Log.d(TAG, "Sphere mesh has ${sphereMesh.getTriangleCount()} triangles")
    }

    private fun initShaders() {
        try {
            starShader = ShaderProgram(
                context,
                R.raw.star_vertex,
                R.raw.star_fragment
            )
            lineShader = ShaderProgram(
                context,
                R.raw.line_vertex,
                R.raw.line_fragment
            )
            planetShader = ShaderProgram(
                context,
                R.raw.planet_vertex,
                R.raw.planet_fragment
            )
            skyboxShader = ShaderProgram(
                context,
                R.raw.skybox_vertex,
                R.raw.skybox_fragment
            )
            Log.d(TAG, "All shaders compiled successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Shader initialization failed", e)
        }
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        Log.d(TAG, "onSurfaceChanged: ${width}x${height}")
        screenWidth = width
        screenHeight = height

        GLES30.glViewport(0, 0, width, height)

        // Update projection matrix
        val aspectRatio = width.toFloat() / height.toFloat()
        Matrix.perspectiveM(projectionMatrix, 0, fov, aspectRatio, 0.1f, 100f)
    }

    override fun onDrawFrame(gl: GL10?) {
        // Clear buffers
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)

        // Update view matrix based on orientation
        updateViewMatrix()

        // Calculate VP matrix
        Matrix.multiplyMM(vpMatrix, 0, projectionMatrix, 0, viewMatrix, 0)

        // Render in order: lines, stars, planets (front)
        // renderSkybox()  // Milky Way disabled
        renderConstellationLines()
        renderStars()
        renderPlanets()
    }

    private fun updateViewMatrix() {
        // Reset view matrix
        Matrix.setIdentityM(viewMatrix, 0)

        // Apply rotation for altitude (pitch) - around X axis
        Matrix.rotateM(viewMatrix, 0, -altitude, 1f, 0f, 0f)

        // Apply rotation for azimuth (yaw) - around Y axis
        Matrix.rotateM(viewMatrix, 0, -azimuth, 0f, 1f, 0f)
    }

    private fun renderSkybox() {
        val shader = skyboxShader ?: return
        if (milkywayTextureId == 0) return

        shader.use()

        // Milky Way band is already positioned at galactic plane in the mesh
        // Just scale it to a large radius so it appears behind stars
        val milkywayModel = FloatArray(16)
        Matrix.setIdentityM(milkywayModel, 0)
        Matrix.scaleM(milkywayModel, 0, 80f, 80f, 80f)  // Large sphere around viewer

        // Calculate MVP for milkyway band
        val milkywayMvp = FloatArray(16)
        Matrix.multiplyMM(milkywayMvp, 0, vpMatrix, 0, milkywayModel, 0)

        shader.setUniformMatrix4fv("u_MVP", milkywayMvp)
        shader.setUniform1f("u_Brightness", 0.3f + starBrightness * 0.4f)

        // Disable depth writing and use additive blending for soft overlay
        GLES30.glDepthMask(false)
        GLES30.glDisable(GLES30.GL_CULL_FACE)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE)  // Additive blend

        // Bind texture
        textureLoader.bindTexture(milkywayTextureId, GLES30.GL_TEXTURE0)
        shader.setUniform1i("u_Texture", 0)

        // Draw the galactic band mesh
        galacticBandMesh.draw()

        // Restore settings
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        GLES30.glEnable(GLES30.GL_CULL_FACE)
        GLES30.glDepthMask(true)
    }

    private fun renderStars() {
        val shader = starShader ?: return
        if (stars.isEmpty()) return

        // Update star buffer if needed
        if (starsNeedUpdate) {
            uploadStarData()
            starsNeedUpdate = false
        }

        shader.use()

        // Set uniforms
        shader.setUniformMatrix4fv("u_MVP", vpMatrix)
        shader.setUniform1f("u_PointSizeBase", 8f + starBrightness * 12f)  // Increased from 3f + 5f
        shader.setUniform1f("u_BrightnessMultiplier", 1.0f + starBrightness * 1.5f)  // Increased base
        shader.setUniform2f("u_ScreenSize", screenWidth.toFloat(), screenHeight.toFloat())
        shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)

        // Disable depth writing for stars (they're all at infinity)
        GLES30.glDepthMask(false)

        // Additive blending for bright star glow
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE)

        starBuffer.draw()

        // Restore default blending
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        GLES30.glDepthMask(true)
    }

    private fun renderConstellationLines() {
        val shader = lineShader ?: return
        if (lineVertexCount == 0) return

        // Update line buffer if needed
        if (linesNeedUpdate) {
            lineBuffer.uploadData(lineVertices, lineVertexCount)
            linesNeedUpdate = false
        }

        shader.use()

        // Set uniforms
        shader.setUniformMatrix4fv("u_MVP", vpMatrix)
        shader.setUniform4f("u_LineColor", 0.4f, 0.6f, 1f, 0.7f)  // Blue-ish
        shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)

        // Disable depth for lines
        GLES30.glDepthMask(false)

        lineBuffer.draw()

        GLES30.glDepthMask(true)
    }

    private fun renderPlanets() {
        val shader = planetShader ?: return
        if (planets.isEmpty()) return

        shader.use()

        for (planet in planets) {
            if (!planet.visible) continue

            // Get texture for this planet
            val textureId = planetTextures[planet.id.lowercase()]
            if (textureId == null || textureId == 0) continue

            // Calculate model matrix for this planet
            Matrix.setIdentityM(modelMatrix, 0)

            // Position the planet at its celestial coordinates
            // Scale it relative to its distance for apparent size
            val scale = getPlanetScale(planet)
            Matrix.translateM(modelMatrix, 0, planet.x * 50f, planet.y * 50f, planet.z * 50f)
            Matrix.scaleM(modelMatrix, 0, scale, scale, scale)

            // Calculate MVP
            Matrix.multiplyMM(mvpMatrix, 0, vpMatrix, 0, modelMatrix, 0)

            // Calculate normal matrix (inverse transpose of model matrix 3x3)
            calculateNormalMatrix(modelMatrix, normalMatrix)

            // Set uniforms
            shader.setUniformMatrix4fv("u_MVP", mvpMatrix)
            shader.setUniformMatrix4fv("u_ModelMatrix", modelMatrix)
            // For normal matrix, we need 3x3 but GLES30 doesn't have a direct uniform call
            // We'll pass the 3x3 as 9 floats or use the model matrix directly
            GLES30.glUniformMatrix3fv(shader.getUniformLocation("u_NormalMatrix"), 1, false, normalMatrix, 0)

            shader.setUniform3f("u_LightDir", sunDirection[0], sunDirection[1], sunDirection[2])
            shader.setUniform3f("u_ViewPos", 0f, 0f, 0f)  // Camera at origin
            shader.setUniform1f("u_AmbientStrength", 0.15f)
            shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
            shader.setUniform1i("u_IsSun", if (planet.id.lowercase() == "sun") 1 else 0)

            // Bind texture
            textureLoader.bindTexture(textureId, GLES30.GL_TEXTURE0)
            shader.setUniform1i("u_Texture", 0)

            // Draw sphere
            sphereMesh.draw()
        }
    }

    private fun getPlanetScale(planet: Planet): Float {
        val baseScale = when (planet.id.lowercase()) {
            "sun" -> 3f
            "moon" -> 2.5f
            "jupiter" -> 2f
            "saturn" -> 1.8f
            "mars" -> 1.2f
            "venus" -> 1.3f
            else -> 1f
        }
        return baseScale * (0.5f + planetScale * 0.8f)
    }

    private fun calculateNormalMatrix(model: FloatArray, result: FloatArray) {
        // Extract 3x3 from 4x4 and compute inverse transpose
        // For uniform scale rotations, the 3x3 upper-left is sufficient
        result[0] = model[0]; result[1] = model[1]; result[2] = model[2]
        result[3] = model[4]; result[4] = model[5]; result[5] = model[6]
        result[6] = model[8]; result[7] = model[9]; result[8] = model[10]
    }

    // ============= Data Upload Methods =============

    fun setStars(starList: List<Star>) {
        stars = starList
        starsNeedUpdate = true
    }

    private fun uploadStarData() {
        if (stars.isEmpty()) return

        // Pack star data: [x, y, z, magnitude, r, g, b] per star
        val data = FloatArray(stars.size * 7)
        var index = 0

        for (star in stars) {
            data[index++] = star.x
            data[index++] = star.y
            data[index++] = star.z
            data[index++] = star.magnitude

            // Convert spectral type to color
            val color = getStarColor(star.spectralType)
            data[index++] = Color.red(color) / 255f
            data[index++] = Color.green(color) / 255f
            data[index++] = Color.blue(color) / 255f
        }

        starBuffer.uploadData(data, stars.size)
    }

    private fun getStarColor(spectralType: String?): Int {
        return when (spectralType?.firstOrNull()?.uppercaseChar()) {
            'O' -> Color.rgb(155, 176, 255)  // Blue
            'B' -> Color.rgb(170, 191, 255)  // Blue-white
            'A' -> Color.rgb(202, 215, 255)  // White
            'F' -> Color.rgb(248, 247, 255)  // Yellow-white
            'G' -> Color.rgb(255, 244, 234)  // Yellow (Sun)
            'K' -> Color.rgb(255, 210, 161)  // Orange
            'M' -> Color.rgb(255, 204, 111)  // Red
            else -> Color.WHITE
        }
    }

    fun setConstellationLines(vertices: FloatArray, count: Int) {
        lineVertices = vertices
        lineVertexCount = count
        linesNeedUpdate = true
    }

    fun setPlanets(planetList: List<Planet>) {
        planets = planetList
    }

    fun loadPlanetTexture(planetId: String, assetPath: String) {
        val textureId = textureLoader.loadTextureFromAssets(assetPath)
        if (textureId != 0) {
            planetTextures[planetId.lowercase()] = textureId
        }
    }

    fun setNightMode(mode: String) {
        nightModeIntensity = when (mode.lowercase()) {
            "red" -> 1f
            "dim" -> 0.5f
            else -> 0f
        }
    }

    fun updateFov(newFov: Float) {
        fov = newFov
        val aspectRatio = screenWidth.toFloat() / screenHeight.toFloat()
        Matrix.perspectiveM(projectionMatrix, 0, fov, aspectRatio, 0.1f, 100f)
    }

    // ============= Cleanup =============

    fun destroy() {
        starShader?.delete()
        lineShader?.delete()
        planetShader?.delete()
        skyboxShader?.delete()
        starBuffer.delete()
        lineBuffer.delete()
        sphereMesh.delete()
        galacticBandMesh.delete()
        textureLoader.deleteAllTextures()
    }
}
