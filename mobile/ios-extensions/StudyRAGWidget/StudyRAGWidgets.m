// Objective-C bridge — required so React Native's module auto-linker sees it.
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(StudyRAGWidgets, NSObject)

RCT_EXTERN_METHOD(setDailyContent:(NSDictionary *)payload
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reload:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
