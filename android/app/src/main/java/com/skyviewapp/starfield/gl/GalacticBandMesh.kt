package com.skyviewapp.starfield.gl

import android.opengl.GLES30
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.ShortBuffer
import kotlin.math.cos
import kotlin.math.sin

/**
 * Cylindrical band mesh for Milky Way rendering
 * Maps texture only around the galactic plane, not the entire sphere
 * This prevents stretching of the band image
 */
class GalacticBandMesh(
    private val segments: Int = 64,      // Horizontal segments around the band
    private val heightSegments: Int = 4, // Vertical segments (few needed for band)
    private val bandHeight: Float = 0.4f // Height of band as fraction of hemisphere (0.4 = ~36 degrees)
) {
    companion object {
        private const val BYTES_PER_FLOAT = 4
        private const val BYTES_PER_SHORT = 2
        // Position(3) + TexCoord(2) = 5 floats per vertex
        private const val FLOATS_PER_VERTEX = 5
        private const val STRIDE = FLOATS_PER_VERTEX * BYTES_PER_FLOAT
    }

    private var vboId = 0
    private var iboId = 0
    private var vaoId = 0
    private var indexCount = 0
    private var isInitialized = false

    fun initialize() {
        val vaoIds = IntArray(1)
        GLES30.glGenVertexArrays(1, vaoIds, 0)
        vaoId = vaoIds[0]

        val bufferIds = IntArray(2)
        GLES30.glGenBuffers(2, bufferIds, 0)
        vboId = bufferIds[0]
        iboId = bufferIds[1]

        generateBand()
        isInitialized = true
    }

    private fun generateBand() {
        val vertices = mutableListOf<Float>()
        val indices = mutableListOf<Short>()

        // Galactic center is around RA ~266° = 17.7h
        // The band tilts about 62.6° to the celestial equator
        val galacticTilt = Math.toRadians(62.6)
        val galacticCenterRA = Math.toRadians(266.0)
        
        // Generate a cylindrical band that follows the galactic plane
        for (h in 0..heightSegments) {
            // v goes from 0 to 1 across the band height
            val v = h.toFloat() / heightSegments
            // Map v to a vertical angle centered on galactic equator
            val latAngle = (v - 0.5f) * bandHeight * Math.PI
            
            for (s in 0..segments) {
                // u goes around the galactic longitude
                val u = s.toFloat() / segments
                val lonAngle = u * 2.0 * Math.PI
                
                // Position on unit sphere in galactic coordinates
                val cosLat = cos(latAngle)
                val sinLat = sin(latAngle)
                val cosLon = cos(lonAngle)
                val sinLon = sin(lonAngle)
                
                // Galactic coordinates
                val gx = cosLat * cosLon
                val gy = cosLat * sinLon
                val gz = sinLat
                
                // Rotate from galactic to equatorial coordinates
                // First rotate around X by galactic tilt
                val cosT = cos(galacticTilt)
                val sinT = sin(galacticTilt)
                val ex = gx
                val ey = gy * cosT - gz * sinT
                val ez = gy * sinT + gz * cosT
                
                // Then rotate around Z by galactic center RA
                val cosRA = cos(galacticCenterRA)
                val sinRA = sin(galacticCenterRA)
                val x = ex * cosRA - ey * sinRA
                val y = ex * sinRA + ey * cosRA
                val z = ez
                
                // Add vertex: position (x, y, z) + texcoord (u, v)
                vertices.add(x.toFloat())
                vertices.add(y.toFloat())
                vertices.add(z.toFloat())
                vertices.add(1f - u)  // Flip U for correct texture orientation
                vertices.add(v)
            }
        }

        // Generate indices for triangle strips
        for (h in 0 until heightSegments) {
            for (s in 0 until segments) {
                val first = (h * (segments + 1) + s).toShort()
                val second = (first + segments + 1).toShort()

                indices.add(first)
                indices.add(second)
                indices.add((first + 1).toShort())

                indices.add(second)
                indices.add((second + 1).toShort())
                indices.add((first + 1).toShort())
            }
        }

        indexCount = indices.size

        // Create and upload buffers
        val vertexArray = vertices.toFloatArray()
        val vertexBuffer: FloatBuffer = ByteBuffer
            .allocateDirect(vertexArray.size * BYTES_PER_FLOAT)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(vertexArray)
        vertexBuffer.position(0)

        val indexArray = indices.toShortArray()
        val indexBuffer: ShortBuffer = ByteBuffer
            .allocateDirect(indexArray.size * BYTES_PER_SHORT)
            .order(ByteOrder.nativeOrder())
            .asShortBuffer()
            .put(indexArray)
        indexBuffer.position(0)

        GLES30.glBindVertexArray(vaoId)

        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, vboId)
        GLES30.glBufferData(
            GLES30.GL_ARRAY_BUFFER,
            vertexBuffer.capacity() * BYTES_PER_FLOAT,
            vertexBuffer,
            GLES30.GL_STATIC_DRAW
        )

        GLES30.glBindBuffer(GLES30.GL_ELEMENT_ARRAY_BUFFER, iboId)
        GLES30.glBufferData(
            GLES30.GL_ELEMENT_ARRAY_BUFFER,
            indexBuffer.capacity() * BYTES_PER_SHORT,
            indexBuffer,
            GLES30.GL_STATIC_DRAW
        )

        // Position (location = 0)
        GLES30.glEnableVertexAttribArray(0)
        GLES30.glVertexAttribPointer(0, 3, GLES30.GL_FLOAT, false, STRIDE, 0)

        // TexCoord (location = 1)
        GLES30.glEnableVertexAttribArray(1)
        GLES30.glVertexAttribPointer(1, 2, GLES30.GL_FLOAT, false, STRIDE, 3 * BYTES_PER_FLOAT)

        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, 0)
        GLES30.glBindVertexArray(0)
    }

    fun draw() {
        if (indexCount > 0) {
            GLES30.glBindVertexArray(vaoId)
            GLES30.glDrawElements(GLES30.GL_TRIANGLES, indexCount, GLES30.GL_UNSIGNED_SHORT, 0)
            GLES30.glBindVertexArray(0)
        }
    }

    fun delete() {
        if (vboId != 0) {
            GLES30.glDeleteBuffers(1, intArrayOf(vboId), 0)
            vboId = 0
        }
        if (iboId != 0) {
            GLES30.glDeleteBuffers(1, intArrayOf(iboId), 0)
            iboId = 0
        }
        if (vaoId != 0) {
            GLES30.glDeleteVertexArrays(1, intArrayOf(vaoId), 0)
            vaoId = 0
        }
        isInitialized = false
    }
}
