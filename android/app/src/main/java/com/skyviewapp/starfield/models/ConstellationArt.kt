package com.skyviewapp.starfield.models

/**
 * Data class for constellation artwork/illustration
 * Follows Stellarium format: 3 anchors for texture→sky mapping + lines for star connections
 */
data class ConstellationArt(
    val id: String,
    val name: String,
    val imageName: String,
    val imageSize: Pair<Int, Int>,     // Texture dimensions (width, height)
    val anchors: List<AnchorPoint>,    // 3 anchor points mapping texture to sky
    val lines: List<List<Int>>         // Star connection lines (HIP IDs)
) {
    /**
     * Anchor point: maps a pixel position in texture to a star
     */
    data class AnchorPoint(
        val pixelX: Int,    // X position in texture (0 to imageSize.first)
        val pixelY: Int,    // Y position in texture (0 to imageSize.second)
        val hipId: Int      // Hipparcos star ID
    )

    companion object {
        @Suppress("UNCHECKED_CAST")
        fun fromMap(data: Map<String, Any>): ConstellationArt {
            val anchorsRaw = data["anchors"] as? List<Map<String, Any>> ?: emptyList()
            val anchors = anchorsRaw.map { anchor ->
                val pos = anchor["pos"] as? List<Number> ?: listOf(0, 0)
                AnchorPoint(
                    pixelX = pos.getOrNull(0)?.toInt() ?: 0,
                    pixelY = pos.getOrNull(1)?.toInt() ?: 0,
                    hipId = (anchor["hip"] as? Number)?.toInt() ?: 0
                )
            }
            
            val linesRaw = data["lines"] as? List<List<Number>> ?: emptyList()
            val lines = linesRaw.map { line -> line.map { it.toInt() } }
            
            val size = data["size"] as? List<Number> ?: listOf(512, 512)
            
            return ConstellationArt(
                id = data["id"] as? String ?: "",
                name = data["name"] as? String ?: "",
                imageName = data["imageName"] as? String ?: "",
                imageSize = Pair(size[0].toInt(), size[1].toInt()),
                anchors = anchors,
                lines = lines
            )
        }
    }
}
