// StudyRAGWidgetsBridge — RN native module.
// Place under `mobile/ios/StudyRAG/` and register with the React Native
// module system. Exposes two JS methods: `setDailyContent(payload)` and
// `reload()`. The TS wrapper in `mobile/src/native/widgets.ts` calls these.

import Foundation
import WidgetKit

@objc(StudyRAGWidgets)
class StudyRAGWidgets: NSObject {
  static let suiteName = "group.co.studyrag.widgets"
  static let payloadKey = "studyrag.widget.daily.v1"

  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(setDailyContent:resolver:rejecter:)
  func setDailyContent(payload: NSDictionary,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: Self.suiteName) else {
      reject("app_group_missing", "App Group \(Self.suiteName) is not configured for this target.", nil)
      return
    }
    do {
      let data = try JSONSerialization.data(withJSONObject: payload, options: [])
      defaults.set(data, forKey: Self.payloadKey)
      resolve(nil)
    } catch {
      reject("encode_failed", error.localizedDescription, error)
    }
  }

  @objc(reload:rejecter:)
  func reload(resolver resolve: @escaping RCTPromiseResolveBlock,
              rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
      resolve(nil)
    } else {
      reject("unsupported_os", "WidgetKit requires iOS 14+.", nil)
    }
  }
}
