module.exports = () => ({
  type: "widget",
  name: "StudyRAGWidget",
  displayName: "StudyRAG Flashcard",
  bundleIdentifier: "com.studyrag.app.widget",
  deploymentTarget: "16.0",
  icon: "../../assets/icon.png",
  frameworks: ["WidgetKit", "SwiftUI"],
  entitlements: {
    "com.apple.security.application-groups": ["group.com.studyrag.app"],
  },
});
