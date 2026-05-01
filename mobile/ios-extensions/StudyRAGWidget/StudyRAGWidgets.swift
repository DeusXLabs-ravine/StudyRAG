// Native module exposed to React Native as NativeModules.StudyRAGWidgets
// Add this file inside the main app target (not the extension target) in Xcode.
// Register it via AppDelegate or the auto-linking Objective-C bridge header.

import Foundation
import WidgetKit

@objc(StudyRAGWidgets)
class StudyRAGWidgets: NSObject {
    private let suite   = "group.com.studyrag.app"
    private let dataKey = "StudyRAGWidgetPayload"

    @objc
    func setDailyContent(_ payload: NSDictionary,
                         resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock) {
        guard let defaults = UserDefaults(suiteName: suite) else {
            reject("NO_APP_GROUP", "App group '\(suite)' not configured in Xcode entitlements", nil)
            return
        }
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []) else {
            reject("ENCODE_ERROR", "Could not encode payload as JSON", nil)
            return
        }
        defaults.set(data, forKey: dataKey)
        resolve(nil)
    }

    @objc
    func reload(_ resolve: @escaping RCTPromiseResolveBlock,
                reject: @escaping RCTPromiseRejectBlock) {
        WidgetCenter.shared.reloadAllTimelines()
        resolve(nil)
    }

    @objc
    static func requiresMainQueueSetup() -> Bool { return false }
}
