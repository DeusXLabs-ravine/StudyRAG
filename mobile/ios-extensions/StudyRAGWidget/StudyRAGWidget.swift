import WidgetKit
import SwiftUI

// ---------------------------------------------------------------------------
// Shared data model — must match the JSON written by the RN native module
// (src/native/widgets.ts → StudyRAGWidgets native module → App Group UserDefaults)
// ---------------------------------------------------------------------------

struct WidgetFlashcard: Codable {
    let front: String
    let back: String
}

struct WidgetPayload: Codable {
    let tier: String
    let flashcard: WidgetFlashcard
    let generatedAt: String
}

let appGroupSuite = "group.com.studyrag.app"
let payloadKey    = "StudyRAGWidgetPayload"

func loadPayload() -> WidgetPayload? {
    guard let defaults = UserDefaults(suiteName: appGroupSuite),
          let data = defaults.data(forKey: payloadKey)
    else { return nil }
    return try? JSONDecoder().decode(WidgetPayload.self, from: data)
}

// ---------------------------------------------------------------------------
// Timeline provider
// ---------------------------------------------------------------------------

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> FlashcardEntry {
        FlashcardEntry(
            date: Date(),
            front: "What is spaced repetition?",
            back: "A learning technique that increases review intervals over time to improve long-term retention.",
            tier: "free"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (FlashcardEntry) -> Void) {
        let entry = entryFromPayload() ?? placeholder(in: context)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FlashcardEntry>) -> Void) {
        let entry    = entryFromPayload() ?? placeholder(in: context)
        // Refresh every hour; the RN app pushes updates on foreground via syncWidgets()
        let nextDate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextDate))
        completion(timeline)
    }

    private func entryFromPayload() -> FlashcardEntry? {
        guard let p = loadPayload() else { return nil }
        return FlashcardEntry(
            date: Date(),
            front: p.flashcard.front,
            back: p.flashcard.back,
            tier: p.tier
        )
    }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

struct FlashcardEntry: TimelineEntry {
    let date: Date
    let front: String
    let back: String
    let tier: String
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

struct StudyRAGWidgetEntryView: View {
    var entry: FlashcardEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallCardView(entry: entry)
        case .systemMedium:
            MediumCardView(entry: entry)
        default:
            MediumCardView(entry: entry)
        }
    }
}

struct SmallCardView: View {
    let entry: FlashcardEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "rectangle.on.rectangle")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.blue)
                Text("STUDYRAG")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(.blue)
                    .kerning(1.2)
            }
            Spacer()
            Text(entry.front)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                .lineLimit(4)
            Spacer()
            Text("Tap to flip")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(red: 0.39, green: 0.45, blue: 0.55))
        }
        .padding(14)
        .background(Color(red: 0.97, green: 0.98, blue: 0.99))
        .containerBackground(Color(red: 0.97, green: 0.98, blue: 0.99), for: .widget)
    }
}

struct MediumCardView: View {
    let entry: FlashcardEntry

    var body: some View {
        HStack(spacing: 0) {
            // Front side
            VStack(alignment: .leading, spacing: 8) {
                Label("Question", systemImage: "questionmark.circle.fill")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.blue)
                    .labelStyle(.titleAndIcon)
                Spacer()
                Text(entry.front)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    .lineLimit(4)
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

            Rectangle()
                .fill(Color(red: 0.89, green: 0.91, blue: 0.94))
                .frame(width: 1)

            // Back side
            VStack(alignment: .leading, spacing: 8) {
                Label("Answer", systemImage: "lightbulb.fill")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(Color(red: 0.55, green: 0.36, blue: 0.96))
                    .labelStyle(.titleAndIcon)
                Spacer()
                Text(entry.back)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color(red: 0.06, green: 0.09, blue: 0.16))
                    .lineLimit(4)
            }
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .background(Color.white)
        .containerBackground(Color.white, for: .widget)
    }
}

// ---------------------------------------------------------------------------
// Widget declaration
// ---------------------------------------------------------------------------

@main
struct StudyRAGWidget: Widget {
    let kind: String = "StudyRAGWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            StudyRAGWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("StudyRAG Flashcard")
        .description("Shows today's flashcard from your study library.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
