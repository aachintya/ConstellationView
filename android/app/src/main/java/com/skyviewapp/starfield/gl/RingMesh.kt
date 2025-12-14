package com.skyviewapp.starfield.gl

import android.opengl.GLES30
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import kotlin.math.cos
import kotlin.math.sin

/**
 * Ring mesh for Saturn's rings - a flat disc with inner and outer radius
 */
class RingMesh(
    private val innerRadius: Float = 1.2f,
    private val outerRadius: Float = 2.3f,
    private val segments: Int = 64
) {
    companion object {
        private const val BYTES_PER_FLOAT = 4
        // Position(3) + TexCoord(2) = 5 floats per vertex
        private const val FLOATS_PER_VERTEX = 5
        private const val STRIDE = FLOATS_PER_VERTEX * BYTES_PER_FLOAT
    }

    private var vboId = 0
    private var vaoId = 0
    private var vertexCount = 0
    private var isInitialized = false

    fun initialize() {
        val vaoIds = IntArray(1)
        GLES30.glGenVertexArrays(1, vaoIds, 0)
        vaoId = vaoIds[0]

        val bufferIds = IntArray(1)
        GLES30.glGenBuffers(1, bufferIds, 0)
        vboId = bufferIds[0]

        generateRing()
        isInitialized = true
    }

    private fun generateRing() {
        val vertices = mutableListOf<Float>()

        // Generate ring as triangle strip
        for (i in 0..segments) {
            val angle = (i.toFloat() / segments) * 2.0f * Math.PI.toFloat()
            val cosA = cos(angle)
            val sinA = sin(angle)

            // Outer vertex
            vertices.add(cosA * outerRadius)
            vertices.add(0f)  // Y = 0 (flat ring)
            vertices.add(sinA * outerRadius)
            vertices.add(i.toFloat() / segments)  // U
            vertices.add(1f)  // V (outer)

            // Inner vertex
            vertices.add(cosA * innerRadius)
            vertices.add(0f)
            vertices.add(sinA * innerRadius)
            vertices.add(i.toFloat() / segments)  // U
            vertices.add(0f)  // V (inner)
        }

        vertexCount = (segments + 1) * 2

        val vertexBuffer: FloatBuffer = ByteBuffer
            .allocateDirect(vertices.size * BYTES_PER_FLOAT)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(vertices.toFloatArray())
        vertexBuffer.position(0)

        GLES30.glBindVertexArray(vaoId)
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, vboId)
        GLES30.glBufferData(
            GLES30.GL_ARRAY_BUFFER,
            vertices.size * BYTES_PER_FLOAT,
            vertexBuffer,
            GLES30.GL_STATIC_DRAW
        )

        // Position attribute (location 0)
        GLES30.glVertexAttribPointer(0, 3, GLES30.GL_FLOAT, false, STRIDE, 0)
        GLES30.glEnableVertexAttribArray(0)

        // TexCoord attribute (location 1)
        GLES30.glVertexAttribPointer(1, 2, GLES30.GL_FLOAT, false, STRIDE, 3 * BYTES_PER_FLOAT)
        GLES30.glEnableVertexAttribArray(1)

        GLES30.glBindVertexArray(0)
    }

    fun draw() {
        if (!isInitialized) return
        GLES30.glBindVertexArray(vaoId)
        GLES30.glDrawArrays(GLES30.GL_TRIANGLE_STRIP, 0, vertexCount)
        GLES30.glBindVertexArray(0)
    }

    fun destroy() {
        if (vaoId != 0) {
            GLES30.glDeleteVertexArrays(1, intArrayOf(vaoId), 0)
            vaoId = 0
        }
        if (vboId != 0) {
            GLES30.glDeleteBuffers(1, intArrayOf(vboId), 0)
            vboId = 0
        }
        isInitialized = false
    }
}
