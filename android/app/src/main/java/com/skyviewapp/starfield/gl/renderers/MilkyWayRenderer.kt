package com.skyviewapp.starfield.gl.renderers

import android.opengl.GLES30
import android.opengl.Matrix
import com.skyviewapp.starfield.gl.GLTextureLoader
import com.skyviewapp.starfield.gl.ShaderProgram
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * Renders the Milky Way background as an equirectangular sphere
 * Uses the Stellarium milkyway.png texture with blue tinting applied in shader
 */
class MilkyWayRenderer {
    companion object {
        private const val TAG = "MilkyWayRenderer"
        
        // Sphere resolution
        private const val LATITUDE_BANDS = 40
        private const val LONGITUDE_BANDS = 80
    }
    
    private var vertexBuffer: FloatBuffer? = null
    private var textureCoordBuffer: FloatBuffer? = null
    private var indexBuffer: java.nio.ShortBuffer? = null
    private var indexCount = 0
    
    private val modelMatrix = FloatArray(16)
    private val mvpMatrix = FloatArray(16)
    
    private var textureId = 0
    private var isInitialized = false
    
    // Visibility flag - always true by default, independent of constellation toggles
    var showMilkyWay = true
    
    /**
     * Initialize the sphere mesh and load texture
     */
    fun initialize(textureLoader: GLTextureLoader) {
        createSphereMesh()
        textureId = textureLoader.loadTextureFromAssets("milkyway.png")
        isInitialized = textureId != 0
        
        if (!isInitialized) {
            android.util.Log.e(TAG, "Failed to load milkyway.png texture")
        } else {
            android.util.Log.d(TAG, "Milky Way texture loaded successfully: $textureId")
        }
    }
    
    /**
     * Create a sphere mesh for equirectangular projection
     */
    private fun createSphereMesh() {
        val vertices = mutableListOf<Float>()
        val texCoords = mutableListOf<Float>()
        val indices = mutableListOf<Short>()
        
        // Generate sphere vertices
        for (lat in 0..LATITUDE_BANDS) {
            val theta = lat * Math.PI / LATITUDE_BANDS
            val sinTheta = Math.sin(theta).toFloat()
            val cosTheta = Math.cos(theta).toFloat()
            
            for (lon in 0..LONGITUDE_BANDS) {
                val phi = lon * 2 * Math.PI / LONGITUDE_BANDS
                val sinPhi = Math.sin(phi).toFloat()
                val cosPhi = Math.cos(phi).toFloat()
                
                // Position on unit sphere (inverted for inside view)
                val x = -cosPhi * sinTheta
                val y = cosTheta
                val z = sinPhi * sinTheta
                
                vertices.add(x * 50f)  // Scale to large radius
                vertices.add(y * 50f)
                vertices.add(z * 50f)
                
                // Texture coordinates (equirectangular mapping)
                val u = 1.0f - (lon.toFloat() / LONGITUDE_BANDS)
                val v = 1.0f - (lat.toFloat() / LATITUDE_BANDS)
                texCoords.add(u)
                texCoords.add(v)
            }
        }
        
        // Generate indices
        for (lat in 0 until LATITUDE_BANDS) {
            for (lon in 0 until LONGITUDE_BANDS) {
                val first = (lat * (LONGITUDE_BANDS + 1) + lon).toShort()
                val second = (first + LONGITUDE_BANDS + 1).toShort()
                
                indices.add(first)
                indices.add(second)
                indices.add((first + 1).toShort())
                
                indices.add(second)
                indices.add((second + 1).toShort())
                indices.add((first + 1).toShort())
            }
        }
        
        indexCount = indices.size
        
        // Create buffers
        vertexBuffer = ByteBuffer.allocateDirect(vertices.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .apply {
                put(vertices.toFloatArray())
                position(0)
            }
        
        textureCoordBuffer = ByteBuffer.allocateDirect(texCoords.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .apply {
                put(texCoords.toFloatArray())
                position(0)
            }
        
        indexBuffer = ByteBuffer.allocateDirect(indices.size * 2)
            .order(ByteOrder.nativeOrder())
            .asShortBuffer()
            .apply {
                put(indices.toShortArray())
                position(0)
            }
    }
    
    /**
     * Render the Milky Way
     */
    fun render(
        shader: ShaderProgram?,
        vpMatrix: FloatArray,
        brightness: Float = 0.5f,
        nightModeIntensity: Float = 0f
    ) {
        if (!showMilkyWay || !isInitialized || shader == null) return
        
        shader.use()
        
        // Set up model matrix (identity - sphere is already at origin)
        Matrix.setIdentityM(modelMatrix, 0)
        
        // Calculate MVP
        Matrix.multiplyMM(mvpMatrix, 0, vpMatrix, 0, modelMatrix, 0)
        
        // Set uniforms
        shader.setUniformMatrix4fv("u_MVP", mvpMatrix)
        shader.setUniform1f("u_Brightness", brightness)
        shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
        shader.setUniform1i("u_Texture", 0)
        
        // Bind texture
        GLES30.glActiveTexture(GLES30.GL_TEXTURE0)
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textureId)
        
        // Disable depth write (skybox should not affect depth buffer)
        GLES30.glDepthMask(false)
        GLES30.glDisable(GLES30.GL_CULL_FACE)
        
        // Set up vertex attributes
        GLES30.glEnableVertexAttribArray(0)
        GLES30.glEnableVertexAttribArray(1)
        
        GLES30.glVertexAttribPointer(0, 3, GLES30.GL_FLOAT, false, 0, vertexBuffer)
        GLES30.glVertexAttribPointer(1, 2, GLES30.GL_FLOAT, false, 0, textureCoordBuffer)
        
        // Draw
        GLES30.glDrawElements(GLES30.GL_TRIANGLES, indexCount, GLES30.GL_UNSIGNED_SHORT, indexBuffer)
        
        // Cleanup
        GLES30.glDisableVertexAttribArray(0)
        GLES30.glDisableVertexAttribArray(1)
        
        // Restore state
        GLES30.glDepthMask(true)
        GLES30.glEnable(GLES30.GL_CULL_FACE)
    }
}
