// Phone-side WatchConnectivity bridge — add to the main iOS app target.
// React Native calls NativeModules.StudyRAGWatch.syncToWatch(payload)

import Foundation
import WatchConnectivity

@objc(StudyRAGWatch)
class StudyRAGWatch: NSObject, WCSessionDelegate {
    private static let shared = StudyRAGWatch()
    private var session: WCSession?

    override init() {
        super.init()
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool { false }

    @objc
    func syncToWatch(_ payload: NSDictionary,
                     resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
        guard let s = session, s.activationState == .activated else {
            resolve(false)
            return
        }
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: []),
              let dict = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        else {
            reject("ENCODE_ERROR", "Cannot encode payload", nil)
            return
        }
        do {
            try s.updateApplicationContext(["studyragState": data])
            resolve(true)
        } catch {
            reject("WATCH_SYNC_ERROR", error.localizedDescription, error)
        }
    }

    // MARK: - WCSessionDelegate (required stubs)
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { session.activate() }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        if message["action"] as? String == "sync" {
            // The watch is requesting fresh state — reply with latest widget payload
            if let defaults = UserDefaults(suiteName: "group.com.studyrag.app"),
               let data = defaults.data(forKey: "StudyRAGWidgetPayload") {
                replyHandler(["studyragState": data])
            } else {
                replyHandler([:])
            }
        }
    }
}
