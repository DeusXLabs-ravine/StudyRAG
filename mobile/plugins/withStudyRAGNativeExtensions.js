const {
  withEntitlementsPlist,
  withAndroidManifest,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_GROUP = 'group.com.studyrag.app';

// ── iOS: App Group entitlement ──────────────────────────────────────────────

function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    const existing = mod.modResults['com.apple.security.application-groups'] ?? [];
    if (!existing.includes(APP_GROUP)) {
      mod.modResults['com.apple.security.application-groups'] = [...existing, APP_GROUP];
    }
    return mod;
  });
}

// ── Android: FlashcardWidget receiver in AndroidManifest ────────────────────

function withAndroidWidget(config) {
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) return mod;

    const receivers = app.receiver ?? [];
    const already = receivers.some(
      (r) => r.$?.['android:name'] === 'com.studyrag.widget.FlashcardWidget',
    );

    if (!already) {
      receivers.push({
        $: {
          'android:name': 'com.studyrag.widget.FlashcardWidget',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/widget_info',
            },
          },
        ],
      });
      app.receiver = receivers;
    }

    return mod;
  });
}

// ── Android: copy widget source + res files after prebuild ──────────────────

function withAndroidWidgetFiles(config) {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const projectRoot = mod.modRequest.projectRoot;
      const androidRoot = path.join(projectRoot, 'android', 'app', 'src', 'main');

      const srcKotlin = path.join(
        projectRoot,
        'android-extensions',
        'StudyRAGWidget',
        'src',
        'main',
        'java',
        'com',
        'studyrag',
        'widget',
      );
      const dstKotlin = path.join(androidRoot, 'java', 'com', 'studyrag', 'widget');

      const srcRes = path.join(
        projectRoot,
        'android-extensions',
        'StudyRAGWidget',
        'src',
        'main',
        'res',
      );
      const dstRes = path.join(androidRoot, 'res');

      copyDirSync(srcKotlin, dstKotlin);
      copyDirSync(srcRes, dstRes);

      return mod;
    },
  ]);
}

function copyDirSync(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// ── Compose ──────────────────────────────────────────────────────────────────

module.exports = function withStudyRAGNativeExtensions(config) {
  config = withAppGroupEntitlement(config);
  config = withAndroidWidget(config);
  config = withAndroidWidgetFiles(config);
  return config;
};
