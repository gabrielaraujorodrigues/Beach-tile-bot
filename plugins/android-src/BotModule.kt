package com.beachtilebot

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class BotModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private var instance: BotModule? = null

        fun sendEvent(message: String, type: String) {
            instance?.emitLog(message, type)
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = "BotModule"

    fun emitLog(message: String, type: String) {
        if (!reactContext.hasActiveCatalystInstance()) return
        val params: WritableMap = Arguments.createMap().apply {
            putString("message", message)
            putString("type", type)
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("BotLog", params)
    }

    @ReactMethod
    fun startBot() {
        val service = BotAccessibilityService.instance
        if (service != null) {
            service.startBot()
        } else {
            emitLog(
                "Servico de Acessibilidade nao esta ativo. Ative nas configuracoes.",
                "error"
            )
        }
    }

    @ReactMethod
    fun stopBot() {
        BotAccessibilityService.instance?.stopBot()
    }

    @ReactMethod
    fun checkAccessibility(callback: Callback) {
        val enabled = Settings.Secure.getString(
            reactContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )?.contains(reactContext.packageName) == true
        callback.invoke(enabled)
    }

    @ReactMethod
    fun checkOverlay(callback: Callback) {
        val enabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(reactContext)
        } else {
            true
        }
        callback.invoke(enabled)
    }

    @ReactMethod
    fun checkBattery(callback: Callback) {
        val enabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = reactContext.getSystemService(PowerManager::class.java)
            pm?.isIgnoringBatteryOptimizations(reactContext.packageName) == true
        } else {
            true
        }
        callback.invoke(enabled)
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        reactContext.startActivity(intent)
    }

    @ReactMethod
    fun openOverlaySettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactContext.packageName}")
            ).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun requestBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:${reactContext.packageName}")
            ).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
    }

    @ReactMethod
    fun removeListeners(count: Int) {
    }
}
