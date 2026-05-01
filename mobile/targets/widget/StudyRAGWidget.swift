import WidgetKit
import SwiftUI

// MARK: - Data Model

struct FlashcardEntry: TimelineEntry {
    let date: Date
    let front: String
    let back: String
    let topic: String
    let streakDays: Int
    let cardIndex: Int
    let totalCards: Int
}

// MARK: - Provider

struct FlashcardProvider: TimelineProvider {
    private let appGroup = "group.com.studyrag.app"
    private let payloadKey = "StudyRAGWidgetPayload"

    func placeholder(in context: Context) -> FlashcardEntry {
        FlashcardEntry(date: .now, front: "What is spaced repetition?",
                       back: "A learning technique that schedules reviews at increasing intervals.",
                       topic: "Study Techniques", streakDays: 7, cardIndex: 1, totalCards: 12)
    }

    func getSnapshot(in context: Context, completion: @escaping (FlashcardEntry) -> Void) {
        completion(load())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FlashcardEntry>) -> Void) {
        let entry = load()
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func load() -> FlashcardEntry {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let data = defaults.data(forKey: payloadKey),
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        else {
            return FlashcardEntry(date: .now, front: "Open StudyRAG to sync cards",
                                  back: "", topic: "StudyRAG", streakDays: 0, cardIndex: 0, totalCards: 0)
        }

        let cards = json["cards"] as? [[String: String]] ?? []
        let idx = (json["currentIndex"] as? Int) ?? 0
        let card = cards.isEmpty ? nil : cards[idx % cards.count]

        return FlashcardEntry(
            date: .now,
            front: card?["front"] ?? "No cards synced",
            back: card?["back"] ?? "",
            topic: json["topic"] as? String ?? "StudyRAG",
            streakDays: json["streakDays"] as? Int ?? 0,
            cardIndex: cards.isEmpty ? 0 : idx % cards.count + 1,
            totalCards: cards.count
        )
    }
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    let entry: FlashcardEntry

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(Color(red: 0.055, green: 0.647, blue: 0.914).gradient)

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("StudyRAG")
                        .font(.system(size: 10, weight: .black))
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                    if entry.streakDays > 0 {
                        Label("\(entry.streakDays)d", systemImage: "flame.fill")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.orange)
                    }
                }

                Spacer()

                Text(entry.front)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(4)
                    .minimumScaleFactor(0.8)

                Spacer()

                if entry.totalCards > 0 {
                    Text("\(entry.cardIndex)/\(entry.totalCards) cards")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .padding(12)
        }
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    let entry: FlashcardEntry

    var body: some View {
        ZStack {
            Color(red: 0.055, green: 0.647, blue: 0.914)

            HStack(spacing: 0) {
                // Question side
                VStack(alignment: .leading, spacing: 8) {
                    Label("QUESTION", systemImage: "questionmark.circle.fill")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(.white.opacity(0.7))
                        .labelStyle(.titleAndIcon)

                    Text(entry.front)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(4)

                    Spacer()

                    if entry.totalCards > 0 {
                        Text("\(entry.cardIndex) of \(entry.totalCards)")
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)

                // Divider
                Rectangle()
                    .fill(Color.white.opacity(0.2))
                    .frame(width: 1)

                // Answer side
                VStack(alignment: .leading, spacing: 8) {
                    Label("ANSWER", systemImage: "lightbulb.fill")
                        .font(.system(size: 9, weight: .black))
                        .foregroundColor(Color(red: 0.682, green: 0.459, blue: 0.996).opacity(0.9))
                        .labelStyle(.titleAndIcon)

                    Text(entry.back.isEmpty ? "Tap to reveal" : entry.back)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(entry.back.isEmpty ? .white.opacity(0.4) : .white)
                        .lineLimit(4)

                    Spacer()

                    Text(entry.topic)
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.6))
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
            }
        }
    }
}

// MARK: - Widget Bundle

struct StudyRAGWidget: Widget {
    let kind = "StudyRAGFlashcard"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FlashcardProvider()) { entry in
            Group {
                if #available(iOSApplicationExtension 17.0, *) {
                    SmallWidgetView(entry: entry)
                        .containerBackground(.fill.tertiary, for: .widget)
                } else {
                    SmallWidgetView(entry: entry)
                }
            }
        }
        .configurationDisplayName("Flashcard")
        .description("Review a flashcard from your current deck.")
        .supportedFamilies([.systemSmall])
    }
}

struct StudyRAGMediumWidget: Widget {
    let kind = "StudyRAGFlashcardMedium"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FlashcardProvider()) { entry in
            Group {
                if #available(iOSApplicationExtension 17.0, *) {
                    MediumWidgetView(entry: entry)
                        .containerBackground(.fill.tertiary, for: .widget)
                } else {
                    MediumWidgetView(entry: entry)
                }
            }
        }
        .configurationDisplayName("Flashcard — Q&A")
        .description("See today's question and answer side by side.")
        .supportedFamilies([.systemMedium])
    }
}

@main
struct StudyRAGWidgetBundle: WidgetBundle {
    var body: some Widget {
        StudyRAGWidget()
        StudyRAGMediumWidget()
    }
}
