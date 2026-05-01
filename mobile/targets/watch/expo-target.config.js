module.exports = () => ({
  type: "watch",
  name: "StudyRAGWatch",
  displayName: "StudyRAG",
  bundleIdentifier: "com.studyrag.app.watchkitapp",
  deploymentTarget: "9.0",
  icon: "../../assets/icon.png",
  frameworks: ["WatchKit", "WatchConnectivity", "SwiftUI"],
  entitlements: {
    "com.apple.security.application-groups": ["group.com.studyrag.app"],
  },
});
