#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
pub mod functions;
pub mod read;
pub mod statics;
pub mod write;

use commands::*;
use log::error;
use serde::Deserialize;
use std::fmt::Debug;
use tauri::{generate_context, generate_handler, App, Builder, Manager};

#[macro_export]
macro_rules! println {
    ($($arg:tt)*) => {{
        log::info!($($arg)*);
    }};
}

#[macro_export]
macro_rules! eprintln {
    ($($arg:tt)*) => {{
        log::error!($($arg)*);
    }};
}

trait OptionExt<T> {
    fn unwrap_log(self, file: &str, line: u32) -> T;
}

trait ResultExt<T, E> {
    fn unwrap_log(self, file: &str, line: u32) -> T
    where
        E: Debug;
}

impl<T> OptionExt<T> for Option<T> {
    fn unwrap_log(self, file: &str, line: u32) -> T {
        match self {
            Some(value) => value,
            None => {
                error!(
                    "FILE: {} LINE: {} - called `Option::unwrap_log()` on a `None` value",
                    file, line
                );
                panic!("called `Option::unwrap_log()` on a `None` value");
            }
        }
    }
}

impl<T, E> ResultExt<T, E> for Result<T, E> {
    fn unwrap_log(self, file: &str, line: u32) -> T
    where
        E: Debug,
    {
        match self {
            Ok(value) => value,
            Err(err) => {
                error!(
                    "FILE: {} LINE: {} - called `Result::unwrap_log()` on an `Err` value: {:?}",
                    file, line, err
                );
                panic!("called `Result::unwrap_log()` on an `Err` value: {:?}", err);
            }
        }
    }
}

#[derive(PartialEq, Clone, Copy)]
pub enum GameType {
    Termina,
    LisaRPG,
}

#[derive(PartialEq, Clone, Copy)]
#[repr(u8)]
#[allow(dead_code)]
pub enum ProcessingMode {
    Force,
    Append,
    Default,
}

#[derive(PartialEq, Clone, Copy)]
#[repr(u8)]
#[allow(dead_code)]
pub enum EngineType {
    New,
    VXAce,
    VX,
    XP,
}

#[derive(PartialEq, Clone, Copy)]
#[repr(u8)]
#[allow(dead_code)]
pub enum MapsProcessingMode {
    Default,
    Separate,
    Preserve,
}

#[derive(PartialEq)]
enum Code {
    Dialogue, // also goes for credit
    Choice,
    System,
    Misc,
}

#[derive(PartialEq, Clone, Copy)]
enum Variable {
    Name,
    Nickname,
    Description,
    Message1,
    Message2,
    Message3,
    Message4,
    Note,
}

#[derive(Deserialize)]
enum Language {
    English,
    Russian,
}

pub struct Localization<'a> {
    file_written_msg: &'a str,
    file_parsed_msg: &'a str,
    file_already_parsed_msg: &'a str,
    file_is_not_parsed_msg: &'a str,

    could_not_split_line_msg: &'a str,
    at_position_msg: &'a str,
    could_not_replace_scripts_string: &'a str,
}

impl Localization<'_> {
    fn new(language: Language) -> Self {
        match language {
            Language::English => Self::init_en(),
            Language::Russian => Self::init_ru(),
        }
    }

    fn init_en() -> Self {
        Localization {
            file_written_msg: "Wrote file",
            file_parsed_msg: "Parsed file",
            file_already_parsed_msg: "file already exists. If you want to forcefully re-read files or append new text, use --mode force or --mode append.",
            file_is_not_parsed_msg: "Files aren't already parsed. Continuing as if --append flag was omitted.",
            could_not_split_line_msg: "Couldn't split line to original and translated part.\nThe line won't be written to the output file.",
            at_position_msg: "At position:",
            could_not_replace_scripts_string: "Couldn't replace string in scripts file.",
        }
    }

    fn init_ru() -> Self {
        Localization {
            file_written_msg: "Записан файл",
            file_parsed_msg: "Распарсен файл",
            file_already_parsed_msg: "уже существует. Если вы хотите принудительно перезаписать все файлы, или добавить новый текст, используйте --mode force или --mode append.",
            file_is_not_parsed_msg: "Файлы ещё не распарсены. Продолжаем в режиме с выключенным флагом --append.",
            could_not_split_line_msg: "Не удалось разделить строку на оригинальную и переведённую части.\nСтрока не будет записана в выходной файл.",
            at_position_msg: "Позиция:",
            could_not_replace_scripts_string: "Не удалось заменить строку в файле скриптов.",
        }
    }
}

fn main() {
    Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview))
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let window: tauri::WebviewWindow = unsafe { app.get_webview_window("main").unwrap_unchecked() };
            let _ = window.maximize();
            let _ = window.set_focus();
        }))
        .invoke_handler(generate_handler![
            escape_text,
            read,
            compile,
            read_last_line,
            translate_text,
            add_to_scope
        ])
        .setup(|_app: &mut App| {
            #[cfg(debug_assertions)]
            _app.get_webview_window("main")
                .unwrap_log(file!(), line!())
                .open_devtools();
            Ok(())
        })
        .run(generate_context!())
        .expect("error while running tauri application");
}
