package com.skyviewapp.starfield.gl.animation

/**
 * Provides consistent animation timing across all renderers.
 * 
 * Can be shared by multiple renderers (stars, planets, satellites, etc.)
 * to ensure synchronized animations when needed, or used independently
 * for isolated animation timing.
 * 
 * Usage:
 * ```
 * val clock = AnimationClock()
 * // In render loop:
 * shader.setUniform1f("u_Time", clock.elapsedSeconds)
 * ```
 */
class AnimationClock {
    private var startTime = System.nanoTime()
    private var pausedTime = 0L
    private var isPaused = false
    
    /**
     * Elapsed time in seconds since clock creation or last reset.
     * Continues to advance even when not queried (real-time).
     */
    val elapsedSeconds: Float
        get() = if (isPaused) {
            pausedTime / 1_000_000_000f
        } else {
            (System.nanoTime() - startTime) / 1_000_000_000f
        }
    
    /**
     * Elapsed time in milliseconds.
     */
    val elapsedMillis: Long
        get() = if (isPaused) {
            pausedTime / 1_000_000
        } else {
            (System.nanoTime() - startTime) / 1_000_000
        }
    
    /**
     * Reset the clock to zero.
     */
    fun reset() {
        startTime = System.nanoTime()
        pausedTime = 0L
        isPaused = false
    }
    
    /**
     * Pause the clock - elapsed time will freeze at current value.
     */
    fun pause() {
        if (!isPaused) {
            pausedTime = System.nanoTime() - startTime
            isPaused = true
        }
    }
    
    /**
     * Resume the clock from paused state.
     */
    fun resume() {
        if (isPaused) {
            startTime = System.nanoTime() - pausedTime
            isPaused = false
        }
    }
    
    /**
     * Check if the clock is currently paused.
     */
    fun isPaused(): Boolean = isPaused
    
    companion object {
        /**
         * Shared global clock for synchronized animations across renderers.
         * Use this when you want stars, planets, etc. to animate in sync.
         */
        val shared = AnimationClock()
    }
}

