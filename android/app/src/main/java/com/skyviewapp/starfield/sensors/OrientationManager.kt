package com.skyviewapp.starfield.sensors

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager

/**
 * Manages device orientation sensors for gyroscope-based sky tracking
 */
class OrientationManager(
    private val context: Context,
    private val onOrientationChanged: (azimuth: Float, altitude: Float) -> Unit
) : SensorEventListener {

    private var sensorManager: SensorManager? = null
    private var rotationVectorSensor: Sensor? = null

    private val rotationMatrix = FloatArray(9)
    private val orientationAngles = FloatArray(3)
    
    // Raw and smoothed orientation values
    private var azimuth = 180f
    private var altitude = 30f
    private var smoothAzimuth = 180f
    private var smoothAltitude = 30f
    private val smoothingFactor = 0.138f

    // Public read-only access to smoothed values
    val currentAzimuth: Float get() = smoothAzimuth
    val currentAltitude: Float get() = smoothAltitude

    init {
        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        rotationVectorSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
    }

    /**
     * Start receiving sensor updates
     */
    fun start() {
        rotationVectorSensor?.let { sensor ->
            sensorManager?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME)
        }
    }

    /**
     * Stop receiving sensor updates
     */
    fun stop() {
        sensorManager?.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ROTATION_VECTOR) return

        SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)

        // Remap for portrait orientation
        val remappedMatrix = FloatArray(9)
        SensorManager.remapCoordinateSystem(
            rotationMatrix,
            SensorManager.AXIS_X,
            SensorManager.AXIS_Z,
            remappedMatrix
        )

        SensorManager.getOrientation(remappedMatrix, orientationAngles)

        azimuth = Math.toDegrees(orientationAngles[0].toDouble()).toFloat()
        altitude = -Math.toDegrees(orientationAngles[1].toDouble()).toFloat()

        // Normalize and INVERT azimuth for correct gyro direction
        // When user turns left, azimuth should decrease (view goes left)
        azimuth = 360f - azimuth  // Invert direction
        azimuth = ((azimuth % 360f) + 360f) % 360f
        altitude = altitude.coerceIn(-90f, 90f)

        // Smooth azimuth with wraparound handling
        var azDiff = azimuth - smoothAzimuth
        if (azDiff > 180) azDiff -= 360
        if (azDiff < -180) azDiff += 360
        smoothAzimuth = ((smoothAzimuth + smoothingFactor * azDiff) % 360f + 360f) % 360f

        // Smooth altitude
        smoothAltitude += smoothingFactor * (altitude - smoothAltitude)

        // Notify listener
        onOrientationChanged(smoothAzimuth, smoothAltitude)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not needed
    }
}
