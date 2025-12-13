package com.skyviewapp.starfield.rendering

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log

/**
 * Manages loading and caching of planet and constellation textures.
 * 
 * Centralizes all texture loading to keep SkyViewNativeView clean.
 * Textures are loaded lazily and cached for reuse.
 */
class TextureManager(private val context: Context) {
    
    private val planetTextures = mutableMapOf<String, Bitmap>()
    private val constellationTextures = mutableMapOf<String, Bitmap>()
    
    private val planetNames = listOf(
        "sun", "moon", "mercury", "venus", "mars", 
        "jupiter", "saturn", "uranus", "neptune"
    )
    
    private val constellationNames = listOf(
        "leo", "aries", "taurus", "gemini", "cancer", 
        "virgo", "libra", "scorpius", "sagittarius", "ursa-major"
    )
    
    /**
     * Load all planet textures from assets/planets/
     */
    fun loadPlanetTextures() {
        val assetManager = context.assets
        for (name in planetNames) {
            try {
                val inputStream = assetManager.open("planets/$name.png")
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()
                if (bitmap != null) {
                    val scaledBitmap = Bitmap.createScaledBitmap(bitmap, 128, 128, true)
                    planetTextures[name] = scaledBitmap
                    Log.d("TextureManager", "Loaded planet texture: $name")
                }
            } catch (e: Exception) {
                Log.w("TextureManager", "Failed to load planet texture: $name - ${e.message}")
            }
        }
    }
    
    /**
     * Load all constellation artwork textures from assets/constellations/
     */
    fun loadConstellationTextures() {
        val assetManager = context.assets
        for (name in constellationNames) {
            try {
                val inputStream = assetManager.open("constellations/$name.png")
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()
                if (bitmap != null) {
                    constellationTextures[name] = bitmap
                    Log.d("TextureManager", "Loaded constellation texture: $name")
                }
            } catch (e: Exception) {
                Log.w("TextureManager", "Failed to load constellation texture: $name - ${e.message}")
            }
        }
    }
    
    /**
     * Get a planet texture by name (e.g., "mars", "jupiter")
     */
    fun getPlanetTexture(name: String): Bitmap? = planetTextures[name]
    
    /**
     * Get a constellation texture by name (e.g., "leo")
     */
    fun getConstellationTexture(name: String): Bitmap? = constellationTextures[name]
    
    /**
     * Get all loaded planet textures
     */
    fun getAllPlanetTextures(): Map<String, Bitmap> = planetTextures
    
    /**
     * Get all loaded constellation textures
     */
    fun getAllConstellationTextures(): Map<String, Bitmap> = constellationTextures
}
