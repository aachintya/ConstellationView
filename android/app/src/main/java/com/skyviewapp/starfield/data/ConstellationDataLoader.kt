package com.skyviewapp.starfield.data

import android.content.Context
import com.skyviewapp.starfield.models.ConstellationArt
import org.json.JSONObject

/**
 * Loads constellation artwork configurations from JSON assets.
 * 
 * This provides a modular, data-driven approach to constellation artwork:
 * - Add new constellations by editing constellations_artwork.json
 * - No code changes needed for new artworks
 * - Supports 3-anchor Stellarium-style texture mapping
 * 
 * Usage:
 *   val loader = ConstellationDataLoader(context)
 *   val leoConfig = loader.getArtworkConfig("LEO")
 */
class ConstellationDataLoader(private val context: Context) {
    
    /**
     * Config for a single constellation artwork
     */
    data class ArtworkConfig(
        val imageName: String,
        val imageSize: Pair<Int, Int>,
        val anchors: List<ConstellationArt.AnchorPoint>,
        val lines: List<List<Int>>
    )
    
    private val configCache = mutableMapOf<String, ArtworkConfig>()
    private var isLoaded = false
    
    /**
     * Load all artwork configs from JSON asset
     */
    fun loadConfigs() {
        if (isLoaded) return
        
        try {
            val jsonString = context.assets.open("constellations_artwork.json")
                .bufferedReader().use { it.readText() }
            
            val json = JSONObject(jsonString)
            val keys = json.keys()
            
            while (keys.hasNext()) {
                val id = keys.next()
                val config = parseConfig(id, json.getJSONObject(id))
                if (config != null) {
                    configCache[id] = config
                }
            }
            
            isLoaded = true
        } catch (e: Exception) {
            android.util.Log.e("ConstellationLoader", "Failed to load configs: ${e.message}")
        }
    }
    
    /**
     * Get artwork config for a constellation ID (e.g., "LEO", "TAU")
     */
    fun getArtworkConfig(constellationId: String): ArtworkConfig? {
        if (!isLoaded) loadConfigs()
        return configCache[constellationId]
    }
    
    /**
     * Get all available constellation IDs
     */
    fun getAvailableConstellations(): Set<String> {
        if (!isLoaded) loadConfigs()
        return configCache.keys
    }
    
    private fun parseConfig(id: String, json: JSONObject): ArtworkConfig? {
        return try {
            val imageName = json.getString("imageName")
            val sizeArray = json.getJSONArray("imageSize")
            val imageSize = Pair(sizeArray.getInt(0), sizeArray.getInt(1))
            
            // Parse anchors
            val anchorsArray = json.getJSONArray("anchors")
            val anchors = mutableListOf<ConstellationArt.AnchorPoint>()
            for (i in 0 until anchorsArray.length()) {
                val anchor = anchorsArray.getJSONObject(i)
                anchors.add(ConstellationArt.AnchorPoint(
                    anchor.getInt("pixelX"),
                    anchor.getInt("pixelY"),
                    anchor.getInt("hipId")
                ))
            }
            
            // Parse lines
            val linesArray = json.getJSONArray("lines")
            val lines = mutableListOf<List<Int>>()
            for (i in 0 until linesArray.length()) {
                val lineArray = linesArray.getJSONArray(i)
                val line = mutableListOf<Int>()
                for (j in 0 until lineArray.length()) {
                    line.add(lineArray.getInt(j))
                }
                lines.add(line)
            }
            
            ArtworkConfig(imageName, imageSize, anchors, lines)
        } catch (e: Exception) {
            android.util.Log.e("ConstellationLoader", "Failed to parse $id: ${e.message}")
            null
        }
    }
}
