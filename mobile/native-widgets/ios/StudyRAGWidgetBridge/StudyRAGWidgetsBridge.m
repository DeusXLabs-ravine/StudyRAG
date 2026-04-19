// Objective-C bridge so React Native can find the Swift module. This file is
// required even though the implementation is pure Swift.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(StudyRAGWidgets, NSObject)

RCT_EXTERN_METHOD(setDailyContent:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reload:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
