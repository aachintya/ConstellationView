package com.skyviewapp.starfield.gl

import android.opengl.GLES30
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * GPU buffer for star point sprite rendering
 * Each star vertex contains: position (x,y,z), magnitude, color (r,g,b)
 * Total: 7 floats per star
 */
class StarBuffer {
    companion object {
        private const val FLOATS_PER_VERTEX = 7 // x, y, z, magnitude, r, g, b
        private const val BYTES_PER_FLOAT = 4
        private const val STRIDE = FLOATS_PER_VERTEX * BYTES_PER_FLOAT
    }

    private var vboId = 0
    private var vaoId = 0
    private var starCount = 0
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
     * Upload star data to GPU
     * @param stars List of star data arrays: [x, y, z, magnitude, r, g, b]
     */
    fun uploadData(starData: FloatArray, count: Int) {
        if (!isInitialized) return

        starCount = count

        // Create float buffer
        val buffer: FloatBuffer = ByteBuffer
            .allocateDirect(starData.size * BYTES_PER_FLOAT)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(starData)
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
        GLES30.glVertexAttribPointer(0, 3, GLES30.GL_FLOAT, false, STRIDE, 0)

        // Magnitude (location = 1)
        GLES30.glEnableVertexAttribArray(1)
        GLES30.glVertexAttribPointer(1, 1, GLES30.GL_FLOAT, false, STRIDE, 3 * BYTES_PER_FLOAT)

        // Color (location = 2)
        GLES30.glEnableVertexAttribArray(2)
        GLES30.glVertexAttribPointer(2, 3, GLES30.GL_FLOAT, false, STRIDE, 4 * BYTES_PER_FLOAT)

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
        if (starCount > 0) {
            bind()
            GLES30.glDrawArrays(GLES30.GL_POINTS, 0, starCount)
            unbind()
        }
    }

    fun getStarCount(): Int = starCount

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
