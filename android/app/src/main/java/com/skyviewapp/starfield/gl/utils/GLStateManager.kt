package com.skyviewapp.starfield.gl.utils

import android.opengl.GLES30

/**
 * Manages OpenGL ES state with push/pop semantics.
 * 
 * Prevents state leaks between renderers by providing clean
 * state management patterns. Each renderer can use specific
 * blend modes, depth settings, etc. without affecting others.
 * 
 * Usage:
 * ```
 * GLStateManager.withAdditiveBlend {
 *     // Draw glowing objects
 *     starBuffer.draw()
 * }
 * // Blend mode automatically restored
 * ```
 */
object GLStateManager {
    
    // ============= Blend State =============
    
    /**
     * Configure additive blending for glowing effects (stars, etc.)
     * Adds source color to destination for bright glow effect.
     */
    fun setAdditiveBlend() {
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE)
    }
    
    /**
     * Configure standard alpha blending for transparent objects.
     * Standard compositing with alpha channel.
     */
    fun setAlphaBlend() {
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
    }
    
    /**
     * Configure premultiplied alpha blending.
     * Used when colors are already multiplied by alpha.
     */
    fun setPremultipliedAlphaBlend() {
        GLES30.glBlendFunc(GLES30.GL_ONE, GLES30.GL_ONE_MINUS_SRC_ALPHA)
    }
    
    /**
     * Execute block with additive blending, then restore to alpha blend.
     */
    inline fun withAdditiveBlend(block: () -> Unit) {
        setAdditiveBlend()
        try {
            block()
        } finally {
            setAlphaBlend()
        }
    }
    
    /**
     * Execute block with premultiplied alpha, then restore to standard alpha.
     */
    inline fun withPremultipliedAlpha(block: () -> Unit) {
        setPremultipliedAlphaBlend()
        try {
            block()
        } finally {
            setAlphaBlend()
        }
    }
    
    // ============= Depth State =============
    
    /**
     * Disable depth writing (objects don't affect depth buffer).
     * Useful for skybox, stars, transparent objects.
     */
    fun disableDepthWrite() {
        GLES30.glDepthMask(false)
    }
    
    /**
     * Enable depth writing (default state).
     */
    fun enableDepthWrite() {
        GLES30.glDepthMask(true)
    }
    
    /**
     * Disable depth testing entirely.
     */
    fun disableDepthTest() {
        GLES30.glDisable(GLES30.GL_DEPTH_TEST)
    }
    
    /**
     * Enable depth testing (default state).
     */
    fun enableDepthTest() {
        GLES30.glEnable(GLES30.GL_DEPTH_TEST)
    }
    
    /**
     * Execute block with depth writing disabled, then restore.
     */
    inline fun withDepthWriteDisabled(block: () -> Unit) {
        disableDepthWrite()
        try {
            block()
        } finally {
            enableDepthWrite()
        }
    }
    
    /**
     * Execute block with depth testing disabled, then restore.
     */
    inline fun withDepthTestDisabled(block: () -> Unit) {
        disableDepthTest()
        try {
            block()
        } finally {
            enableDepthTest()
        }
    }
    
    // ============= Face Culling =============
    
    /**
     * Disable face culling (render both sides of polygons).
     */
    fun disableCulling() {
        GLES30.glDisable(GLES30.GL_CULL_FACE)
    }
    
    /**
     * Enable back-face culling (default for 3D objects).
     */
    fun enableCulling() {
        GLES30.glEnable(GLES30.GL_CULL_FACE)
    }
    
    /**
     * Execute block with face culling disabled, then restore.
     */
    inline fun withCullingDisabled(block: () -> Unit) {
        disableCulling()
        try {
            block()
        } finally {
            enableCulling()
        }
    }
    
    // ============= Combined State Presets =============
    
    /**
     * Configure state for rendering stars:
     * - Additive blending for glow
     * - No depth writing (at infinity)
     * - Culling enabled
     */
    fun configureForStars() {
        setAdditiveBlend()
        disableDepthWrite()
    }
    
    /**
     * Configure state for rendering artwork/sprites:
     * - Alpha blending
     * - No depth writing
     * - No face culling (2D quads)
     */
    fun configureForArtwork() {
        setAlphaBlend()
        disableDepthWrite()
        disableCulling()
    }
    
    /**
     * Configure state for rendering 3D objects (planets):
     * - Alpha blending
     * - Depth writing enabled
     * - Face culling enabled
     */
    fun configureForSolidObjects() {
        setAlphaBlend()
        enableDepthWrite()
        enableCulling()
    }
    
    /**
     * Restore default OpenGL state.
     */
    fun restoreDefaults() {
        setAlphaBlend()
        enableDepthWrite()
        enableDepthTest()
        enableCulling()
    }
    
    /**
     * Execute a render block for stars with proper state management.
     */
    inline fun renderStars(block: () -> Unit) {
        configureForStars()
        try {
            block()
        } finally {
            restoreDefaults()
        }
    }
    
    /**
     * Execute a render block for artwork with proper state management.
     */
    inline fun renderArtwork(block: () -> Unit) {
        configureForArtwork()
        try {
            block()
        } finally {
            restoreDefaults()
        }
    }
}

