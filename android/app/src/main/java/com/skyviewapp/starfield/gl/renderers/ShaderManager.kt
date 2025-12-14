package com.skyviewapp.starfield.gl.renderers

import android.content.Context
import android.util.Log
import com.skyviewapp.R
import com.skyviewapp.starfield.gl.ShaderProgram

/**
 * Manages all shader programs used in the sky renderer.
 * Handles initialization, compilation, and cleanup of shaders.
 */
class ShaderManager(private val context: Context) {
    companion object {
        private const val TAG = "ShaderManager"
    }

    var starShader: ShaderProgram? = null
        private set
    var lineShader: ShaderProgram? = null
        private set
    var planetShader: ShaderProgram? = null
        private set
    var skyboxShader: ShaderProgram? = null
        private set
    var artworkShader: ShaderProgram? = null
        private set
    var ringShader: ShaderProgram? = null
        private set

    /**
     * Initialize all shader programs.
     * Should be called on the GL thread after surface creation.
     */
    fun initShaders() {
        try {
            starShader = ShaderProgram(
                context,
                R.raw.star_vertex,
                R.raw.star_fragment
            )
            lineShader = ShaderProgram(
                context,
                R.raw.line_vertex,
                R.raw.line_fragment
            )
            planetShader = ShaderProgram(
                context,
                R.raw.planet_vertex,
                R.raw.planet_fragment
            )
            skyboxShader = ShaderProgram(
                context,
                R.raw.skybox_vertex,
                R.raw.skybox_fragment
            )
            artworkShader = ShaderProgram(
                context,
                R.raw.artwork_vertex,
                R.raw.artwork_fragment
            )
            ringShader = ShaderProgram(
                context,
                R.raw.ring_vertex,
                R.raw.ring_fragment
            )
            Log.d(TAG, "All shaders compiled successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Shader initialization failed", e)
        }
    }

    /**
     * Clean up all shader resources.
     */
    fun destroy() {
        starShader?.delete()
        lineShader?.delete()
        planetShader?.delete()
        skyboxShader?.delete()
        artworkShader?.delete()
        ringShader?.delete()
    }
}
