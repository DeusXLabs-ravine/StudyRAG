package com.studyrag.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject

/**
 * React Native native module that the JS bridge in src/native/widgets.ts calls.
 * Registered as "StudyRAGWidgets" (matches NativeModules.StudyRAGWidgets in JS).
 *
 * After `expo prebuild`, add this to MainApplication.kt's package list or via
 * a ReactPackage implementation.
 */
class StudyRAGWidgetsModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    override fun getName(): String = "StudyRAGWidgets"

    @ReactMethod
    fun setDailyContent(payload: ReadableMap, promise: Promise) {
        try {
            // Convert ReadableMap → JSONObject → String
            val json = JSONObject()
            val iter = payload.keySetIterator()
            while (iter.hasNextKey()) {
                val key = iter.nextKey()
                // Handles nested objects (tier, flashcard, definition, generatedAt)
                val dynamicVal = payload.getDynamic(key)
                json.put(key, dynamicVal.asMap()?.let { convertMap(it) } ?: dynamicVal.asString())
            }
            FlashcardWidget.getPrefs(ctx)
                .edit()
                .putString(FlashcardWidget.PREFS_KEY, json.toString())
                .apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ENCODE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun reload(promise: Promise) {
        try {
            val manager = AppWidgetManager.getInstance(ctx)
            val ids = manager.getAppWidgetIds(
                ComponentName(ctx, FlashcardWidget::class.java)
            )
            val intent = android.content.Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            ctx.sendBroadcast(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("RELOAD_ERROR", e.message, e)
        }
    }

    private fun convertMap(map: com.facebook.react.bridge.ReadableMap): JSONObject {
        val json = JSONObject()
        val iter = map.keySetIterator()
        while (iter.hasNextKey()) {
            val key = iter.nextKey()
            val dyn = map.getDynamic(key)
            json.put(key, dyn.asString())
        }
        return json
    }
}
