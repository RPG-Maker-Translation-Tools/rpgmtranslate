#![allow(clippy::too_many_arguments)]

use lazy_static::lazy_static;
use regex::{escape, Regex};
use rpgmad_lib::Decrypter;
use rvpacker_lib::{
    parse_ignore,
    purge::*,
    read::*,
    types::{EngineType, GameType, IgnoreMap, MapsProcessingMode, ProcessingMode, ResultExt},
    write::*,
};
use std::{
    fs::{self, create_dir_all, read_dir, read_to_string, remove_file, write, File, OpenOptions},
    io::{BufRead, BufReader, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    time::{Duration, Instant},
};
use tauri::{command, Manager, Runtime, Scopes, Window};
use tauri_plugin_fs::FsExt;
use tokio::time::sleep;
use translators::{GoogleTranslator, Translator};
use walkdir::WalkDir;

lazy_static! {
    pub static ref GOOGLE_TRANS: GoogleTranslator = GoogleTranslator::default();
}

#[inline(always)]
fn get_game_type(game_title: &str) -> Option<GameType> {
    let lowercased: String = game_title.to_lowercase();

    if Regex::new(r"\btermina\b").unwrap_log().is_match(&lowercased) {
        Some(GameType::Termina)
    } else if Regex::new(r"\blisa\b").unwrap_log().is_match(&lowercased) {
        Some(GameType::LisaRPG)
    } else {
        None
    }
}

fn is_crlf(file_path: &Path) -> bool {
    let file: File = File::open(file_path).unwrap_log();
    let mut reader: BufReader<File> = BufReader::new(file);
    let mut line: String = String::new();
    let _ = reader.read_line(&mut line);

    line.contains('\r')
}

fn replace_crlf(file_path: &Path) {
    let content: String = read_to_string(file_path).unwrap_log();
    write(file_path, content.replace('\r', "")).unwrap_log();
}

#[command]
pub fn convert_to_lf(translation_path: &str) {
    for entry in read_dir(translation_path).unwrap_log().flatten() {
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        if is_crlf(&path) {
            replace_crlf(&path);
        }
    }
}

#[command]
pub fn escape_text(text: &str) -> String {
    escape(text)
}

#[command]
pub fn walk_dir(dir: &str) -> Vec<String> {
    let mut entries: Vec<String> = Vec::new();

    for entry in WalkDir::new(dir).into_iter().flatten() {
        if entry.file_type().is_file() {
            entries.push(entry.path().to_str().unwrap().to_string())
        }
    }

    entries
}

#[command(async)]
pub fn compile(
    project_path: &Path,
    original_dir: &Path,
    output_path: &Path,
    game_title: &str,
    maps_processing_mode: MapsProcessingMode,
    romanize: bool,
    disable_custom_processing: bool,
    disable_processing: [bool; 4],
    engine_type: EngineType,
) -> f64 {
    const LOGGING: bool = true;

    let start_time: Instant = Instant::now();

    let maps_processing_mode: MapsProcessingMode = maps_processing_mode;
    let engine_type: EngineType = engine_type;

    let extension: &str = match engine_type {
        EngineType::New => ".json",
        EngineType::VXAce => ".rvdata2",
        EngineType::VX => ".rvdata",
        EngineType::XP => ".rxdata",
    };

    let data_dir: &PathBuf = &PathBuf::from(".rpgmtranslate");
    let original_path: &PathBuf = &project_path.join(original_dir);
    let js_path: &PathBuf = &project_path.join("js");
    let translation_path: &PathBuf = &project_path.join(data_dir).join("translation");

    let (data_output_path, plugins_output_path) = if engine_type == EngineType::New {
        let plugins_output_path: PathBuf = output_path.join(data_dir).join("output/js");
        create_dir_all(&plugins_output_path).unwrap_log();

        (
            &output_path.join(data_dir).join("output/data"),
            Some(plugins_output_path),
        )
    } else {
        (&output_path.join(data_dir).join("output/Data"), None)
    };

    create_dir_all(data_output_path).unwrap_log();

    let game_type: Option<GameType> = if disable_custom_processing {
        None
    } else {
        get_game_type(game_title)
    };

    if !disable_processing[0] {
        MapWriter::new(original_path, translation_path, data_output_path, engine_type)
            .maps_processing_mode(maps_processing_mode)
            .romanize(romanize)
            .logging(LOGGING)
            .game_type(game_type)
            .write();
    }

    if !disable_processing[1] {
        OtherWriter::new(original_path, translation_path, data_output_path, engine_type)
            .romanize(romanize)
            .logging(LOGGING)
            .game_type(game_type)
            .write();
    }

    if !disable_processing[2] {
        SystemWriter::new(
            &original_path.join(String::from("System") + extension),
            translation_path,
            data_output_path,
            engine_type,
        )
        .romanize(romanize)
        .logging(LOGGING)
        .write();
    }

    if !disable_processing[3] {
        if engine_type == EngineType::New {
            PluginWriter::new(&js_path.join("plugins.js"), translation_path, &unsafe {
                plugins_output_path.unwrap_unchecked()
            })
            .romanize(romanize)
            .logging(LOGGING)
            .write();
        } else {
            ScriptWriter::new(
                &original_path.join(String::from("Scripts") + extension),
                translation_path,
                data_output_path,
            )
            .romanize(romanize)
            .logging(LOGGING)
            .write();
        }
    }

    start_time.elapsed().as_secs_f64()
}

#[command(async)]
pub fn read(
    project_path: &Path,
    original_dir: &Path,
    game_title: &str,
    maps_processing_mode: MapsProcessingMode,
    romanize: bool,
    disable_custom_processing: bool,
    disable_processing: [bool; 4],
    processing_mode: ProcessingMode,
    engine_type: EngineType,
    ignore: bool,
) {
    const LOGGING: bool = true;

    let processing_mode: ProcessingMode = processing_mode;
    let engine_type: EngineType = engine_type;
    let maps_processing_mode: MapsProcessingMode = maps_processing_mode;

    let extension: &str = match engine_type {
        EngineType::New => ".json",
        EngineType::VXAce => ".rvdata2",
        EngineType::VX => ".rvdata",
        EngineType::XP => ".rxdata",
    };

    let game_type: Option<GameType> = if disable_custom_processing {
        None
    } else {
        get_game_type(game_title)
    };

    let data_dir: &PathBuf = &PathBuf::from(".rpgmtranslate");
    let original_path: &PathBuf = &project_path.join(original_dir);
    let js_path: &PathBuf = &project_path.join("js");
    let translation_path: &PathBuf = &project_path.join(data_dir).join("translation");

    create_dir_all(translation_path).unwrap_log();

    if !disable_processing[0] {
        MapReader::new(original_path, translation_path, engine_type)
            .maps_processing_mode(maps_processing_mode)
            .romanize(romanize)
            .logging(LOGGING)
            .game_type(game_type)
            .processing_mode(processing_mode)
            .ignore(ignore)
            .read();
    }

    if !disable_processing[1] {
        OtherReader::new(original_path, translation_path, engine_type)
            .romanize(romanize)
            .logging(LOGGING)
            .game_type(game_type)
            .processing_mode(processing_mode)
            .ignore(ignore)
            .read();
    }

    if !disable_processing[2] {
        SystemReader::new(
            &original_path.join(String::from("System") + extension),
            translation_path,
            engine_type,
        )
        .romanize(romanize)
        .logging(LOGGING)
        .processing_mode(processing_mode)
        .ignore(ignore)
        .read();
    }

    if !disable_processing[3] {
        if engine_type == EngineType::New {
            PluginReader::new(&js_path.join("plugins.js"), translation_path)
                .romanize(romanize)
                .logging(LOGGING)
                .processing_mode(processing_mode)
                .ignore(ignore)
                .read();
        } else {
            ScriptReader::new(
                &original_path.join(String::from("Scripts") + extension),
                translation_path,
            )
            .romanize(romanize)
            .logging(LOGGING)
            .processing_mode(processing_mode)
            .ignore(ignore)
            .read();
        }
    }
}

#[command]
pub fn purge(
    project_path: &Path,
    original_dir: &Path,
    game_title: &str,
    maps_processing_mode: MapsProcessingMode,
    romanize: bool,
    disable_custom_processing: bool,
    disable_processing: [bool; 4],
    engine_type: EngineType,
    stat: bool,
    leave_filled: bool,
    purge_empty: bool,
    create_ignore: bool,
) {
    const LOGGING: bool = true;

    let extension: &str = match engine_type {
        EngineType::New => ".json",
        EngineType::VXAce => ".rvdata2",
        EngineType::VX => ".rvdata",
        EngineType::XP => ".rxdata",
    };

    let game_type: Option<GameType> = if disable_custom_processing {
        None
    } else {
        get_game_type(game_title)
    };

    let data_dir: &PathBuf = &PathBuf::from(".rpgmtranslate");
    let original_path: &PathBuf = &project_path.join(original_dir);
    let js_path: &PathBuf = &project_path.join("js");
    let translation_path: &PathBuf = &project_path.join(data_dir).join("translation");

    if stat && translation_path.join("stat.txt").exists() {
        remove_file(translation_path.join("stat.txt")).unwrap_log();
    }

    create_dir_all(translation_path).unwrap_log();

    let mut ignore_map: IgnoreMap = IgnoreMap::default();

    if create_ignore && translation_path.join(".rvpacker-ignore").exists() {
        ignore_map = parse_ignore(translation_path.join(".rvpacker-ignore"));
    }

    let mut stat_vec: Vec<(String, String)> = Vec::new();

    if !disable_processing[0] {
        MapPurger::new(original_path, translation_path, engine_type)
            .maps_processing_mode(maps_processing_mode)
            .romanize(romanize)
            .logging(LOGGING)
            .game_type(game_type)
            .stat(stat)
            .leave_filled(leave_filled)
            .purge_empty(purge_empty)
            .create_ignore(create_ignore)
            .purge(Some(&mut ignore_map), Some(&mut stat_vec));
    }

    if !disable_processing[1] {
        OtherPurger::new(original_path, translation_path, engine_type)
            .romanize(romanize)
            .logging(LOGGING)
            .game_type(game_type)
            .stat(stat)
            .leave_filled(leave_filled)
            .purge_empty(purge_empty)
            .create_ignore(create_ignore)
            .purge(Some(&mut ignore_map), Some(&mut stat_vec));
    }

    if !disable_processing[2] {
        SystemPurger::new(
            &original_path.join(String::from("System") + extension),
            translation_path,
            engine_type,
        )
        .romanize(romanize)
        .logging(LOGGING)
        .stat(stat)
        .leave_filled(leave_filled)
        .purge_empty(purge_empty)
        .create_ignore(create_ignore)
        .purge(Some(&mut ignore_map), Some(&mut stat_vec));
    }

    if !disable_processing[3] {
        if engine_type == EngineType::New {
            PluginPurger::new(&js_path.join("plugins.js"), translation_path)
                .romanize(romanize)
                .logging(LOGGING)
                .stat(stat)
                .leave_filled(leave_filled)
                .purge_empty(purge_empty)
                .create_ignore(create_ignore)
                .purge(Some(&mut ignore_map), Some(&mut stat_vec));
        } else {
            ScriptPurger::new(
                &original_path.join(String::from("Scripts") + extension),
                translation_path,
            )
            .romanize(romanize)
            .logging(LOGGING)
            .stat(stat)
            .leave_filled(leave_filled)
            .purge_empty(purge_empty)
            .create_ignore(create_ignore)
            .purge(Some(&mut ignore_map), Some(&mut stat_vec));
        }
    }

    if create_ignore {
        write_ignore(ignore_map, translation_path);
    }

    if stat {
        write_stat(stat_vec, translation_path);
    }
}

#[command]
pub fn read_last_line(file_path: &Path) -> String {
    let mut file: File = File::open(file_path).unwrap_log();
    let mut buffer: Vec<u8> = Vec::new();

    let mut position: u64 = file.seek(SeekFrom::End(0)).unwrap_log();

    while position > 0 {
        position -= 1;
        file.seek(SeekFrom::Start(position)).unwrap_log();

        let mut byte: [u8; 1] = [0; 1];
        file.read_exact(&mut byte).unwrap_log();

        if byte[0] == b'\n' && !buffer.is_empty() {
            break;
        }

        buffer.push(byte[0]);
    }

    buffer.reverse();
    unsafe { String::from_utf8_unchecked(buffer) }
}

#[command]
pub async fn translate_text(text: String, from: String, to: String, replace: bool) -> String {
    sleep(Duration::from_millis(5)).await;

    let mut translated: String = GOOGLE_TRANS.translate_async(&text, &from, &to).await.unwrap_log();

    if replace {
        translated = translated.replace('\n', r"\#");
    }

    translated
}

#[command]
pub fn add_to_scope<R: Runtime>(window: Window<R>, path: &str) {
    let tauri_scope = window.state::<Scopes>();

    if let Some(s) = window.try_fs_scope() {
        s.allow_directory(path, true).unwrap_log();
    }

    tauri_scope.allow_directory(path, true).unwrap_log();
}

#[command]
pub fn extract_archive(input_path: &Path, output_path: &Path, processing_mode: ProcessingMode) {
    let bytes: Vec<u8> = fs::read(input_path).unwrap();
    let mut decrypter: Decrypter = Decrypter::new(bytes);
    decrypter
        .extract(output_path, processing_mode == ProcessingMode::Force)
        .unwrap();
}

#[command]
pub fn append_to_end(path: &Path, text: &str) {
    let mut file: File = OpenOptions::new().append(true).open(path).unwrap_log();
    write!(file, "\n{text}").unwrap_log();
}
