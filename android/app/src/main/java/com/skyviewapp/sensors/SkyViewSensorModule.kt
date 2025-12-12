package com.skyviewapp.sensors

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Native Sensor Module for SkyView
 * Uses hardware ROTATION_VECTOR sensor for fused orientation data.
 * This provides much smoother and more accurate orientation than
 * manually combining accelerometer + magnetometer in JavaScript.
 */
class SkyViewSensorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener, LifecycleEventListener {

    private var sensorManager: SensorManager? = null
    private var rotationVectorSensor: Sensor? = null
    private var isListening = false

    // Rotation matrix and orientation angles
    private val rotationMatrix = FloatArray(9)
    private val orientationAngles = FloatArray(3)

    // Smoothing
    private var smoothAzimuth = 0f
    private var smoothAltitude = 0f
    private val smoothingFactor = 0.15f

    // Throttling
    private var lastEmitTime = 0L
    private val emitInterval = 16L // ~60fps

    override fun getName(): String = "SkyViewSensorModule"

    override fun initialize() {
        super.initialize()
        reactApplicationContext.addLifecycleEventListener(this)
        sensorManager = reactApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        rotationVectorSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
    }

    @ReactMethod
    fun startListening() {
        if (isListening) return
        rotationVectorSensor?.let { sensor ->
            sensorManager?.registerListener(
                this,
                sensor,
                SensorManager.SENSOR_DELAY_GAME // ~20ms, good balance
            )
            isListening = true
        }
    }

    @ReactMethod
    fun stopListening() {
        if (!isListening) return
        sensorManager?.unregisterListener(this)
        isListening = false
    }

    @ReactMethod
    fun resetOrientation() {
        smoothAzimuth = 180f
        smoothAltitude = 30f
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ROTATION_VECTOR) return

        // Get rotation matrix from rotation vector
        SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)

        // Remap coordinate system for portrait orientation
        // We want the phone's Y-axis (pointing up from screen) as the look direction
        val remappedMatrix = FloatArray(9)
        SensorManager.remapCoordinateSystem(
            rotationMatrix,
            SensorManager.AXIS_X,
            SensorManager.AXIS_Z,
            remappedMatrix
        )

        // Get orientation angles
        SensorManager.getOrientation(remappedMatrix, orientationAngles)

        // Convert to degrees
        var azimuth = Math.toDegrees(orientationAngles[0].toDouble()).toFloat()
        var altitude = Math.toDegrees(orientationAngles[1].toDouble()).toFloat()

        // Normalize azimuth to 0-360
        azimuth = ((azimuth % 360f) + 360f) % 360f

        // Clamp altitude
        altitude = altitude.coerceIn(-90f, 90f)

        // Apply smoothing for azimuth (handle wraparound)
        var azDiff = azimuth - smoothAzimuth
        if (azDiff > 180) azDiff -= 360
        if (azDiff < -180) azDiff += 360
        smoothAzimuth = ((smoothAzimuth + smoothingFactor * azDiff) % 360f + 360f) % 360f

        // Apply smoothing for altitude
        smoothAltitude += smoothingFactor * (altitude - smoothAltitude)

        // Throttle emissions
        val now = System.currentTimeMillis()
        if (now - lastEmitTime < emitInterval) return
        lastEmitTime = now

        // Emit to JavaScript
        val params = Arguments.createMap().apply {
            putDouble("azimuth", smoothAzimuth.toDouble())
            putDouble("altitude", smoothAltitude.toDouble())
            putDouble("roll", Math.toDegrees(orientationAngles[2].toDouble()))
        }

        sendEvent("onSensorOrientation", params)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not needed for now
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // Lifecycle events
    override fun onHostResume() {
        if (isListening) {
            rotationVectorSensor?.let { sensor ->
                sensorManager?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME)
            }
        }
    }

    override fun onHostPause() {
        sensorManager?.unregisterListener(this)
    }

    override fun onHostDestroy() {
        stopListening()
    }

    override fun invalidate() {
        stopListening()
        reactApplicationContext.removeLifecycleEventListener(this)
        super.invalidate()
    }
}
