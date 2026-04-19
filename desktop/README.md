# StudyRAG Desktop (Tauri)

Windows + macOS wrapper around `studyrag.co`. The desktop app deliberately
mirrors the web experience instead of being standalone like the mobile app —
so desktop users stay in lockstep with web releases for free.

## Prerequisites

- Node 18+ and pnpm / npm
- Rust toolchain (install via [rustup](https://rustup.rs/))
- Platform build tools:
  - **Windows:** Microsoft C++ Build Tools + WebView2 (preinstalled on Win11)
  - **macOS:** Xcode Command Line Tools (`xcode-select --install`)

## First-time setup — generate icons from the StudyRAG logo

The source logo (1024×1024) is already copied in at `src-tauri/icons/source.png`
(taken from `mobile/assets/icon.png`). Run this once to generate every icon
Tauri needs across Windows (`.ico`), macOS (`.icns`), and the rest:

```bash
cd desktop
pnpm install
pnpm tauri icon src-tauri/icons/source.png
```

That's it — Tauri writes `32x32.png`, `128x128.png`, `128x128@2x.png`,
`icon.icns`, `icon.ico`, plus an `icon.png` used as the tray icon. Commit
them.

## Dev loop

```bash
cd desktop
pnpm tauri dev
```

A native window opens and loads `https://studyrag.co` with native menus, tray
icon, and window-state persistence. Edit `src-tauri/src/main.rs` and save to
hot-reload the Rust side; the web side is just the live site.

## Production builds

```bash
# Windows (.msi + .exe)
pnpm tauri build --target x86_64-pc-windows-msvc

# macOS (universal — Apple Silicon + Intel in one .dmg)
pnpm tauri build --target universal-apple-darwin

# macOS separate
pnpm tauri build --target aarch64-apple-darwin   # M1/M2/M3
pnpm tauri build --target x86_64-apple-darwin    # Intel
```

Outputs land in `src-tauri/target/{profile}/bundle/`.

Cross-compilation is limited: build Windows from Windows, macOS from macOS.
CI runners (GitHub Actions macos-latest + windows-latest) handle both in one
workflow.

## About code signing (the scary-looking warnings)

**You can totally ship the app without signing it.** It will still run on
Windows and macOS. What happens is:

- **Windows:** SmartScreen pops a blue box saying "Windows protected your PC"
  with a tiny "More info → Run anyway" link. Scary for non-technical users.
- **macOS:** Gatekeeper blocks the first launch with "can't be opened because
  Apple cannot check it for malicious software." Users have to right-click →
  Open → Open once to bypass it.

To make those warnings go away, you pay for code-signing certificates:

- **Apple Developer Program:** $99/year. Gives you a `Developer ID Application`
  certificate. After signing + notarizing, Gatekeeper shows no warning.
- **Windows code-signing cert:** $200–400/year from DigiCert, Sectigo, or
  SSL.com. After signing, SmartScreen eventually builds reputation and stops
  warning (OV certs take weeks, EV certs warn-free from day one but cost
  more).

**For a closed beta, skip both.** Tell testers "right-click → Open" on Mac
and "More info → Run anyway" on Windows. Sign things once you're charging
real money and strangers are installing.

When you're ready to sign, set these env vars before `pnpm tauri build`:

```bash
# macOS
export APPLE_CERTIFICATE="<base64-encoded .p12>"
export APPLE_CERTIFICATE_PASSWORD="<password>"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
export APPLE_ID="you@apple.example"
export APPLE_PASSWORD="<app-specific-password>"
export APPLE_TEAM_ID="<team-id>"

# Windows
export WINDOWS_CERTIFICATE="<base64-encoded .pfx>"
export WINDOWS_CERTIFICATE_PASSWORD="<password>"
```

Tauri picks them up and signs + notarizes automatically.

## About `updates.studyrag.co` — the auto-update server (currently disabled)

Tauri has a built-in auto-updater that pings a URL (like
`updates.studyrag.co`) once per launch, asks "is there a new version?", and
downloads + installs it if so. To run one, you'd need to:

1. Stand up a tiny web service (or even a static JSON file on S3/Cloudflare
   Pages) at `updates.studyrag.co`.
2. Generate a Tauri signing keypair with `pnpm tauri signer generate`.
3. For every release, publish a signed JSON manifest like:
   ```json
   { "version": "0.2.0", "notes": "...", "pub_date": "...",
     "platforms": { "windows-x86_64": { "signature": "...", "url": "..." } } }
   ```

**This is disabled for now.** `tauri.conf.json` ships without an updater
plugin, and the `tauri-plugin-updater` dep is not pulled into `Cargo.toml`.
The app won't try to phone any server — users update by downloading a new
installer the old-fashioned way.

Turn it back on later by:
1. Adding `tauri-plugin-updater = "2"` back to `Cargo.toml`.
2. Re-adding `.plugin(tauri_plugin_updater::Builder::new().build())` in `main.rs`.
3. Re-adding `updater:default` to `capabilities/main.json` permissions.
4. Re-adding the `plugins.updater` block to `tauri.conf.json` with your real
   `updates.studyrag.co` endpoint and public key.

## What's next

- [x] ~~Drop a real 1024×1024 brand icon and run `pnpm tauri icon`~~ — source
      ready at `src-tauri/icons/source.png`, run the command once to generate
- [ ] Wire Apple + Windows code-signing certs into CI (see above — optional
      until paid launch)
- [ ] Add `File → Open Local Document` that POSTs to `/api/documents/register`
      so desktop users can drag-drop files
- [ ] Publish first beta to an internal channel
- [ ] (Later) Stand up `updates.studyrag.co` + re-enable the Tauri updater
