package com.skyviewapp.starfield.gl

import android.content.Context
import android.graphics.Color
import android.opengl.GLES30
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.util.Log
import com.skyviewapp.R
import com.skyviewapp.starfield.models.ConstellationArt
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
    private var artworkShader: ShaderProgram? = null
    private var ringShader: ShaderProgram? = null

    // GPU buffers
    private val starBuffer = StarBuffer()
    private val lineBuffer = LineBuffer()
    private val sphereMesh = SphereMesh()
    private val ringMesh = RingMesh()  // Saturn's rings
    private val galacticBandMesh = GalacticBandMesh()  // Milky Way band around galactic plane
    private val artworkMesh = ConstellationArtworkMesh()  // For constellation artwork rendering
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
    
    // Celestial coordinate transformation parameters
    var lst = 0f       // Local Sidereal Time in degrees
    var latitude = 28.6f  // Observer's latitude in degrees

    // Render settings
    var nightModeIntensity = 0f  // 0 = off, 1 = full red
    var starBrightness = 0.5f
    var planetScale = 0.5f
    var artworkOpacity = 0.5f  // Artwork visibility
    var showConstellationArtwork = true  // Enable for debug
    var artworkDebugMode = false  // Show anchor star markers on artwork

    // Sun direction for planet lighting (unit vector toward sun)
    var sunDirection = floatArrayOf(1f, 0f, 0f)

    // Data
    private var stars: List<Star> = emptyList()
    private var planets: List<Planet> = emptyList()
    private var lineVertices: FloatArray = FloatArray(0)
    private var lineVertexCount = 0
    
    // Constellation artwork data
    private var constellationArtworks: List<ConstellationArt> = emptyList()
    private val constellationTextures = mutableMapOf<String, Int>()
    private var starMap: Map<String, Star> = emptyMap()

    // Planet textures (loaded by name)
    private val planetTextures = mutableMapOf<String, Int>()

    // Dirty flags
    private var starsNeedUpdate = false
    private var linesNeedUpdate = false
    private var glReady = false
    
    // Pending texture loads (deferred until GL context is ready)
    private val pendingPlanetTextures = mutableListOf<Pair<String, String>>()
    private val pendingConstellationTextures = mutableListOf<Pair<String, String>>()

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
        ringMesh.initialize()
        galacticBandMesh.initialize()
        artworkMesh.initialize()

        // Load Milky Way texture
        milkywayTextureId = textureLoader.loadTextureFromAssets("milkyway.png")
        Log.d(TAG, "Milky Way texture loaded: $milkywayTextureId")

        Log.d(TAG, "Sphere mesh has ${sphereMesh.getTriangleCount()} triangles")
        
        // Mark GL as ready and process any pending texture loads
        glReady = true
        processPendingTextures()
    }
    
    private fun processPendingTextures() {
        for ((planetId, assetPath) in pendingPlanetTextures) {
            val textureId = textureLoader.loadTextureFromAssets(assetPath)
            if (textureId != 0) {
                planetTextures[planetId.lowercase()] = textureId
                Log.d(TAG, "Loaded planet texture: $planetId -> $textureId")
            }
        }
        pendingPlanetTextures.clear()
        
        for ((imageName, assetPath) in pendingConstellationTextures) {
            val textureId = textureLoader.loadTextureFromAssets(assetPath)
            if (textureId != 0) {
                constellationTextures[imageName] = textureId
                Log.d(TAG, "Loaded constellation texture: $imageName -> $textureId")
            }
        }
        pendingConstellationTextures.clear()
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
            artworkShader = ShaderProgram(
                context,
                R.raw.artwork_vertex,
                R.raw.artwork_fragment
            )
            ringShader = ShaderProgram(
                context,
                R.raw.ring_vertex,
                R.raw.ring_fragment
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

        // Render in order: artwork (back), lines, stars, planets (front)
        // renderSkybox()  // Milky Way disabled
        renderConstellationArtwork()  // Draw artwork behind everything
        renderConstellationLines()
        renderStars()
        renderPlanets()
    }

    private fun updateViewMatrix() {
        // Reset view matrix
        Matrix.setIdentityM(viewMatrix, 0)
        
        // The transformation converts from celestial equatorial coordinates (RA/Dec)
        // to the observer's local horizontal coordinates (Alt/Az)
        // 
        // Stars are stored in equatorial coordinates where:
        // - X axis points toward RA=0h (vernal equinox)
        // - Y axis points toward RA=6h  
        // - Z axis points toward celestial north pole (Dec=+90°)
        //
        // We need to:
        // 1. Rotate by LST around Z to account for Earth's rotation
        // 2. Rotate by (90° - latitude) around Y to tilt celestial pole to correct altitude
        // 3. Apply camera azimuth rotation
        // 4. Apply camera altitude rotation
        
        // Step 1: Apply camera altitude (pitch) - looking up/down
        Matrix.rotateM(viewMatrix, 0, -altitude, 1f, 0f, 0f)
        
        // Step 2: Apply camera azimuth (yaw) - looking left/right
        // Azimuth 0 = North, 90 = East, 180 = South, 270 = West
        Matrix.rotateM(viewMatrix, 0, -azimuth, 0f, 1f, 0f)
        
        // Step 3: Tilt the celestial sphere based on latitude
        // At latitude 0°, celestial pole is at horizon (90° from zenith)
        // At latitude 90°, celestial pole is at zenith (0° from zenith)
        // So we rotate by (90 - latitude) to bring pole to correct altitude
        Matrix.rotateM(viewMatrix, 0, (90f - latitude), 1f, 0f, 0f)
        
        // Step 4: Rotate by LST to account for Earth's rotation
        // LST increases as time passes, causing stars to move westward
        // Positive LST rotation makes stars appear to move from east to west
        Matrix.rotateM(viewMatrix, 0, -lst, 0f, 0f, 1f)
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
    
    /**
     * Render constellation artwork as textured quads anchored to celestial coordinates
     */
    private var artworkDebugLogged = false
    
    private fun renderConstellationArtwork() {
        if (!showConstellationArtwork) return  // Skip if disabled
        val shader = artworkShader ?: return
        if (constellationArtworks.isEmpty() || starMap.isEmpty()) {
            if (!artworkDebugLogged) {
                Log.d(TAG, "Artwork skip: artworks=${constellationArtworks.size}, stars=${starMap.size}")
            }
            return
        }
        
        shader.use()
        
        // Disable depth writing (artwork is behind stars)
        GLES30.glDepthMask(false)
        GLES30.glDisable(GLES30.GL_CULL_FACE)
        
        // Standard alpha blending
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        
        var renderedCount = 0
        for (artwork in constellationArtworks) {
            val textureId = constellationTextures[artwork.imageName]
            if (textureId == null || textureId == 0) {
                if (!artworkDebugLogged) {
                    Log.d(TAG, "Artwork ${artwork.id}: no texture for ${artwork.imageName}")
                }
                continue
            }
            
            // Get anchor stars (need at least 3 for proper transformation)
            val anchors = artwork.anchors.mapNotNull { anchor ->
                val hipId = "HIP${anchor.hipId}"
                starMap[hipId]?.let { star -> 
                    Triple(anchor, star, floatArrayOf(star.x, star.y, star.z))
                }
            }
            
            if (anchors.size < 3) {
                if (!artworkDebugLogged) {
                    val missingHips = artwork.anchors.filter { starMap["HIP${it.hipId}"] == null }.map { it.hipId }
                    Log.d(TAG, "Artwork ${artwork.id}: only ${anchors.size}/3 anchors, missing: $missingHips")
                }
                continue
            }
            
            // Get 3D positions and texture coordinates
            val (a1, s1, p1) = anchors[0]
            val (a2, s2, p2) = anchors[1]
            val (a3, s3, p3) = anchors[2]
            
            // Normalize texture coordinates (pixel coords to 0-1)
            // Note: OpenGL texture V coordinate is flipped (0=bottom, 1=top)
            // Image pixel Y is 0=top, so we need: texV = 1 - (pixelY / imgH)
            val imgW = artwork.imageSize.first.toFloat()
            val imgH = artwork.imageSize.second.toFloat()
            val t1 = floatArrayOf(a1.pixelX / imgW, 1f - a1.pixelY / imgH)
            val t2 = floatArrayOf(a2.pixelX / imgW, 1f - a2.pixelY / imgH)
            val t3 = floatArrayOf(a3.pixelX / imgW, 1f - a3.pixelY / imgH)
            
            // Scale 3D positions to place on celestial sphere (far away)
            val scale = 50f  // Same scale as planets
            val sp1 = floatArrayOf(p1[0] * scale, p1[1] * scale, p1[2] * scale)
            val sp2 = floatArrayOf(p2[0] * scale, p2[1] * scale, p2[2] * scale)
            val sp3 = floatArrayOf(p3[0] * scale, p3[1] * scale, p3[2] * scale)
            
            // Update mesh with anchor positions
            artworkMesh.updateQuadFromAnchors(sp1, sp2, sp3, t1, t2, t3)
            
            // Set uniforms
            shader.setUniformMatrix4fv("u_MVP", vpMatrix)
            shader.setUniform1f("u_Opacity", artworkOpacity)
            shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
            
            // Bind texture
            textureLoader.bindTexture(textureId, GLES30.GL_TEXTURE0)
            shader.setUniform1i("u_Texture", 0)
            
            // Draw
            artworkMesh.draw()
            renderedCount++
        }
        
        if (!artworkDebugLogged) {
            Log.d(TAG, "Artwork rendered: $renderedCount/${constellationArtworks.size}")
            artworkDebugLogged = true
        }
        
        // Restore state
        GLES30.glEnable(GLES30.GL_CULL_FACE)
        GLES30.glDepthMask(true)
    }

    private fun renderPlanets() {
        val shader = planetShader ?: return
        if (planets.isEmpty()) return

        shader.use()

        for (planet in planets) {
            if (!planet.visible) continue

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
            
            // Set planet ID for procedural texturing (textures generated in shader)
            val planetId = when (planet.id.lowercase()) {
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
            shader.setUniform1i("u_PlanetId", planetId)

            // Draw sphere (procedural textures - no texture binding needed)
            sphereMesh.draw()
            
            // Render Saturn's rings
            if (planet.id.lowercase() == "saturn") {
                renderSaturnRings(planet, scale)
                // Re-activate planet shader after ring rendering
                shader.use()
            }
        }
    }
    
    private fun renderSaturnRings(saturn: Planet, planetScale: Float) {
        val shader = ringShader ?: return
        
        shader.use()
        
        // Calculate ring model matrix - same position as Saturn but with ring tilt
        Matrix.setIdentityM(modelMatrix, 0)
        Matrix.translateM(modelMatrix, 0, saturn.x * 50f, saturn.y * 50f, saturn.z * 50f)
        
        // Saturn's axial tilt is about 26.7 degrees
        Matrix.rotateM(modelMatrix, 0, 26.7f, 1f, 0f, 0f)
        
        // Scale rings relative to planet size
        val ringScale = planetScale * 1.0f  // Rings extend to about 2.3x planet radius
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

    private fun getPlanetScale(planet: Planet): Float {
        val baseScale = when (planet.id.lowercase()) {
            "sun" -> 4.5f    // Increased from 3f
            "moon" -> 3.5f   // Increased from 2.5f
            "jupiter" -> 3f  // Increased from 2f
            "saturn" -> 2.5f // Increased from 1.8f
            "mars" -> 2f     // Increased from 1.2f
            "venus" -> 2f    // Increased from 1.3f
            "mercury" -> 1.5f
            "uranus" -> 1.8f
            "neptune" -> 1.7f
            else -> 1.5f
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
        if (!glReady) {
            // Defer until GL context is ready
            pendingPlanetTextures.add(planetId to assetPath)
            return
        }
        val textureId = textureLoader.loadTextureFromAssets(assetPath)
        if (textureId != 0) {
            planetTextures[planetId.lowercase()] = textureId
            Log.d(TAG, "Loaded planet texture: $planetId -> $textureId")
        }
    }
    
    // ============= Constellation Artwork Methods =============
    
    fun setConstellationArtworks(artworks: List<ConstellationArt>, stars: List<Star>) {
        constellationArtworks = artworks
        // Build a map from star ID (already in "HIP12345" format) to star for quick lookup
        starMap = stars.associateBy { it.id }
    }
    
    fun enableConstellationArtwork(show: Boolean) {
        showConstellationArtwork = show
    }
    
    fun loadConstellationTexture(imageName: String, assetPath: String) {
        if (!glReady) {
            // Defer until GL context is ready
            pendingConstellationTextures.add(imageName to assetPath)
            return
        }
        val textureId = textureLoader.loadTextureFromAssets(assetPath)
        if (textureId != 0) {
            constellationTextures[imageName] = textureId
            Log.d(TAG, "Loaded constellation texture: $imageName -> $textureId")
        }
    }
    
    fun updateArtworkOpacity(opacity: Float) {
        artworkOpacity = opacity.coerceIn(0f, 1f)
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
        artworkShader?.delete()
        starBuffer.delete()
        lineBuffer.delete()
        sphereMesh.delete()
        galacticBandMesh.delete()
        artworkMesh.destroy()
        textureLoader.deleteAllTextures()
    }
}
