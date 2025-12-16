package com.skyviewapp.starfield.gl.renderers

import android.content.Context
import android.graphics.*
import android.opengl.GLES30
import android.opengl.GLUtils
import android.opengl.Matrix
import com.skyviewapp.starfield.utils.GLTextTextureGenerator
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import kotlin.math.cos
import kotlin.math.sin

/**
 * Renders an Azimuthal (Alt-Az) grid like Stellarium.
 * Shows altitude circles at 0°, 10°, 20°, ... 90° (zenith)
 * Shows azimuth lines at 0°, 30°, 60°, ... 330°
 * Labels show degree values at key intersections.
 * 
 * Uses ground-fixed view matrix (same as CardinalPointsRenderer) for stable positioning.
 */
class GLAzimuthalGridRenderer(private val context: Context) {

    // Shader handles
    private var lineProgram: Int = 0
    private var textProgram: Int = 0
    
    // Line shader uniforms/attributes
    private var lineUMvpMatrix: Int = 0
    private var lineUColor: Int = 0
    private var lineAPosition: Int = 0
    
    // Text shader uniforms/attributes
    private var textUMvpMatrix: Int = 0
    private var textUTexture: Int = 0
    private var textUColor: Int = 0
    private var textAPosition: Int = 0
    private var textATexCoord: Int = 0

    // Grid geometry
    private lateinit var altitudeCirclesBuffer: FloatBuffer
    private lateinit var azimuthLinesBuffer: FloatBuffer
    private var altitudeVertexCount = 0
    private var azimuthVertexCount = 0
    
    // Label textures and geometry
    private val labelTextures = mutableMapOf<String, Int>()
    private lateinit var labelQuadBuffer: FloatBuffer
    private lateinit var labelTexCoordBuffer: FloatBuffer
    
    // Label positions (in 3D space)
    private data class LabelInfo(val text: String, val x: Float, val y: Float, val z: Float, val rotY: Float)
    private val labels = mutableListOf<LabelInfo>()
    
    // Scratch matrices
    private val scratchMatrix = FloatArray(16)
    private val modelMatrix = FloatArray(16)
    
    // Configuration
    var enabled: Boolean = false
    private val lineColor = floatArrayOf(0.9f, 0.6f, 0.3f, 0.25f)  // Lighter orange (reduced alpha)
    private val labelColor = floatArrayOf(0.9f, 0.7f, 0.4f, 0.7f)  // Orange for labels
    
    // Grid parameters
    private val gridDistance = 10.0f  // Distance from camera
    private val altitudeStep = 10  // Degrees between altitude circles
    private val azimuthStep = 15   // Degrees between azimuth lines (more detailed)
    private val circleSegments = 72  // Smoothness of circles

    fun init() {
        initLineShader()
        initTextShader()
        generateGridGeometry()
        generateLabelGeometry()
        generateLabelTextures()
    }
    
    private fun initLineShader() {
        val vertexShader = loadShader(GLES30.GL_VERTEX_SHADER, LINE_VERTEX_SHADER)
        val fragmentShader = loadShader(GLES30.GL_FRAGMENT_SHADER, LINE_FRAGMENT_SHADER)
        
        lineProgram = GLES30.glCreateProgram().also {
            GLES30.glAttachShader(it, vertexShader)
            GLES30.glAttachShader(it, fragmentShader)
            GLES30.glLinkProgram(it)
        }
        
        lineUMvpMatrix = GLES30.glGetUniformLocation(lineProgram, "uMvpMatrix")
        lineUColor = GLES30.glGetUniformLocation(lineProgram, "uColor")
        lineAPosition = GLES30.glGetAttribLocation(lineProgram, "aPosition")
    }
    
    private fun initTextShader() {
        val vertexShader = loadShader(GLES30.GL_VERTEX_SHADER, TEXT_VERTEX_SHADER)
        val fragmentShader = loadShader(GLES30.GL_FRAGMENT_SHADER, TEXT_FRAGMENT_SHADER)
        
        textProgram = GLES30.glCreateProgram().also {
            GLES30.glAttachShader(it, vertexShader)
            GLES30.glAttachShader(it, fragmentShader)
            GLES30.glLinkProgram(it)
        }
        
        textUMvpMatrix = GLES30.glGetUniformLocation(textProgram, "uMvpMatrix")
        textUTexture = GLES30.glGetUniformLocation(textProgram, "uTexture")
        textUColor = GLES30.glGetUniformLocation(textProgram, "uColor")
        textAPosition = GLES30.glGetAttribLocation(textProgram, "aPosition")
        textATexCoord = GLES30.glGetAttribLocation(textProgram, "aTexCoord")
    }
    
