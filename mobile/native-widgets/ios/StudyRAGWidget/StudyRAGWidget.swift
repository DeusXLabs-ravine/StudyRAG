// StudyRAGWidget — WidgetKit extension.
// Copy this folder into `mobile/ios/StudyRAGWidget/` AFTER running `expo prebuild`.
// Remember to add the App Group entitlement (`group.co.studyrag.widgets`) to
// BOTH the main app target and this widget target in Xcode before building.

import WidgetKit
import SwiftUI

// MARK: - Shared types

struct StudyRAGFlashcard: Codable {
    let front: String
    let back: String
}

struct StudyRAGDefinition: Codable {
    let term: String
    let meaning: String
}

struct StudyRAGWidgetPayload: Codable {
    let tier: String
    let flashcard: StudyRAGFlashcard
    let definition: StudyRAGDefinition?
    let generatedAt: String
}

enum StudyRAGShared {
    static let suiteName = "group.co.studyrag.widgets"
    static let payloadKey = "studyrag.widget.daily.v1"

    static func loadPayload() -> StudyRAGWidgetPayload? {
        guard
            let defaults = UserDefaults(suiteName: suiteName),
            let data = defaults.data(forKey: payloadKey)
        else { return nil }
        return try? JSONDecoder().decode(StudyRAGWidgetPayload.self, from: data)
    }
}

// MARK: - Timeline entry

struct StudyRAGEntry: TimelineEntry {
    let date: Date
    let payload: StudyRAGWidgetPayload?

    static var placeholder: StudyRAGEntry {
        StudyRAGEntry(
            date: Date(),
            payload: StudyRAGWidgetPayload(
                tier: "free",
                flashcard: .init(front: "Spaced repetition", back: "Review right before you'd forget."),
                definition: nil,
                generatedAt: ""
            )
        )
    }
}

// MARK: - Timeline provider

struct StudyRAGProvider: TimelineProvider {
    func placeholder(in context: Context) -> StudyRAGEntry { .placeholder }

    func getSnapshot(in context: Context, completion: @escaping (StudyRAGEntry) -> Void) {
        completion(StudyRAGEntry(date: Date(), payload: StudyRAGShared.loadPayload()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StudyRAGEntry>) -> Void) {
        let entry = StudyRAGEntry(date: Date(), payload: StudyRAGShared.loadPayload())
        // Refresh every 4 hours — the JS side calls `syncWidgets()` on
        // foreground anyway, so the timeline is a safety net.
        let next = Calendar.current.date(byAdding: .hour, value: 4, to: entry.date)!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Home-screen views

struct StudyRAGFlashcardView: View {
    let payload: StudyRAGWidgetPayload?

    var body: some View {
        let card = payload?.flashcard ?? .init(front: "Tap to open StudyRAG", back: "")
        VStack(alignment: .leading, spacing: 6) {
            Text("TODAY'S CARD")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(.secondary)
                .tracking(1.4)
            Text(card.front)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.primary)
                .lineLimit(3)
            Text(card.back)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.secondary)
                .lineLimit(4)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct StudyRAGDefinitionView: View {
    let definition: StudyRAGDefinition

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("DEFINITION · PRO")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(.accentColor)
                .tracking(1.4)
            Text(definition.term)
                .font(.system(size: 16, weight: .black))
                .foregroundColor(.primary)
                .lineLimit(2)
            Text(definition.meaning)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.secondary)
                .lineLimit(5)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Lock-screen views

struct StudyRAGLockRectangularView: View {
    let payload: StudyRAGWidgetPayload?

    var body: some View {
        let front = payload?.flashcard.front ?? "Open StudyRAG"
        VStack(alignment: .leading, spacing: 2) {
            Text("TODAY'S CARD").font(.system(size: 9, weight: .black)).tracking(1.2)
            Text(front).font(.system(size: 13, weight: .semibold)).lineLimit(2)
        }
    }
}

// MARK: - Widget entry points

struct StudyRAGFlashcardWidget: Widget {
    let kind: String = "StudyRAGFlashcardWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StudyRAGProvider()) { entry in
            Group {
                #if os(iOS)
                if #available(iOS 16.0, *) {
                    StudyRAGFlashcardContent(entry: entry)
                } else {
                    StudyRAGFlashcardView(payload: entry.payload)
                }
                #else
                StudyRAGFlashcardView(payload: entry.payload)
                #endif
            }
        }
        .configurationDisplayName("Flashcard")
        .description("A daily card to refresh what you're learning.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryRectangular,
            .accessoryCircular,
            .accessoryInline,
        ])
    }
}

@available(iOS 16.0, *)
struct StudyRAGFlashcardContent: View {
    @Environment(\.widgetFamily) var family
    let entry: StudyRAGEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            StudyRAGLockRectangularView(payload: entry.payload)
        case .accessoryCircular:
            Text("SRG").font(.system(size: 14, weight: .black))
        case .accessoryInline:
            Text(entry.payload?.flashcard.front ?? "StudyRAG")
        default:
            StudyRAGFlashcardView(payload: entry.payload)
        }
    }
}

struct StudyRAGDefinitionWidget: Widget {
    let kind: String = "StudyRAGDefinitionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StudyRAGProvider()) { entry in
            if let def = entry.payload?.definition {
                StudyRAGDefinitionView(definition: def)
            } else {
                // Non-Pro fallback — show the flashcard instead so the widget
                // is never blank.
                StudyRAGFlashcardView(payload: entry.payload)
            }
        }
        .configurationDisplayName("Definition — Pro")
        .description("A key concept from your notes. Requires StudyRAG Pro.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

@main
struct StudyRAGWidgetBundle: WidgetBundle {
    var body: some Widget {
        StudyRAGFlashcardWidget()
        StudyRAGDefinitionWidget()
    }
}
