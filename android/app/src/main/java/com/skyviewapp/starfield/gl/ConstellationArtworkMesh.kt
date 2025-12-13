package com.skyviewapp.starfield.gl

import android.opengl.GLES30
import android.util.Log
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer

/**
 * OpenGL mesh for rendering constellation artwork as a textured quad
 * anchored to celestial coordinates (like stars on the celestial sphere)
 */
class ConstellationArtworkMesh {
    companion object {
        private const val TAG = "ConstellationArtworkMesh"
        private const val COORDS_PER_VERTEX = 3  // x, y, z
        private const val TEXCOORDS_PER_VERTEX = 2  // u, v
        private const val BYTES_PER_FLOAT = 4
    }

    private var vaoId = 0
    private var positionVboId = 0
    private var texCoordVboId = 0
    private var vertexCount = 0
    private var isInitialized = false

    // Quad vertices (will be updated dynamically based on anchor stars)
    private var positionBuffer: FloatBuffer? = null
    private var texCoordBuffer: FloatBuffer? = null

    /**
     * Initialize OpenGL buffers
     */
    fun initialize() {
        // Generate VAO
        val vaoIds = IntArray(1)
        GLES30.glGenVertexArrays(1, vaoIds, 0)
        vaoId = vaoIds[0]

        // Generate VBOs
        val vboIds = IntArray(2)
        GLES30.glGenBuffers(2, vboIds, 0)
        positionVboId = vboIds[0]
        texCoordVboId = vboIds[1]

        // Allocate buffers for a quad (6 vertices = 2 triangles)
        positionBuffer = ByteBuffer.allocateDirect(6 * COORDS_PER_VERTEX * BYTES_PER_FLOAT)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()

        texCoordBuffer = ByteBuffer.allocateDirect(6 * TEXCOORDS_PER_VERTEX * BYTES_PER_FLOAT)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()

        isInitialized = true
        Log.d(TAG, "ConstellationArtworkMesh initialized")
    }

    /**
     * Update the quad vertices based on 3 anchor star positions
     * Uses affine transformation to map texture coordinates to 3D positions
     * 
     * @param anchor1 First anchor point (3D position on celestial sphere)
     * @param anchor2 Second anchor point
     * @param anchor3 Third anchor point
     * @param texCoord1 Texture coordinate for anchor1 (normalized 0-1)
     * @param texCoord2 Texture coordinate for anchor2
     * @param texCoord3 Texture coordinate for anchor3
     */
    fun updateQuadFromAnchors(
        anchor1: FloatArray, anchor2: FloatArray, anchor3: FloatArray,
        texCoord1: FloatArray, texCoord2: FloatArray, texCoord3: FloatArray
    ) {
        if (!isInitialized) return

        // Calculate the plane defined by the 3 anchor points
        // We need to extrapolate the full quad corners (0,0), (1,0), (1,1), (0,1)
        
        // Build a 2D to 3D affine mapping using the 3 anchors
        // Solve for: P = A + u*(B-A) + v*(C-A) where A,B,C are anchor positions
        // and u,v are barycentric-like coordinates
        
        // For simplicity, we use linear interpolation/extrapolation
        // Calculate basis vectors from texture space to 3D space
        val pos00 = extrapolatePosition(anchor1, anchor2, anchor3, texCoord1, texCoord2, texCoord3, floatArrayOf(0f, 0f))
        val pos10 = extrapolatePosition(anchor1, anchor2, anchor3, texCoord1, texCoord2, texCoord3, floatArrayOf(1f, 0f))
        val pos11 = extrapolatePosition(anchor1, anchor2, anchor3, texCoord1, texCoord2, texCoord3, floatArrayOf(1f, 1f))
        val pos01 = extrapolatePosition(anchor1, anchor2, anchor3, texCoord1, texCoord2, texCoord3, floatArrayOf(0f, 1f))

        // Build 2 triangles (CCW winding)
        // Triangle 1: 00 -> 10 -> 11
        // Triangle 2: 00 -> 11 -> 01
        positionBuffer?.apply {
            clear()
            // Triangle 1
            put(pos00); put(pos10); put(pos11)
            // Triangle 2
            put(pos00); put(pos11); put(pos01)
            flip()
        }

        texCoordBuffer?.apply {
            clear()
            // Triangle 1
            put(0f); put(1f)  // 00 (flip V for OpenGL)
            put(1f); put(1f)  // 10
            put(1f); put(0f)  // 11
            // Triangle 2
            put(0f); put(1f)  // 00
            put(1f); put(0f)  // 11
            put(0f); put(0f)  // 01
            flip()
        }

        vertexCount = 6

        // Upload to GPU
        GLES30.glBindVertexArray(vaoId)

        // Position data
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, positionVboId)
        GLES30.glBufferData(GLES30.GL_ARRAY_BUFFER, vertexCount * COORDS_PER_VERTEX * BYTES_PER_FLOAT, positionBuffer, GLES30.GL_DYNAMIC_DRAW)
        GLES30.glVertexAttribPointer(0, COORDS_PER_VERTEX, GLES30.GL_FLOAT, false, 0, 0)
        GLES30.glEnableVertexAttribArray(0)

