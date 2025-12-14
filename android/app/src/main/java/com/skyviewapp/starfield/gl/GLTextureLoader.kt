package com.skyviewapp.starfield.gl

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.opengl.GLES30
import android.opengl.GLUtils
import android.util.Log

/**
 * OpenGL texture loader for planet textures
 * Loads Bitmaps from assets and uploads to GPU with mipmaps
 */
class GLTextureLoader(private val context: Context) {
    companion object {
        private const val TAG = "GLTextureLoader"
    }

    private val textureCache = mutableMapOf<String, Int>()

    /**
     * Load texture from assets folder
     * @param assetPath Path relative to assets folder (e.g., "planets/earth.png")
     * @return OpenGL texture ID, or 0 if failed
     */
    fun loadTextureFromAssets(assetPath: String): Int {
        // Check cache first
        textureCache[assetPath]?.let { return it }

        try {
            val inputStream = context.assets.open(assetPath)
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()

            if (bitmap == null) {
                Log.e(TAG, "Failed to decode bitmap: $assetPath")
                return 0
            }

            val textureId = loadTextureFromBitmap(bitmap)
            bitmap.recycle()

            if (textureId != 0) {
                textureCache[assetPath] = textureId
            }

            return textureId
        } catch (e: Exception) {
            Log.e(TAG, "Error loading texture from assets: $assetPath", e)
            return 0
        }
    }

    /**
     * Load texture from Bitmap
     * @return OpenGL texture ID
     */
    fun loadTextureFromBitmap(bitmap: Bitmap): Int {
        val textureIds = IntArray(1)
        GLES30.glGenTextures(1, textureIds, 0)
        val textureId = textureIds[0]

        if (textureId == 0) {
            Log.e(TAG, "Failed to generate texture")
            return 0
        }

        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textureId)

        // Set texture parameters
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MIN_FILTER, GLES30.GL_LINEAR_MIPMAP_LINEAR)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MAG_FILTER, GLES30.GL_LINEAR)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_S, GLES30.GL_CLAMP_TO_EDGE)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_T, GLES30.GL_CLAMP_TO_EDGE)

        // Upload texture to GPU
        GLUtils.texImage2D(GLES30.GL_TEXTURE_2D, 0, bitmap, 0)

        // Generate mipmaps for better quality at distance
        GLES30.glGenerateMipmap(GLES30.GL_TEXTURE_2D)

        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, 0)

        return textureId
    }

    /**
     * Bind a texture to a texture unit
     * @param textureId OpenGL texture ID
     * @param textureUnit Texture unit (e.g., GLES30.GL_TEXTURE0)
     */
    fun bindTexture(textureId: Int, textureUnit: Int = GLES30.GL_TEXTURE0) {
        GLES30.glActiveTexture(textureUnit)
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textureId)
    }

    /**
     * Delete a texture
     */
    fun deleteTexture(textureId: Int) {
        if (textureId != 0) {
            GLES30.glDeleteTextures(1, intArrayOf(textureId), 0)
            // Remove from cache
            textureCache.entries.removeIf { it.value == textureId }
        }
    }

    /**
     * Delete all cached textures
     */
    fun deleteAllTextures() {
        for ((_, textureId) in textureCache) {
            if (textureId != 0) {
                GLES30.glDeleteTextures(1, intArrayOf(textureId), 0)
            }
        }
        textureCache.clear()
    }

    /**
     * Get cached texture by path
     */
    fun getTexture(assetPath: String): Int {
        return textureCache[assetPath] ?: 0
    }
}
