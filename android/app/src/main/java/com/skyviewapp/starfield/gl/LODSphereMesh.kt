package com.skyviewapp.starfield.gl

import android.opengl.GLES30
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.ShortBuffer
import kotlin.math.cos
import kotlin.math.sin

/**
 * Level-of-Detail Sphere Mesh system for planet rendering
 * 
 * Provides multiple resolution sphere meshes:
 * - LOW: 8x12 bands (~192 triangles) - for distant planets/point mode
 * - MEDIUM: 20x30 bands (~600 triangles) - standard view
 * - HIGH: 48x72 bands (~3,456 triangles) - close zoom
 * - ULTRA: 64x96 bands (~6,144 triangles) - extreme zoom detail
 */
class LODSphereMesh {
    companion object {
        private const val BYTES_PER_FLOAT = 4
        private const val BYTES_PER_SHORT = 2
        private const val FLOATS_PER_VERTEX = 8  // Position(3) + Normal(3) + TexCoord(2)
        private const val STRIDE = FLOATS_PER_VERTEX * BYTES_PER_FLOAT
    }

    enum class LODLevel(val latBands: Int, val lonBands: Int) {
        LOW(8, 12),         // For distant view / point mode transition
        MEDIUM(20, 30),     // Standard viewing
        HIGH(48, 72),       // Close zoom
        ULTRA(64, 96)       // Extreme zoom - full detail
    }

    // One VAO/VBO/IBO per LOD level
    private val vaoIds = IntArray(LODLevel.entries.size)
    private val vboIds = IntArray(LODLevel.entries.size)
    private val iboIds = IntArray(LODLevel.entries.size)
    private val indexCounts = IntArray(LODLevel.entries.size)
    
    private var isInitialized = false
    private var currentLOD = LODLevel.MEDIUM

    fun initialize() {
        if (isInitialized) return
        
        // Generate all VAOs and buffers
        GLES30.glGenVertexArrays(LODLevel.entries.size, vaoIds, 0)
        GLES30.glGenBuffers(LODLevel.entries.size, vboIds, 0)
        GLES30.glGenBuffers(LODLevel.entries.size, iboIds, 0)
        
        // Generate geometry for each LOD level
        for ((index, level) in LODLevel.entries.withIndex()) {
            generateSphereForLOD(index, level.latBands, level.lonBands)
        }
        
        isInitialized = true
    }

    private fun generateSphereForLOD(lodIndex: Int, latBands: Int, lonBands: Int) {
        val vertices = mutableListOf<Float>()
        val indices = mutableListOf<Short>()

        // Generate vertices
        for (lat in 0..latBands) {
            val theta = lat * Math.PI / latBands
            val sinTheta = sin(theta).toFloat()
            val cosTheta = cos(theta).toFloat()

            for (lon in 0..lonBands) {
                val phi = lon * 2 * Math.PI / lonBands
                val sinPhi = sin(phi).toFloat()
                val cosPhi = cos(phi).toFloat()

                // Position (unit sphere)
                val x = cosPhi * sinTheta
                val y = cosTheta
                val z = sinPhi * sinTheta

                // Normal (same as position for unit sphere)
                val nx = x
                val ny = y
                val nz = z

                // Texture coordinates
                val u = 1.0f - (lon.toFloat() / lonBands)
                val v = 1.0f - (lat.toFloat() / latBands)

                vertices.add(x)
                vertices.add(y)
                vertices.add(z)
                vertices.add(nx)
                vertices.add(ny)
                vertices.add(nz)
                vertices.add(u)
                vertices.add(v)
            }
        }

        // Generate indices
        for (lat in 0 until latBands) {
            for (lon in 0 until lonBands) {
                val first = (lat * (lonBands + 1) + lon).toShort()
                val second = (first + lonBands + 1).toShort()

                // First triangle
                indices.add(first)
                indices.add(second)
                indices.add((first + 1).toShort())

                // Second triangle
                indices.add(second)
                indices.add((second + 1).toShort())
                indices.add((first + 1).toShort())
            }
        }

        indexCounts[lodIndex] = indices.size

        // Create vertex buffer
        val vertexArray = vertices.toFloatArray()
        val vertexBuffer: FloatBuffer = ByteBuffer
            .allocateDirect(vertexArray.size * BYTES_PER_FLOAT)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(vertexArray)
        vertexBuffer.position(0)

        // Create index buffer
        val indexArray = indices.toShortArray()
        val indexBuffer: ShortBuffer = ByteBuffer
            .allocateDirect(indexArray.size * BYTES_PER_SHORT)
            .order(ByteOrder.nativeOrder())
            .asShortBuffer()
            .put(indexArray)
        indexBuffer.position(0)

        // Bind VAO
        GLES30.glBindVertexArray(vaoIds[lodIndex])

        // Upload vertex data
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, vboIds[lodIndex])
        GLES30.glBufferData(
            GLES30.GL_ARRAY_BUFFER,
            vertexBuffer.capacity() * BYTES_PER_FLOAT,
            vertexBuffer,
            GLES30.GL_STATIC_DRAW
        )