        // Texture coordinate data
        GLES30.glBindBuffer(GLES30.GL_ARRAY_BUFFER, texCoordVboId)
        GLES30.glBufferData(GLES30.GL_ARRAY_BUFFER, vertexCount * TEXCOORDS_PER_VERTEX * BYTES_PER_FLOAT, texCoordBuffer, GLES30.GL_DYNAMIC_DRAW)
        GLES30.glVertexAttribPointer(1, TEXCOORDS_PER_VERTEX, GLES30.GL_FLOAT, false, 0, 0)
        GLES30.glEnableVertexAttribArray(1)

        GLES30.glBindVertexArray(0)
    }

    /**
     * Extrapolate a 3D position from texture coordinates using 3 anchor points
     * Uses barycentric-like interpolation extended to full texture space
     */
    private fun extrapolatePosition(
        p1: FloatArray, p2: FloatArray, p3: FloatArray,
        t1: FloatArray, t2: FloatArray, t3: FloatArray,
        target: FloatArray
    ): FloatArray {
        // Solve for affine transformation from 2D texture coords to 3D
        // We have: P = a*P1 + b*P2 + c*P3 where a+b+c=1
        // And: T = a*T1 + b*T2 + c*T3
        
        // Build 2x2 matrix for texture coords (relative to t1)
        val tx2 = t2[0] - t1[0]
        val ty2 = t2[1] - t1[1]
        val tx3 = t3[0] - t1[0]
        val ty3 = t3[1] - t1[1]
        
        // Target relative to t1
        val txT = target[0] - t1[0]
        val tyT = target[1] - t1[1]
        
        // Solve 2x2 system: [tx2 tx3] [b]   [txT]
        //                   [ty2 ty3] [c] = [tyT]
        val det = tx2 * ty3 - tx3 * ty2
        if (kotlin.math.abs(det) < 0.0001f) {
            // Degenerate case - fall back to midpoint
            return floatArrayOf(
                (p1[0] + p2[0] + p3[0]) / 3f,
                (p1[1] + p2[1] + p3[1]) / 3f,
                (p1[2] + p2[2] + p3[2]) / 3f
            )
        }
        
        val b = (txT * ty3 - tx3 * tyT) / det
        val c = (tx2 * tyT - txT * ty2) / det
        val a = 1f - b - c
        
        // Interpolate 3D position
        return floatArrayOf(
            a * p1[0] + b * p2[0] + c * p3[0],
            a * p1[1] + b * p2[1] + c * p3[1],
            a * p1[2] + b * p2[2] + c * p3[2]
        )
    }

    /**
     * Draw the quad
     */
    fun draw() {
        if (!isInitialized || vertexCount == 0) return

        GLES30.glBindVertexArray(vaoId)
        GLES30.glDrawArrays(GLES30.GL_TRIANGLES, 0, vertexCount)
        GLES30.glBindVertexArray(0)
    }

    /**
     * Clean up OpenGL resources
     */
    fun destroy() {
        if (vaoId != 0) {
            GLES30.glDeleteVertexArrays(1, intArrayOf(vaoId), 0)
            vaoId = 0
        }
        if (positionVboId != 0 || texCoordVboId != 0) {
            GLES30.glDeleteBuffers(2, intArrayOf(positionVboId, texCoordVboId), 0)
            positionVboId = 0
            texCoordVboId = 0
        }
        isInitialized = false
    }
}
