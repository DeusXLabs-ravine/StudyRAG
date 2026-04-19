package co.studyrag.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.color.ColorProvider
import androidx.compose.ui.graphics.Color
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.glance.currentState
import org.json.JSONObject

/**
 * Glance-backed home-screen widget for StudyRAG.
 *
 * Reads content from a DataStore preferences entry that the React Native
 * bridge writes via `StudyRAGWidgetsModule.setDailyContent()`.
 *
 * After `expo prebuild`, copy this file into
 * `mobile/android/app/src/main/java/co/studyrag/widget/` (creating the
 * package directory if it doesn't exist).
 */
class StudyRAGWidget : GlanceAppWidget() {
    companion object {
        val PAYLOAD_KEY = stringPreferencesKey("studyrag.widget.daily.v1")
    }

    override val stateDefinition = PreferencesGlanceStateDefinition

    @Composable
    override fun Content() {
        val prefs = currentState<androidx.datastore.preferences.core.Preferences>()
        val raw = prefs[PAYLOAD_KEY]

        var front = "Open StudyRAG"
        var back = "Add a document to get your first flashcard."

        if (raw != null) {
            try {
                val json = JSONObject(raw)
                val card = json.optJSONObject("flashcard")
                if (card != null) {
                    front = card.optString("front", front)
                    back = card.optString("back", back)
                }
            } catch (_: Exception) {
                // fall through to defaults
            }
        }

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Color.White))
                .padding(16.dp)
        ) {
            Text(
                "TODAY'S CARD",
                style = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.Bold)
            )
            Text(
                front,
                style = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Bold)
            )
            Text(
                back,
                style = TextStyle(fontSize = 12.sp)
            )
        }
    }
}

class StudyRAGWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = StudyRAGWidget()
}

private val Int.sp: androidx.compose.ui.unit.TextUnit
    get() = androidx.compose.ui.unit.TextUnit(this.toFloat(), androidx.compose.ui.unit.TextUnitType.Sp)