        // Upload index data
        GLES30.glBindBuffer(GLES30.GL_ELEMENT_ARRAY_BUFFER, iboIds[lodIndex])
        GLES30.glBufferData(
            GLES30.GL_ELEMENT_ARRAY_BUFFER,
            indexBuffer.capacity() * BYTES_PER_SHORT,
            indexBuffer,
            GLES30.GL_STATIC_DRAW
        )

        // Set up vertex attributes
        // Position (location = 0)
        GLES30.glEnableVertexAttribArray(0)
        GLES30.glVertexAttribPointer(0, 3, GLES30.GL_FLOAT, false, STRIDE, 0)

        // Normal (location = 1)
        GLES30.glEnableVertexAttribArray(1)
        GLES30.glVertexAttribPointer(1, 3, GLES30.GL_FLOAT, false, STRIDE, 3 * BYTES_PER_FLOAT)

        // TexCoord (location = 2)
        GLES30.glEnableVertexAttribArray(2)
        GLES30.glVertexAttribPointer(2, 2, GLES30.GL_FLOAT, false, STRIDE, 6 * BYTES_PER_FLOAT)

        // Unbind
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, 0)
        GLES30.glBindVertexArray(0)
    }

    /**
     * Select appropriate LOD level based on FOV and whether planet is focused
     * @param fov Current field of view in degrees
     * @param isPlanetFocused Whether this planet is the focus of the view
     * @return The LOD level to use
     */
    fun selectLOD(fov: Float, isPlanetFocused: Boolean = false): LODLevel {
        return when {
            fov <= 0.1f -> LODLevel.ULTRA    // Extreme zoom - max detail
            fov <= 0.5f -> LODLevel.HIGH     // Close zoom
            fov <= 5f -> LODLevel.MEDIUM     // Normal view
            else -> LODLevel.LOW             // Wide view - minimal detail
        }
    }

    /**
     * Draw sphere at specified LOD level
     */
    fun draw(level: LODLevel) {
        val lodIndex = level.ordinal
        if (indexCounts[lodIndex] > 0) {
            GLES30.glBindVertexArray(vaoIds[lodIndex])
            GLES30.glDrawElements(GLES30.GL_TRIANGLES, indexCounts[lodIndex], GLES30.GL_UNSIGNED_SHORT, 0)
            GLES30.glBindVertexArray(0)
        }
    }

    /**
     * Draw sphere, automatically selecting LOD based on FOV
     */
    fun drawWithLOD(fov: Float, isPlanetFocused: Boolean = false) {
        val level = selectLOD(fov, isPlanetFocused)
        draw(level)
    }

    fun getTriangleCount(level: LODLevel): Int = indexCounts[level.ordinal] / 3

    fun delete() {
        if (!isInitialized) return
        
        GLES30.glDeleteBuffers(LODLevel.entries.size, vboIds, 0)
        GLES30.glDeleteBuffers(LODLevel.entries.size, iboIds, 0)
        GLES30.glDeleteVertexArrays(LODLevel.entries.size, vaoIds, 0)
        
        for (i in vaoIds.indices) {
            vaoIds[i] = 0
            vboIds[i] = 0
            iboIds[i] = 0
            indexCounts[i] = 0
        }
        
        isInitialized = false
    }
}