    private fun generateGridGeometry() {
        val altitudeVertices = mutableListOf<Float>()
        val azimuthVertices = mutableListOf<Float>()
        
        // Generate altitude circles from -80° to +80° (full sphere)
        // Skip ±90° as they are single points (zenith/nadir)
        for (alt in -80..80 step altitudeStep) {
            if (alt == 0) continue // Skip horizon, it's usually implied or separate
            val altRad = Math.toRadians(alt.toDouble())
            val y = (sin(altRad) * gridDistance).toFloat()
            val radius = (cos(altRad) * gridDistance).toFloat()
            
            // Create circle at this altitude
            for (i in 0..circleSegments) {
                val azRad = Math.toRadians((i * 360.0 / circleSegments))
                val x = (-sin(azRad) * radius).toFloat()
                val z = (-cos(azRad) * radius).toFloat()
                altitudeVertices.addAll(listOf(x, y, z))
            }
        }
        
        // Add horizon circle (alt = 0°) as a separate circle
        val horizonY = 0f
        val horizonRadius = gridDistance
        for (i in 0..circleSegments) {
            val azRad = Math.toRadians((i * 360.0 / circleSegments))
            val x = (-sin(azRad) * horizonRadius).toFloat()
            val z = (-cos(azRad) * horizonRadius).toFloat()
            altitudeVertices.addAll(listOf(x, horizonY, z))
        }
        
        // Generate azimuth lines (0° to 345° in steps of 15°) - full sphere
        for (az in 0 until 360 step azimuthStep) {
            val azRad = Math.toRadians(az.toDouble())
            
            // Line from -85° (near nadir) to +85° (near zenith)
            for (alt in -85..85 step 5) {
                val altRad = Math.toRadians(alt.toDouble())
                val y = (sin(altRad) * gridDistance).toFloat()
                val r = (cos(altRad) * gridDistance).toFloat()
                val x = (-sin(azRad) * r).toFloat()
                val z = (-cos(azRad) * r).toFloat()
                azimuthVertices.addAll(listOf(x, y, z))
            }
        }
        
        // Create buffers
        altitudeVertexCount = altitudeVertices.size / 3
        altitudeCirclesBuffer = ByteBuffer.allocateDirect(altitudeVertices.size * 4)
            .order(ByteOrder.nativeOrder()).asFloatBuffer()
        altitudeCirclesBuffer.put(altitudeVertices.toFloatArray()).position(0)
        
        azimuthVertexCount = azimuthVertices.size / 3
        azimuthLinesBuffer = ByteBuffer.allocateDirect(azimuthVertices.size * 4)
            .order(ByteOrder.nativeOrder()).asFloatBuffer()
        azimuthLinesBuffer.put(azimuthVertices.toFloatArray()).position(0)
    }
    
    private fun generateLabelGeometry() {
        // Quad for label billboards
        val size = 0.35f
        val quadCoords = floatArrayOf(
            -size, -size * 0.5f, 0f,
             size, -size * 0.5f, 0f,
            -size,  size * 0.5f, 0f,
             size,  size * 0.5f, 0f
        )
        
        val texCoords = floatArrayOf(
            0f, 1f,
            1f, 1f,
            0f, 0f,
            1f, 0f
        )
        
        labelQuadBuffer = ByteBuffer.allocateDirect(quadCoords.size * 4)
            .order(ByteOrder.nativeOrder()).asFloatBuffer()
        labelQuadBuffer.put(quadCoords).position(0)
        
        labelTexCoordBuffer = ByteBuffer.allocateDirect(texCoords.size * 4)
            .order(ByteOrder.nativeOrder()).asFloatBuffer()
        labelTexCoordBuffer.put(texCoords).position(0)
        
        // Generate label positions
        labels.clear()
        
        // Altitude labels along multiple azimuth lines (every 90°)
        for (azOffset in listOf(0, 90, 180, 270)) {
            val azRad = Math.toRadians(azOffset.toDouble())
            for (alt in listOf(-70, -50, -30, -10, 10, 30, 50, 70)) {
                val altRad = Math.toRadians(alt.toDouble())
                val y = (sin(altRad) * gridDistance).toFloat()
                val r = (cos(altRad) * gridDistance).toFloat()
                val x = (-sin(azRad) * r).toFloat()
                val z = (-cos(azRad) * r).toFloat()
                val prefix = if (alt > 0) "+" else ""
                labels.add(LabelInfo("$prefix${alt}°", x, y, z, -azOffset.toFloat()))
            }
        }
        
        // Azimuth labels along horizon and at various altitudes
        val labelAltitudes = listOf(-20, 0, 20, 40, 60, 80)
        for (labelAlt in labelAltitudes) {
            val altRad = Math.toRadians(labelAlt.toDouble())
            val y = (sin(altRad) * gridDistance).toFloat()
            val r = (cos(altRad) * gridDistance).toFloat()
            
            for (az in 0 until 360 step 15) {
                // Skip cardinal points at horizon (they have their own labels)
                if (labelAlt == 0 && (az == 0 || az == 90 || az == 180 || az == 270)) continue
                // Only add azimuth labels at certain positions to avoid clutter
                if (labelAlt != 0 && az % 30 != 0) continue
                
                val azRad = Math.toRadians(az.toDouble())
                val x = (-sin(azRad) * r).toFloat()
                val z = (-cos(azRad) * r).toFloat()
                labels.add(LabelInfo("${az}°", x, y, z, -az.toFloat()))
            }
        }
    }
    
