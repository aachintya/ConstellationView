package com.skyviewapp.starfield.gl

import android.content.Context
import android.opengl.GLES30
import android.util.Log
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * Shader program utility for OpenGL ES 3.0
 */
class ShaderProgram(
    private val context: Context,
    vertexShaderResId: Int,
    fragmentShaderResId: Int
) {
    companion object {
        private const val TAG = "ShaderProgram"
    }

    var programId: Int = 0
        private set

    private val uniformLocations = mutableMapOf<String, Int>()

    init {
        val vertexShaderCode = loadShaderFromResource(vertexShaderResId)
        val fragmentShaderCode = loadShaderFromResource(fragmentShaderResId)
        
        val vertexShader = compileShader(GLES30.GL_VERTEX_SHADER, vertexShaderCode)
        val fragmentShader = compileShader(GLES30.GL_FRAGMENT_SHADER, fragmentShaderCode)
        
        programId = linkProgram(vertexShader, fragmentShader)
        
        GLES30.glDeleteShader(vertexShader)
        GLES30.glDeleteShader(fragmentShader)
    }

    private fun loadShaderFromResource(resourceId: Int): String {
        val inputStream = context.resources.openRawResource(resourceId)
        val reader = BufferedReader(InputStreamReader(inputStream))
        val code = StringBuilder()
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            code.append(line).append("\n")
        }
        reader.close()
        return code.toString()
    }

    private fun compileShader(type: Int, shaderCode: String): Int {
        val shader = GLES30.glCreateShader(type)
        if (shader == 0) {
            Log.e(TAG, "Error creating shader type: $type")
            return 0
        }

        GLES30.glShaderSource(shader, shaderCode)
        GLES30.glCompileShader(shader)

        val compileStatus = IntArray(1)
        GLES30.glGetShaderiv(shader, GLES30.GL_COMPILE_STATUS, compileStatus, 0)
        
        if (compileStatus[0] == 0) {
            val error = GLES30.glGetShaderInfoLog(shader)
            Log.e(TAG, "Shader compilation error: $error")
            GLES30.glDeleteShader(shader)
            return 0
        }

        return shader
    }

    private fun linkProgram(vertexShader: Int, fragmentShader: Int): Int {
        val program = GLES30.glCreateProgram()
        if (program == 0) {
            Log.e(TAG, "Error creating program")
            return 0
        }

        GLES30.glAttachShader(program, vertexShader)
        GLES30.glAttachShader(program, fragmentShader)
        GLES30.glLinkProgram(program)

        val linkStatus = IntArray(1)
        GLES30.glGetProgramiv(program, GLES30.GL_LINK_STATUS, linkStatus, 0)
        
        if (linkStatus[0] == 0) {
            val error = GLES30.glGetProgramInfoLog(program)
            Log.e(TAG, "Program linking error: $error")
            GLES30.glDeleteProgram(program)
            return 0
        }

        return program
    }

    fun use() {
        GLES30.glUseProgram(programId)
    }

    fun getUniformLocation(name: String): Int {
        return uniformLocations.getOrPut(name) {
            GLES30.glGetUniformLocation(programId, name)
        }
    }

    fun setUniform1f(name: String, value: Float) {
        GLES30.glUniform1f(getUniformLocation(name), value)
    }

    fun setUniform2f(name: String, x: Float, y: Float) {
        GLES30.glUniform2f(getUniformLocation(name), x, y)
    }

    fun setUniform3f(name: String, x: Float, y: Float, z: Float) {
        GLES30.glUniform3f(getUniformLocation(name), x, y, z)
    }

    fun setUniform4f(name: String, x: Float, y: Float, z: Float, w: Float) {
        GLES30.glUniform4f(getUniformLocation(name), x, y, z, w)
    }

    fun setUniformMatrix4fv(name: String, matrix: FloatArray) {
        GLES30.glUniformMatrix4fv(getUniformLocation(name), 1, false, matrix, 0)
    }

    fun setUniform1i(name: String, value: Int) {
        GLES30.glUniform1i(getUniformLocation(name), value)
    }

    fun delete() {
        if (programId != 0) {
            GLES30.glDeleteProgram(programId)
            programId = 0
        }
    }
}
