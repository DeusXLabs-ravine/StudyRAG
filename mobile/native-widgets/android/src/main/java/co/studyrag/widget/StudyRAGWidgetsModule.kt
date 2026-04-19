package co.studyrag.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * RN bridge — exposes `setDailyContent(payload)` and `reload()` to JS.
 * Wire this into your ReactPackage registration after `expo prebuild`.
 */
private val Context.widgetDataStore: DataStore<Preferences> by preferencesDataStore(name = "studyrag_widget")

class StudyRAGWidgetsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "StudyRAGWidgets"

    @ReactMethod
    fun setDailyContent(payload: ReadableMap, promise: Promise) {
        try {
            val json = mapToJson(payload).toString()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    reactApplicationContext.widgetDataStore.edit { prefs ->
                        prefs[StudyRAGWidget.PAYLOAD_KEY] = json
                    }
                    promise.resolve(null)
                } catch (e: Exception) {
                    promise.reject("datastore_write_failed", e.message, e)
                }
            }
        } catch (e: Exception) {
            promise.reject("encode_failed", e.message, e)
        }
    }

    @ReactMethod
    fun reload(promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val mgr = AppWidgetManager.getInstance(ctx)
            val component = ComponentName(ctx, StudyRAGWidgetReceiver::class.java)
            val ids = mgr.getAppWidgetIds(component)
            // Force Glance to refresh by updating the placeholder extra.
            mgr.notifyAppWidgetViewDataChanged(ids, android.R.id.list)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("reload_failed", e.message, e)
        }
    }

    private fun mapToJson(map: ReadableMap): JSONObject {
        val json = JSONObject()
        val iterator = map.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (map.getType(key)) {
                com.facebook.react.bridge.ReadableType.Null -> json.put(key, JSONObject.NULL)
                com.facebook.react.bridge.ReadableType.Boolean -> json.put(key, map.getBoolean(key))
                com.facebook.react.bridge.ReadableType.Number -> json.put(key, map.getDouble(key))
                com.facebook.react.bridge.ReadableType.String -> json.put(key, map.getString(key))
                com.facebook.react.bridge.ReadableType.Map -> json.put(key, mapToJson(map.getMap(key)!!))
                com.facebook.react.bridge.ReadableType.Array -> {
                    // Arrays aren't used in the widget payload today; skip.
                    json.put(key, JSONObject.NULL)
                }
            }
        }
        return json
    }
}
