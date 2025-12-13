package com.skyviewapp.starfield.gl

import android.opengl.GLES30
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * GPU buffer for constellation line rendering
 * Each line vertex contains: position (x,y,z)
 */
class LineBuffer {
    companion object {
        private const val FLOATS_PER_VERTEX = 3 // x, y, z
        private const val BYTES_PER_FLOAT = 4
    }

    private var vboId = 0
    private var vaoId = 0
    private var vertexCount = 0
    private var isInitialized = false

    fun initialize() {
        // Generate VAO
        val vaoIds = IntArray(1)
        GLES30.glGenVertexArrays(1, vaoIds, 0)
        vaoId = vaoIds[0]

        // Generate VBO
        val vboIds = IntArray(1)
        GLES30.glGenBuffers(1, vboIds, 0)
        vboId = vboIds[0]

        isInitialized = true
    }

    /**
     * Upload line vertex data to GPU
     * Each pair of vertices forms a line segment
     * @param lineData Flat array of [x1,y1,z1, x2,y2,z2, ...]
     * @param count Number of vertices (not lines)
     */
    fun uploadData(lineData: FloatArray, count: Int) {
        if (!isInitialized || lineData.isEmpty()) return

        vertexCount = count

        // Create float buffer
        val buffer: FloatBuffer = ByteBuffer
            .allocateDirect(lineData.size * BYTES_PER_FLOAT)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(lineData)
        buffer.position(0)

        // Bind VAO
        GLES30.glBindVertexArray(vaoId)

        // Upload to VBO
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, vboId)
        GLES30.glBufferData(
            GLES30.GL_ARRAY_BUFFER,
            buffer.capacity() * BYTES_PER_FLOAT,
            buffer,
            GLES30.GL_DYNAMIC_DRAW
        )

        // Set up vertex attributes
        // Position (location = 0)
        GLES30.glEnableVertexAttribArray(0)
        GLES30.glVertexAttribPointer(0, 3, GLES30.GL_FLOAT, false, FLOATS_PER_VERTEX * BYTES_PER_FLOAT, 0)

        // Unbind
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
        if (vertexCount > 0) {
            bind()
            GLES30.glLineWidth(2.0f)
            GLES30.glDrawArrays(GLES30.GL_LINES, 0, vertexCount)
            unbind()
        }
    }

    fun getVertexCount(): Int = vertexCount

    fun delete() {
        if (vboId != 0) {
            GLES30.glDeleteBuffers(1, intArrayOf(vboId), 0)
            vboId = 0
        }
        if (vaoId != 0) {
            GLES30.glDeleteVertexArrays(1, intArrayOf(vaoId), 0)
            vaoId = 0
        }
        isInitialized = false
    }
}
