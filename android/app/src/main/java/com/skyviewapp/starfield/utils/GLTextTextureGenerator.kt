package com.skyviewapp.starfield.utils

import android.graphics.*

/**
 * Generates bitmaps for text labels to be used as OpenGL textures
 */
object GLTextTextureGenerator {
    
    fun generateCardinalPointBitmap(text: String, size: Int = 128, color: Int = Color.WHITE): Bitmap {
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        bitmap.eraseColor(Color.TRANSPARENT)
        
        val paint = Paint().apply {
            isAntiAlias = true
            textSize = size * 0.8f
            this.color = color
            typeface = Typeface.DEFAULT_BOLD
            textAlign = Paint.Align.CENTER
            // Add a slight shadow for visibility
            setShadowLayer(4f, 0f, 0f, Color.BLACK)
        }
        
        // Draw text centered
        val xPos = size / 2f
        val yPos = (size / 2f) - ((paint.descent() + paint.ascent()) / 2f)
        
        canvas.drawText(text, xPos, yPos, paint)
        
        return bitmap
    }
}