    private fun generateLabelTextures() {
        val uniqueLabels = labels.map { it.text }.toSet()
        
        android.util.Log.d("AzGrid", "Generating ${uniqueLabels.size} unique label textures from ${labels.size} total labels")
        android.util.Log.d("AzGrid", "Unique labels: $uniqueLabels")
        
        for (text in uniqueLabels) {
            android.util.Log.d("AzGrid", "Creating texture for: '$text'")
            val bitmap = generateLabelBitmap(text)
            val texId = IntArray(1)
            GLES30.glGenTextures(1, texId, 0)
            
            GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, texId[0])
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MIN_FILTER, GLES30.GL_LINEAR)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MAG_FILTER, GLES30.GL_LINEAR)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_S, GLES30.GL_CLAMP_TO_EDGE)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_T, GLES30.GL_CLAMP_TO_EDGE)
            
            GLUtils.texImage2D(GLES30.GL_TEXTURE_2D, 0, bitmap, 0)
            bitmap.recycle()
            
            labelTextures[text] = texId[0]
            android.util.Log.d("AzGrid", "Created texture ID ${texId[0]} for '$text'")
        }
        
        android.util.Log.d("AzGrid", "Total textures created: ${labelTextures.size}")
    }
    
    private fun generateLabelBitmap(text: String): Bitmap {
        val width = 128
        val height = 64
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        bitmap.eraseColor(Color.TRANSPARENT)
        
        val paint = Paint().apply {
            isAntiAlias = true
            textSize = 32f
            color = Color.WHITE
            typeface = Typeface.DEFAULT_BOLD
            textAlign = Paint.Align.CENTER
            setShadowLayer(2f, 0f, 0f, Color.BLACK)
        }
        
        val xPos = width / 2f
        val yPos = (height / 2f) - ((paint.descent() + paint.ascent()) / 2f)
        canvas.drawText(text, xPos, yPos, paint)
        
        return bitmap
    }
    
    fun draw(projectionMatrix: FloatArray, camAzimuth: Float, camAltitude: Float) {
        if (!enabled) return
        
        // Disable depth testing (render as overlay)
        GLES30.glDisable(GLES30.GL_DEPTH_TEST)
        
        // Enable blending
        GLES30.glEnable(GLES30.GL_BLEND)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        
        // Build ground-fixed view matrix (same as cardinal points)
        val groundViewMatrix = FloatArray(16)
        Matrix.setIdentityM(groundViewMatrix, 0)
        Matrix.rotateM(groundViewMatrix, 0, -camAltitude, 1f, 0f, 0f)
        Matrix.rotateM(groundViewMatrix, 0, -camAzimuth, 0f, 1f, 0f)
        
        // Calculate VP matrix for grid
        Matrix.multiplyMM(scratchMatrix, 0, projectionMatrix, 0, groundViewMatrix, 0)
        
        // Draw grid lines
        drawGridLines(scratchMatrix)
        
        // Draw labels
        drawLabels(groundViewMatrix, projectionMatrix)
        
        // Restore depth testing
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)
    }
    
    private fun drawGridLines(vpMatrix: FloatArray) {
        GLES30.glUseProgram(lineProgram)
        
        GLES30.glUniformMatrix4fv(lineUMvpMatrix, 1, false, vpMatrix, 0)
        GLES30.glUniform4f(lineUColor, lineColor[0], lineColor[1], lineColor[2], lineColor[3])
        
        GLES30.glEnableVertexAttribArray(lineAPosition)
        
        // Draw altitude circles
        GLES30.glVertexAttribPointer(lineAPosition, 3, GLES30.GL_FLOAT, false, 0, altitudeCirclesBuffer)
        val verticesPerCircle = circleSegments + 1
        // 17 circles: -80, -70, ..., -10, +10, ..., +80 (16) + horizon (1) = 17
        val numCircles = 17
        for (i in 0 until numCircles) {
            GLES30.glDrawArrays(GLES30.GL_LINE_STRIP, i * verticesPerCircle, verticesPerCircle)
        }
        
        // Draw azimuth lines
        GLES30.glVertexAttribPointer(lineAPosition, 3, GLES30.GL_FLOAT, false, 0, azimuthLinesBuffer)
        // Vertices per line: from -85 to +85 step 5 = 35 vertices per line
        val verticesPerLine = 35  // (85 - (-85)) / 5 + 1 = 35
        val numLines = 360 / azimuthStep  // 24 lines at 15° intervals
        for (i in 0 until numLines) {
            GLES30.glDrawArrays(GLES30.GL_LINE_STRIP, i * verticesPerLine, verticesPerLine)
        }
        
        GLES30.glDisableVertexAttribArray(lineAPosition)
    }
    
    private fun drawLabels(viewMatrix: FloatArray, projectionMatrix: FloatArray) {
        GLES30.glUseProgram(textProgram)
        
        GLES30.glUniform4f(textUColor, labelColor[0], labelColor[1], labelColor[2], labelColor[3])
        GLES30.glUniform1i(textUTexture, 0)
        
        GLES30.glEnableVertexAttribArray(textAPosition)
        GLES30.glEnableVertexAttribArray(textATexCoord)
        
        GLES30.glVertexAttribPointer(textAPosition, 3, GLES30.GL_FLOAT, false, 0, labelQuadBuffer)
        GLES30.glVertexAttribPointer(textATexCoord, 2, GLES30.GL_FLOAT, false, 0, labelTexCoordBuffer)
        
        for (label in labels) {
            val texId = labelTextures[label.text] ?: continue
            
            // Create model matrix for this label (translate + billboard rotation)
            Matrix.setIdentityM(modelMatrix, 0)
            Matrix.translateM(modelMatrix, 0, label.x, label.y, label.z)
            Matrix.rotateM(modelMatrix, 0, label.rotY, 0f, 1f, 0f)
            
            // MVP = Projection * View * Model
            Matrix.multiplyMM(scratchMatrix, 0, viewMatrix, 0, modelMatrix, 0)
            Matrix.multiplyMM(scratchMatrix, 0, projectionMatrix, 0, scratchMatrix, 0)
            
            GLES30.glUniformMatrix4fv(textUMvpMatrix, 1, false, scratchMatrix, 0)
            
            GLES30.glActiveTexture(GLES30.GL_TEXTURE0)
            GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, texId)
            
            GLES30.glDrawArrays(GLES30.GL_TRIANGLE_STRIP, 0, 4)
        }
        
        GLES30.glDisableVertexAttribArray(textAPosition)
        GLES30.glDisableVertexAttribArray(textATexCoord)
    }
    
    fun setNightMode(mode: String) {
        when (mode.lowercase()) {
            "red" -> {
                lineColor[0] = 0.4f; lineColor[1] = 0.1f; lineColor[2] = 0.05f; lineColor[3] = 0.2f
                labelColor[0] = 0.7f; labelColor[1] = 0.2f; labelColor[2] = 0.1f; labelColor[3] = 0.6f
            }
            "dim" -> {
                lineColor[0] = 0.5f; lineColor[1] = 0.35f; lineColor[2] = 0.15f; lineColor[3] = 0.15f
                labelColor[0] = 0.6f; labelColor[1] = 0.45f; labelColor[2] = 0.25f; labelColor[3] = 0.5f
            }
            else -> {
                // Restore lighter orange colors
                lineColor[0] = 0.9f; lineColor[1] = 0.6f; lineColor[2] = 0.3f; lineColor[3] = 0.25f
                labelColor[0] = 0.9f; labelColor[1] = 0.7f; labelColor[2] = 0.4f; labelColor[3] = 0.7f
            }
        }
    }

    private fun loadShader(type: Int, shaderCode: String): Int {
        return GLES30.glCreateShader(type).also { shader ->
            GLES30.glShaderSource(shader, shaderCode)
            GLES30.glCompileShader(shader)
        }
    }

    companion object {
        private const val LINE_VERTEX_SHADER = """
            uniform mat4 uMvpMatrix;
            attribute vec4 aPosition;
            void main() {
                gl_Position = uMvpMatrix * aPosition;
            }
        """
        
        private const val LINE_FRAGMENT_SHADER = """
            precision mediump float;
            uniform vec4 uColor;
            void main() {
                gl_FragColor = uColor;
            }
        """
        
        private const val TEXT_VERTEX_SHADER = """
            uniform mat4 uMvpMatrix;
            attribute vec4 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            void main() {
                gl_Position = uMvpMatrix * aPosition;
                vTexCoord = aTexCoord;
            }
        """
        
        private const val TEXT_FRAGMENT_SHADER = """
            precision mediump float;
            uniform sampler2D uTexture;
            uniform vec4 uColor;
            varying vec2 vTexCoord;
            void main() {
                vec4 texColor = texture2D(uTexture, vTexCoord);
                if (texColor.a < 0.1) discard;
                gl_FragColor = texColor * uColor;
            }
        """
    }
}
