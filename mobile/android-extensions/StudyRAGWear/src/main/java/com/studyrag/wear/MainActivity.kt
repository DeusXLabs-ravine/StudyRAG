package com.studyrag.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material.*
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.launch
import org.json.JSONArray

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

data class WearFlashcard(val front: String, val back: String)
data class WearState(
    val cards: List<WearFlashcard> = emptyList(),
    val streakDays: Int = 0,
    val xp: Int = 0,
)

// ---------------------------------------------------------------------------
// Main Activity
// ---------------------------------------------------------------------------

class MainActivity : ComponentActivity() {
    private lateinit var dataClient: DataClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        dataClient = Wearable.getDataClient(this)

        setContent {
            val scope = rememberCoroutineScope()
            var state by remember { mutableStateOf(WearState()) }

            LaunchedEffect(Unit) {
                // Request data from phone via Wearable Data Layer
                scope.launch { state = fetchStateFromPhone(dataClient) }
            }

            WearApp(state = state)
        }
    }

    private suspend fun fetchStateFromPhone(client: DataClient): WearState {
        return try {
            val items = client.dataItems.await()
            var result = WearState()
            items.forEach { item ->
                if (item.uri.path == "/studyrag/state") {
                    val map = DataMapItem.fromDataItem(item).dataMap
                    val cardsJson = map.getString("cards", "[]")
                    val cardsArray = JSONArray(cardsJson)
                    val cards = (0 until cardsArray.length()).map { i ->
                        val obj = cardsArray.getJSONObject(i)
                        WearFlashcard(
                            front = obj.optString("front", ""),
                            back = obj.optString("back", "")
                        )
                    }
                    result = WearState(
                        cards = cards,
                        streakDays = map.getInt("streakDays", 0),
                        xp = map.getInt("xp", 0)
                    )
                }
            }
            result
        } catch (e: Exception) {
            WearState()
        }
    }
}

// ---------------------------------------------------------------------------
// Wear Compose UI
// ---------------------------------------------------------------------------

@Composable
fun WearApp(state: WearState) {
    val navController = rememberSwipeDismissableNavController()

    MaterialTheme {
        SwipeDismissableNavHost(
            navController = navController,
            startDestination = "home"
        ) {
            composable("home") {
                HomeScreen(state = state, onStudy = { navController.navigate("study") })
            }
            composable("study") {
                StudyScreen(cards = state.cards)
            }
        }
    }
}

@Composable
fun HomeScreen(state: WearState, onStudy: () -> Unit) {
    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(top = 28.dp, bottom = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text(
                text = "StudyRAG",
                fontSize = 14.sp,
                fontWeight = FontWeight.Black,
                color = Color(0xFF0EA5E9),
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatChip(label = "🔥 Streak", value = "${state.streakDays}d")
                StatChip(label = "⭐ XP", value = "${state.xp}")
            }
        }
        item {
            Chip(
                onClick = onStudy,
                label = {
                    Text("Study ${state.cards.size} cards", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                },
                modifier = Modifier.fillMaxWidth(0.85f),
                colors = ChipDefaults.primaryChipColors(backgroundColor = Color(0xFF0EA5E9))
            )
        }
    }
}

@Composable
fun StatChip(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = value, fontSize = 18.sp, fontWeight = FontWeight.Black)
        Text(text = label, fontSize = 10.sp, color = Color.Gray)
    }
}

@Composable
fun StudyScreen(cards: List<WearFlashcard>) {
    var index by remember { mutableIntStateOf(0) }
    var showBack by remember { mutableStateOf(false) }

    if (cards.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Open StudyRAG on phone to sync cards.", textAlign = TextAlign.Center, fontSize = 13.sp)
        }
        return
    }

    val card = cards[index % cards.size]

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = if (showBack) "ANSWER" else "QUESTION",
            fontSize = 9.sp,
            fontWeight = FontWeight.Black,
            color = if (showBack) Color(0xFF8B5CF6) else Color(0xFF0EA5E9),
            letterSpacing = 1.2.sp
        )

        Text(
            text = if (showBack) card.back else card.front,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            maxLines = 5,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f).padding(vertical = 8.dp)
        )

        if (showBack) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CompactChip(
                    onClick = {
                        showBack = false
                        index = (index + 1) % cards.size
                    },
                    label = { Text("Again", fontSize = 11.sp) },
                    colors = ChipDefaults.primaryChipColors(backgroundColor = Color(0xFFF97316))
                )
                CompactChip(
                    onClick = {
                        showBack = false
                        index = (index + 1) % cards.size
                    },
                    label = { Text("Got it", fontSize = 11.sp) },
                    colors = ChipDefaults.primaryChipColors(backgroundColor = Color(0xFF10B981))
                )
            }
        } else {
            CompactChip(
                onClick = { showBack = true },
                label = { Text("Flip", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                colors = ChipDefaults.primaryChipColors(backgroundColor = Color(0xFF0EA5E9))
            )
        }

        Text(
            text = "${(index % cards.size) + 1} / ${cards.size}",
            fontSize = 10.sp,
            color = Color.Gray
        )
    }
}
