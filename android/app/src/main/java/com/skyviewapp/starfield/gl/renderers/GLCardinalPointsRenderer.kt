package com.skyviewapp.starfield.gl.renderers

import android.content.Context
import android.graphics.Color
import android.opengl.GLES30
import android.opengl.GLUtils
import android.opengl.Matrix
import android.util.Log
import com.skyviewapp.starfield.utils.GLTextTextureGenerator
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import kotlin.math.cos
import kotlin.math.sin

/**
 * Renders Cardinal Points (N, S, E, W) using OpenGL textures projected on the horizon.
 * Uses a billboard technique to keep text upright.
 */
class GLCardinalPointsRenderer(private val context: Context) {

    private var programId: Int = 0
    private var uMvpMatrixHandle: Int = 0
    private var uTextureHandle: Int = 0
    private var uColorHandle: Int = 0
    private var positionHandle: Int = 0
    private var texCoordHandle: Int = 0

    private val textures = IntArray(4) // N, S, E, W
    private val textureIds = arrayOf("N", "S", "E", "W")
    
    // Vertex Buffer for a simple quad
    private lateinit var vertexBuffer: FloatBuffer
    private lateinit var texCoordBuffer: FloatBuffer
    
    // Model matrices for each point
    private val modelMatrices = Array(4) { FloatArray(16) }
    private val scratchMatrix = FloatArray(16)
    
    // Config
    var enabled: Boolean = true
    private var nightModeValid: Boolean = false
    private val color = floatArrayOf(1f, 1f, 1f, 1f)
    
    init {
        initBuffers()
    }

    private fun initBuffers() {
        // Quad vertices (centered at 0,0) wide enough to show text
        // Billboard size in world units
        val size = 0.15f
        val coords = floatArrayOf(
            -size, -size, 0f,
             size, -size, 0f,
            -size,  size, 0f,
             size,  size, 0f
        )
        
        // Texture coordinates (UV flipped vertically for GL)
        val texCoords = floatArrayOf(
            0f, 1f,
            1f, 1f,
            0f, 0f,
            1f, 0f
        )
        
        vertexBuffer = ByteBuffer.allocateDirect(coords.size * 4)
            .order(ByteOrder.nativeOrder()).asFloatBuffer()
        vertexBuffer.put(coords).position(0)
        
        texCoordBuffer = ByteBuffer.allocateDirect(texCoords.size * 4)
            .order(ByteOrder.nativeOrder()).asFloatBuffer()
        texCoordBuffer.put(texCoords).position(0)
    }

    fun init() {
        val vertexShader = loadShader(GLES30.GL_VERTEX_SHADER, VERTEX_SHADER_CODE)
        val fragmentShader = loadShader(GLES30.GL_FRAGMENT_SHADER, FRAGMENT_SHADER_CODE)
        
        programId = GLES30.glCreateProgram().also {
            GLES30.glAttachShader(it, vertexShader)
            GLES30.glAttachShader(it, fragmentShader)
            GLES30.glLinkProgram(it)
        }
        
        uMvpMatrixHandle = GLES30.glGetUniformLocation(programId, "uMvpMatrix")
        uTextureHandle = GLES30.glGetUniformLocation(programId, "uTexture")
        uColorHandle = GLES30.glGetUniformLocation(programId, "uColor")
        positionHandle = GLES30.glGetAttribLocation(programId, "aPosition")
        texCoordHandle = GLES30.glGetAttribLocation(programId, "aTexCoord")
        
        initTextures()
        updateModelMatrices()
    }
    
