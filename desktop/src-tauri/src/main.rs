// Prevent a console window on Windows in release builds. Keeps it in debug so
// `println!` and panics are still visible when developing locally.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{AboutMetadata, Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, Submenu, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

const SITE_URL: &str = "https://studyrag.co";
const SUPPORT_URL: &str = "https://studyrag.co/support";

fn build_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let new_doc = MenuItemBuilder::with_id("new-document", "New Document")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let reload = MenuItemBuilder::with_id("reload", "Reload")
        .accelerator("CmdOrCtrl+R")
        .build(app)?;
    let zoom_in = MenuItemBuilder::with_id("zoom-in", "Zoom In")
        .accelerator("CmdOrCtrl+=")
        .build(app)?;
    let zoom_out = MenuItemBuilder::with_id("zoom-out", "Zoom Out")
        .accelerator("CmdOrCtrl+-")
        .build(app)?;
    let zoom_reset = MenuItemBuilder::with_id("zoom-reset", "Actual Size")
        .accelerator("CmdOrCtrl+0")
        .build(app)?;
    let support = MenuItemBuilder::with_id("support", "Support").build(app)?;

    let file_menu: Submenu<tauri::Wry> = SubmenuBuilder::new(app, "File")
        .item(&new_doc)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&reload)
        .separator()
        .item(&zoom_in)
        .item(&zoom_out)
        .item(&zoom_reset)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, None)?)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&PredefinedMenuItem::about(
            app,
            Some("About StudyRAG"),
            Some(AboutMetadata {
                name: Some("StudyRAG".into()),
                version: Some(env!("CARGO_PKG_VERSION").into()),
                copyright: Some("© 2026 StudyRAG".into()),
                website: Some(SITE_URL.into()),
                website_label: Some("studyrag.co".into()),
                ..Default::default()
            }),
        )?)
        .item(&support)
        .build()?;

    MenuBuilder::new(app)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            // Menu
            let menu = build_menu(&app.handle())?;
            app.set_menu(menu)?;

            // System tray
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("StudyRAG")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            "new-document" => {
                // Navigate main window to the new-document flow.
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.eval(&format!("window.location.href = '{SITE_URL}/documents/new'"));
                }
            }
            "reload" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.eval("window.location.reload()");
                }
            }
            "zoom-in" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.eval(
                        "document.body.style.zoom = String(Math.min(2, parseFloat(document.body.style.zoom || '1') + 0.1))"
                    );
                }
            }
            "zoom-out" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.eval(
                        "document.body.style.zoom = String(Math.max(0.5, parseFloat(document.body.style.zoom || '1') - 0.1))"
                    );
                }
            }
            "zoom-reset" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.eval("document.body.style.zoom = '1'");
                }
            }
            "support" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.eval(&format!("window.open('{SUPPORT_URL}', '_blank')"));
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running StudyRAG desktop");
}

