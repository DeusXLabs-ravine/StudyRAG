import SwiftUI
import WatchConnectivity

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

struct WatchFlashcard: Identifiable, Codable {
    let id: String
    let front: String
    let back: String
}

struct WatchState: Codable {
    var cards: [WatchFlashcard]
    var streakDays: Int
    var xp: Int
    var syncedAt: String
}

// ---------------------------------------------------------------------------
// WatchConnectivity session delegate
// ---------------------------------------------------------------------------

class ConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    @Published var state: WatchState = WatchState(cards: [], streakDays: 0, xp: 0, syncedAt: "")
    @Published var connected: Bool = false

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // Called when phone sends updateApplicationContext
    func session(_ session: WCSession,
                 didReceiveApplicationContext applicationContext: [String : Any]) {
        DispatchQueue.main.async {
            if let data = applicationContext["studyragState"] as? Data,
               let decoded = try? JSONDecoder().decode(WatchState.self, from: data) {
                self.state = decoded
            }
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { self.connected = activationState == .activated }
    }

    // Request fresh data from phone
    func requestSync() {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["action": "sync"], replyHandler: { reply in
            if let data = reply["studyragState"] as? Data,
               let decoded = try? JSONDecoder().decode(WatchState.self, from: data) {
                DispatchQueue.main.async { self.state = decoded }
            }
        }, errorHandler: nil)
    }
}

// ---------------------------------------------------------------------------
// Main flashcard view
// ---------------------------------------------------------------------------

struct FlashcardStudyView: View {
    let cards: [WatchFlashcard]
    @State private var index = 0
    @State private var showBack = false

    var card: WatchFlashcard? { cards.isEmpty ? nil : cards[index % cards.count] }

    var body: some View {
        if let c = card {
            VStack(spacing: 8) {
                Text(showBack ? "Answer" : "Question")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(showBack ? .purple : .blue)
                    .textCase(.uppercase)
                    .kerning(1.2)

                Spacer()

                Text(showBack ? c.back : c.front)
                    .font(.system(size: 14, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .foregroundColor(.primary)
                    .animation(.easeInOut(duration: 0.2), value: showBack)

                Spacer()

                if showBack {
                    HStack(spacing: 8) {
                        Button {
                            WKInterfaceDevice.current().play(.failure)
                            showBack = false
                            index = (index + 1) % cards.count
                        } label: {
                            Label("Again", systemImage: "arrow.counterclockwise")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.orange)
                        }
                        .buttonStyle(.plain)

                        Button {
                            WKInterfaceDevice.current().play(.success)
                            showBack = false
                            index = (index + 1) % cards.count
                        } label: {
                            Label("Got it", systemImage: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.green)
                        }
                        .buttonStyle(.plain)
                    }
                } else {
                    Button {
                        WKInterfaceDevice.current().play(.click)
                        withAnimation { showBack = true }
                    } label: {
                        Text("Flip card")
                            .font(.system(size: 13, weight: .bold))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.15))
                            .cornerRadius(20)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 4)
            .navigationTitle("\(index + 1) / \(cards.count)")
            .navigationBarTitleDisplayMode(.inline)
        } else {
            VStack(spacing: 8) {
                Image(systemName: "books.vertical.fill")
                    .font(.system(size: 28))
                    .foregroundColor(.blue.opacity(0.6))
                Text("No cards yet")
                    .font(.system(size: 13, weight: .semibold))
                Text("Open StudyRAG on your iPhone to sync flashcards.")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
    }
}

// ---------------------------------------------------------------------------
// Stats view
// ---------------------------------------------------------------------------

struct StatsView: View {
    let state: WatchState

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                Text("\(state.streakDays) day streak")
                    .font(.system(size: 13, weight: .bold))
            }
            HStack {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
                Text("\(state.xp) XP")
                    .font(.system(size: 13, weight: .bold))
            }
            Text("Cards: \(state.cards.count)")
                .font(.system(size: 12))
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 4)
        .navigationTitle("Stats")
    }
}

// ---------------------------------------------------------------------------
// Root content view
// ---------------------------------------------------------------------------

struct ContentView: View {
    @StateObject private var connectivity = ConnectivityManager()

    var body: some View {
        TabView {
            NavigationStack {
                FlashcardStudyView(cards: connectivity.state.cards)
            }
            .tabItem { Label("Cards", systemImage: "rectangle.on.rectangle") }

            NavigationStack {
                StatsView(state: connectivity.state)
            }
            .tabItem { Label("Stats", systemImage: "chart.bar.fill") }
        }
        .onAppear { connectivity.requestSync() }
    }
}

@main
struct StudyRAGWatchApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
