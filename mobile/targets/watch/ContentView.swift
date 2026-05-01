import SwiftUI
import WatchConnectivity

// MARK: - Models

struct WatchCard: Identifiable, Codable {
    let id: UUID
    let front: String
    let back: String
    init(front: String, back: String) {
        id = UUID()
        self.front = front
        self.back = back
    }
}

struct WatchPayload: Codable {
    var cards: [WatchCard]
    var streakDays: Int
    var xp: Int
    var topic: String
}

// MARK: - Connectivity

@MainActor
class ConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    @Published var payload = WatchPayload(cards: [], streakDays: 0, xp: 0, topic: "StudyRAG")
    @Published var connected = false

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
        loadCached()
    }

    // Request fresh data from phone
    func requestSync() {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["action": "sync"], replyHandler: { [weak self] reply in
            Task { @MainActor in
                self?.applyReply(reply)
            }
        }, errorHandler: nil)
    }

    private func applyReply(_ reply: [String: Any]) {
        guard let data = reply["studyragState"] as? Data,
              let p = try? JSONDecoder().decode(WatchPayload.self, from: data) else { return }
        payload = p
        UserDefaults.standard.set(data, forKey: "cachedPayload")
    }

    private func loadCached() {
        guard let data = UserDefaults.standard.data(forKey: "cachedPayload"),
              let p = try? JSONDecoder().decode(WatchPayload.self, from: data) else { return }
        payload = p
    }

    // MARK: WCSessionDelegate
    nonisolated func session(_ session: WCSession, activationDidCompleteWith state: WCSessionActivationState, error: Error?) {
        Task { @MainActor in self.connected = state == .activated }
    }
    nonisolated func session(_ session: WCSession, didReceiveApplicationContext context: [String: Any]) {
        guard let data = context["studyragState"] as? Data else { return }
        Task { @MainActor in self.applyReply(["studyragState": data]) }
    }
}

// MARK: - App

@main
struct StudyRAGWatchApp: App {
    @StateObject private var connectivity = ConnectivityManager()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                HomeView()
            }
            .environmentObject(connectivity)
        }
    }
}

// MARK: - Home

struct HomeView: View {
    @EnvironmentObject var conn: ConnectivityManager

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                // Logo + Title
                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(red: 0.055, green: 0.647, blue: 0.914))
                        .frame(width: 24, height: 24)
                        .overlay(
                            Text("S")
                                .font(.system(size: 13, weight: .black))
                                .foregroundColor(.white)
                        )
                    Text("StudyRAG")
                        .font(.system(size: 16, weight: .black))
                        .foregroundColor(Color(red: 0.055, green: 0.647, blue: 0.914))
                }
                .padding(.top, 8)

                // Stats
                HStack(spacing: 16) {
                    StatPill(icon: "flame.fill", color: .orange, value: "\(conn.payload.streakDays)d", label: "Streak")
                    StatPill(icon: "star.fill", color: .yellow, value: "\(conn.payload.xp)", label: "XP")
                }

                // Topic
                if !conn.payload.topic.isEmpty && conn.payload.topic != "StudyRAG" {
                    Text(conn.payload.topic)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                // Study button
                NavigationLink(destination: StudyView()) {
                    Label(
                        conn.payload.cards.isEmpty ? "Sync Cards" : "Study \(conn.payload.cards.count) Cards",
                        systemImage: conn.payload.cards.isEmpty ? "arrow.clockwise" : "rectangle.stack.fill"
                    )
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color(red: 0.055, green: 0.647, blue: 0.914))
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)

                // Sync button
                Button {
                    conn.requestSync()
                } label: {
                    Label("Sync", systemImage: "arrow.clockwise")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
                .padding(.bottom, 8)
            }
            .padding(.horizontal, 8)
        }
        .onAppear { conn.requestSync() }
    }
}

struct StatPill: View {
    let icon: String
    let color: Color
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 3) {
                Image(systemName: icon).foregroundColor(color).font(.system(size: 10))
                Text(value).font(.system(size: 16, weight: .black))
            }
            Text(label).font(.system(size: 9)).foregroundColor(.secondary)
        }
    }
}

// MARK: - Study (Flashcard Flip)

struct StudyView: View {
    @EnvironmentObject var conn: ConnectivityManager
    @State private var index = 0
    @State private var showBack = false
    @State private var rotation: Double = 0

    private var cards: [WatchCard] { conn.payload.cards }

    var body: some View {
        Group {
            if cards.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "rectangle.stack")
                        .font(.system(size: 28))
                        .foregroundColor(.secondary)
                    Text("No cards synced.\nOpen StudyRAG on phone.")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            } else {
                let card = cards[index % cards.count]
                VStack(spacing: 8) {
                    // Card count
                    Text("\(index % cards.count + 1) / \(cards.count)")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)

                    // Flip card
                    ZStack {
                        // Front
                        CardFace(text: card.front, label: "QUESTION",
                                 labelColor: Color(red: 0.055, green: 0.647, blue: 0.914))
                            .opacity(showBack ? 0 : 1)
                            .rotation3DEffect(.degrees(rotation), axis: (x: 0, y: 1, z: 0))

                        // Back
                        CardFace(text: card.back, label: "ANSWER",
                                 labelColor: Color(red: 0.682, green: 0.459, blue: 0.996))
                            .opacity(showBack ? 1 : 0)
                            .rotation3DEffect(.degrees(rotation - 180), axis: (x: 0, y: 1, z: 0))
                    }
                    .onTapGesture { flip() }

                    // Action buttons
                    if showBack {
                        HStack(spacing: 8) {
                            ActionButton(label: "Again", color: Color(red: 0.976, green: 0.451, blue: 0.086)) {
                                next()
                            }
                            ActionButton(label: "Got it", color: Color(red: 0.063, green: 0.725, blue: 0.506)) {
                                next()
                            }
                        }
                    } else {
                        Button("Flip") { flip() }
                            .buttonStyle(.borderedProminent)
                            .tint(Color(red: 0.055, green: 0.647, blue: 0.914))
                            .font(.system(size: 13, weight: .bold))
                    }
                }
                .padding(.horizontal, 6)
            }
        }
        .navigationTitle("Study")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func flip() {
        withAnimation(.easeInOut(duration: 0.35)) {
            rotation += 180
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.175) {
            showBack.toggle()
            WKInterfaceDevice.current().play(.click)
        }
    }

    private func next() {
        showBack = false
        rotation = 0
        index = (index + 1) % max(cards.count, 1)
        WKInterfaceDevice.current().play(.success)
    }
}

struct CardFace: View {
    let text: String
    let label: String
    let labelColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 8, weight: .black))
                .foregroundColor(labelColor)
                .tracking(1)

            Text(text)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.primary)
                .lineLimit(5)
                .minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(10)
        .frame(maxWidth: .infinity, minHeight: 80)
        .background(Color(white: 0.15))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct ActionButton: View {
    let label: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(color)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}