    private fun initTextures() {
        GLES30.glGenTextures(4, textures, 0)
        
        for (i in textureIds.indices) {
            val bitmap = GLTextTextureGenerator.generateCardinalPointBitmap(textureIds[i])
            
            GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textures[i])
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MIN_FILTER, GLES30.GL_LINEAR)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MAG_FILTER, GLES30.GL_LINEAR)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_S, GLES30.GL_CLAMP_TO_EDGE)
            GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_T, GLES30.GL_CLAMP_TO_EDGE)
            
            GLUtils.texImage2D(GLES30.GL_TEXTURE_2D, 0, bitmap, 0)
            bitmap.recycle()
        }
    }
    
    /**
     * Pre-calculate positions for N, S, E, W
     * We want them on the horizon (Y=0 in some coords, but let's stick to standard GL)
     * 
     * In our View space (before LST/Lat rotation, just looking at sphere):
     * View is inside sphere.
     * We want to place these fixed to the azimuth.
     * 
     * N = Az 180 = +Z (in our coordinate mapping from earlier)
     * S = Az 0 = -Z
     * E = Az 270 = +X
     * W = Az 90 = -X
     */
    private fun updateModelMatrices() {
        // North (180 deg) -> +Z
        setPosition(0, 0f, 180f)
        
        // S (0): x=0, z=-1
        setPosition(1, 0f, 0f)
        
        // E (270): x=1, z=0
        setPosition(2, 0f, 270f)
        
        // W (90): x=-1, z=0
        setPosition(3, 0f, 90f)
    }
    
    private fun setPosition(index: Int, alt: Float, az: Float) {
        val dist = 5.0f // Distance from camera
        val altRad = Math.toRadians(2.0) // Fixed 2 degree altitude
        val azRad = Math.toRadians(az.toDouble())
        
        val x = (-sin(azRad) * cos(altRad)).toFloat() * dist
        val y = sin(altRad).toFloat() * dist
        val z = (-cos(azRad) * cos(altRad)).toFloat() * dist
        
        Matrix.setIdentityM(modelMatrices[index], 0)
        Matrix.translateM(modelMatrices[index], 0, x, y, z)
        
        // Billboard rotation: Make text face the center (camera)
        // Simple LookAt logic or just rotate by -Azimuth
        Matrix.rotateM(modelMatrices[index], 0, -az, 0f, 1f, 0f)
    }
    
    /**
     * IMPORTANT: We must render these using a View Matrix that ONLY has Camera Rotation.
     * We MUST NOT apply LST or Latitude rotation, because Cardinal Points are fixed to the GROUND.
     */
    fun draw(viewMatrix: FloatArray, projectionMatrix: FloatArray, camAzimuth: Float, camAltitude: Float) {
        if (!enabled) return
        
        GLES30.glUseProgram(programId)
        
        // Disable depth testing so cardinal points render as overlay and don't affect other objects
        GLES30.glDisable(GLES30.GL_DEPTH_TEST)
        
        // Enable blending
        GLES30.glEnable(GLES30.GL_BLEND)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        
        // Construct a "Ground-Fixed" View Matrix
        // This cancels out the stars' celestial rotation so these stick to the horizon
        // It should match the user's camera direction exactly.
        val groundViewMatrix = FloatArray(16)
        Matrix.setIdentityM(groundViewMatrix, 0)
        // Apply camera pitch (altitude)
        Matrix.rotateM(groundViewMatrix, 0, -camAltitude, 1f, 0f, 0f)
        // Apply camera yaw (azimuth)
        Matrix.rotateM(groundViewMatrix, 0, -camAzimuth, 0f, 1f, 0f)
        
        // Set color (support night mode)
        GLES30.glUniform4f(uColorHandle, color[0], color[1], color[2], color[3])
        GLES30.glUniform1i(uTextureHandle, 0)
        
        GLES30.glEnableVertexAttribArray(positionHandle)
        GLES30.glEnableVertexAttribArray(texCoordHandle)
        
        GLES30.glVertexAttribPointer(positionHandle, 3, GLES30.GL_FLOAT, false, 0, vertexBuffer)
        GLES30.glVertexAttribPointer(texCoordHandle, 2, GLES30.GL_FLOAT, false, 0, texCoordBuffer)
        
        for (i in 0 until 4) {
            // MVP = Projection * View * Model
            Matrix.multiplyMM(scratchMatrix, 0, groundViewMatrix, 0, modelMatrices[i], 0)
            Matrix.multiplyMM(scratchMatrix, 0, projectionMatrix, 0, scratchMatrix, 0)
            
            GLES30.glUniformMatrix4fv(uMvpMatrixHandle, 1, false, scratchMatrix, 0)
            
            GLES30.glActiveTexture(GLES30.GL_TEXTURE0)
            GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textures[i])
            
            GLES30.glDrawArrays(GLES30.GL_TRIANGLE_STRIP, 0, 4)
        }
        
        GLES30.glDisableVertexAttribArray(positionHandle)
        GLES30.glDisableVertexAttribArray(texCoordHandle)
        
        // Restore depth testing for subsequent render passes
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)
    }

    fun setNightMode(mode: String) {
        when (mode.lowercase()) {
            "red" -> {
                color[0] = 1f; color[1] = 0f; color[2] = 0f; color[3] = 0.8f
            }
            "dim" -> {
                color[0] = 0.5f; color[1] = 0.5f; color[2] = 0.5f; color[3] = 0.6f
            }
            else -> {
                color[0] = 1f; color[1] = 1f; color[2] = 1f; color[3] = 1f
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
        private const val VERTEX_SHADER_CODE = """
            uniform mat4 uMvpMatrix;
            attribute vec4 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            void main() {
                gl_Position = uMvpMatrix * aPosition;
                vTexCoord = aTexCoord;
            }
        """

        private const val FRAGMENT_SHADER_CODE = """
            precision mediump float;
            uniform sampler2D uTexture;
            uniform vec4 uColor;
            varying vec2 vTexCoord;
            void main() {
                vec4 texColor = texture2D(uTexture, vTexCoord);
                if (texColor.a < 0.1) discard;
                // Tint the texture with uColor
                gl_FragColor = texColor * uColor;
            }
        """
    }
}
