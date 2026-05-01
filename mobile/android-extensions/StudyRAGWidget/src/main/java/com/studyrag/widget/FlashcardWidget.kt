package com.studyrag.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import com.studyrag.app.R
import org.json.JSONObject

/**
 * Android App Widget — shows today's flashcard (front).
 *
 * Data flow:
 *   RN app → StudyRAGWidgetsModule.setDailyContent() → SharedPreferences
 *   → onUpdate() reads SharedPreferences → RemoteViews update
 *
 * Place this file at android/app/src/main/java/com/studyrag/widget/ after
 * running `npx expo prebuild`.
 */
class FlashcardWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        val prefs = getPrefs(context)
        val payloadStr = prefs.getString(PREFS_KEY, null)

        var front = PLACEHOLDER_FRONT
        var back  = PLACEHOLDER_BACK

        if (payloadStr != null) {
            try {
                val json = JSONObject(payloadStr)
                val flashcard = json.getJSONObject("flashcard")
                front = flashcard.optString("front", PLACEHOLDER_FRONT)
                back  = flashcard.optString("back",  PLACEHOLDER_BACK)
            } catch (_: Exception) { /* keep defaults */ }
        }

        for (id in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_flashcard)
            views.setTextViewText(R.id.widget_front, front)
            views.setTextViewText(R.id.widget_back, back)
            appWidgetManager.updateAppWidget(id, views)
        }
    }

    companion object {
        const val PREFS_NAME     = "com.studyrag.widget.prefs"
        const val PREFS_KEY      = "StudyRAGWidgetPayload"
        const val PLACEHOLDER_FRONT = "What is spaced repetition?"
        const val PLACEHOLDER_BACK  = "A learning technique that increases review intervals over time."

        fun getPrefs(context: Context): SharedPreferences =
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
}
