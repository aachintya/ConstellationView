package com.skyviewapp.starfield.gl

import android.opengl.GLES30
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.nio.ShortBuffer
import kotlin.math.cos
import kotlin.math.sin

/**
 * Reusable sphere mesh for planet rendering (~600 triangles)
 * Generated as a UV sphere with positions, normals, and texture coordinates
 */
class SphereMesh(
    private val latitudeBands: Int = 20,
    private val longitudeBands: Int = 30
) {
    companion object {
        private const val BYTES_PER_FLOAT = 4
        private const val BYTES_PER_SHORT = 2
        // Position(3) + Normal(3) + TexCoord(2) = 8 floats per vertex
        private const val FLOATS_PER_VERTEX = 8
        private const val STRIDE = FLOATS_PER_VERTEX * BYTES_PER_FLOAT
    }

    private var vboId = 0
    private var iboId = 0  // Index buffer
    private var vaoId = 0
    private var indexCount = 0
    private var isInitialized = false

    fun initialize() {
        // Generate VAO
        val vaoIds = IntArray(1)
        GLES30.glGenVertexArrays(1, vaoIds, 0)
        vaoId = vaoIds[0]

        // Generate VBO and IBO
        val bufferIds = IntArray(2)
        GLES30.glGenBuffers(2, bufferIds, 0)
        vboId = bufferIds[0]
        iboId = bufferIds[1]

        // Generate sphere geometry
        generateSphere()

        isInitialized = true
    }

    private fun generateSphere() {
        val vertices = mutableListOf<Float>()
        val indices = mutableListOf<Short>()

        // Generate vertices
        for (lat in 0..latitudeBands) {
            val theta = lat * Math.PI / latitudeBands
            val sinTheta = sin(theta).toFloat()
            val cosTheta = cos(theta).toFloat()

            for (lon in 0..longitudeBands) {
                val phi = lon * 2 * Math.PI / longitudeBands
                val sinPhi = sin(phi).toFloat()
                val cosPhi = cos(phi).toFloat()

                // Position (already normalized to unit sphere)
                val x = cosPhi * sinTheta
                val y = cosTheta
                val z = sinPhi * sinTheta

                // Normal (same as position for unit sphere)
                val nx = x
                val ny = y
                val nz = z

                // Texture coordinates
                val u = 1.0f - (lon.toFloat() / longitudeBands)
                val v = 1.0f - (lat.toFloat() / latitudeBands)

                // Add vertex data
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
        for (lat in 0 until latitudeBands) {
            for (lon in 0 until longitudeBands) {
                val first = (lat * (longitudeBands + 1) + lon).toShort()
                val second = (first + longitudeBands + 1).toShort()

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

        indexCount = indices.size

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
        GLES30.glBindVertexArray(vaoId)

        // Upload vertex data
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, vboId)
        GLES30.glBufferData(
            GLES30.GL_ARRAY_BUFFER,
            vertexBuffer.capacity() * BYTES_PER_FLOAT,
            vertexBuffer,
            GLES30.GL_STATIC_DRAW
        )

        // Upload index data
        GLES30.glBindBuffer(GLES30.GL_ELEMENT_ARRAY_BUFFER, iboId)
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

        // Unbind (keep IBO bound to VAO)
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, 0)
        GLES30.glBindVertexArray(0)
    }

    fun bind() {
        GLES30.glBindVertexArray(vaoId)
    }

    fun unbind() {
        GLES30.glBindVertexArray(0)
    }

    fun draw() {
        if (indexCount > 0) {
            bind()
            GLES30.glDrawElements(GLES30.GL_TRIANGLES, indexCount, GLES30.GL_UNSIGNED_SHORT, 0)
            unbind()
        }
    }

    fun getTriangleCount(): Int = indexCount / 3

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
