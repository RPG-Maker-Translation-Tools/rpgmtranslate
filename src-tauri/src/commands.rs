use crate::{get_game_type, GOOGLE_TRANS};
use regex::escape;
use rvpacker_lib::{
    read::*,
    types::{EngineType, GameType, MapsProcessingMode, ProcessingMode, ResultExt},
    write::*,
};
use serde::Deserialize;
use std::{
    fs::{create_dir_all, File, OpenOptions},
    io::{Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    time::Instant,
};
use tauri::{command, Manager, Runtime, Scopes, Window};
use tauri_plugin_fs::FsExt;
use translators::Translator;

#[derive(Deserialize)]
#[allow(non_snake_case)]
pub struct CompileSettings<'a> {
    projectPath: &'a Path,
    originalDir: &'a Path,
    outputPath: &'a Path,
    gameTitle: &'a str,
    mapsProcessingMode: MapsProcessingMode,
    romanize: bool,
    disableCustomProcessing: bool,
    disableProcessing: [bool; 4],
    engineType: EngineType,
    logging: bool,
}

#[derive(Deserialize)]
#[allow(non_snake_case)]
pub struct ReadSettings<'a> {
    projectPath: &'a Path,
    originalDir: &'a Path,
    gameTitle: &'a str,
    mapsProcessingMode: MapsProcessingMode,
    romanize: bool,
    disableCustomProcessing: bool,
    disableProcessing: [bool; 4],
    processingMode: ProcessingMode,
    engineType: EngineType,
    logging: bool,
    generateJson: bool,
}

#[command]
pub fn escape_text(text: &str) -> String {
    escape(text)
}

#[command(async)]
pub fn compile(settings: CompileSettings) -> f64 {
    let CompileSettings {
        projectPath: project_path,
        originalDir: original_dir,
        outputPath: output_path,
        gameTitle: game_title,
        mapsProcessingMode: maps_processing_mode,
        romanize,
        disableCustomProcessing: disable_custom_processing,
        disableProcessing: disable_processing,
        engineType: engine_type,
        logging,
    } = settings;

    let start_time: Instant = Instant::now();

    let maps_processing_mode: MapsProcessingMode = maps_processing_mode;
    let engine_type: EngineType = engine_type;

    let extension: &str = match engine_type {
        EngineType::New => ".json",
        EngineType::VXAce => ".rvdata2",
        EngineType::VX => ".rvdata",
        EngineType::XP => ".rxdata",
    };

    let data_dir: &Path = &PathBuf::from(".rpgmtranslate");
    let original_path: &Path = &project_path.join(original_dir);
    let translation_path: &Path = &project_path.join(data_dir).join("translation");
    let (data_output_path, plugins_output_path) = if engine_type == EngineType::New {
        let plugins_output_path: PathBuf = output_path.join(data_dir).join("output/js");
        create_dir_all(&plugins_output_path).unwrap_log(file!(), line!());

        (
            &output_path.join(data_dir).join("output/data"),
            Some(plugins_output_path),
        )
    } else {
        (&output_path.join(data_dir).join("output/Data"), None)
    };

    create_dir_all(data_output_path).unwrap_log(file!(), line!());

    let game_type: Option<GameType> = if disable_custom_processing {
        None
    } else {
        get_game_type(game_title)
    };

    if !disable_processing[0] {
        write_maps(
            translation_path,
            original_path,
            data_output_path,
            maps_processing_mode,
            romanize,
            logging,
            game_type,
            engine_type,
        );
    }

    if !disable_processing[1] {
        write_other(
            translation_path,
            original_path,
            data_output_path,
            romanize,
            logging,
            game_type,
            engine_type,
        );
    }

    if !disable_processing[2] {
        write_system(
            &original_path.join(String::from("System") + extension),
            translation_path,
            data_output_path,
            romanize,
            logging,
            engine_type,
        );
    }

    if !disable_processing[3] {
        let plugins_file_path: &Path = &translation_path.join("plugins.json");

        if game_type.is_some_and(|game_type: GameType| game_type == GameType::Termina) && plugins_file_path.exists() {
            write_plugins(
                plugins_file_path,
                translation_path,
                &unsafe { plugins_output_path.unwrap_unchecked() },
                logging,
            );
        }

        let scripts_file_path: &Path = &original_path.join(String::from("Scripts") + extension);

        if engine_type != EngineType::New && scripts_file_path.exists() {
            write_scripts(
                scripts_file_path,
                translation_path,
                data_output_path,
                romanize,
                logging,
                engine_type,
            );
        }
    }

    start_time.elapsed().as_secs_f64()
}

#[command(async)]
pub fn read(settings: ReadSettings) {
    let ReadSettings {
        projectPath: project_path,
        originalDir: original_dir,
        gameTitle: game_title,
        mapsProcessingMode: maps_processing_mode,
        romanize,
        disableCustomProcessing: disable_custom_processing,
        disableProcessing: disable_processing,
        processingMode: processing_mode,
        engineType: engine_type,
        logging,
        generateJson: mut generate_json,
    } = settings;

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

    let data_dir: &Path = &PathBuf::from(".rpgmtranslate");
    let original_path: &Path = &project_path.join(original_dir);
    let translation_path: &Path = &project_path.join(data_dir).join("translation");

    create_dir_all(translation_path).unwrap_log(file!(), line!());

    if engine_type == EngineType::New {
        generate_json = false;
    }

    if !disable_processing[0] {
        read_map(
            original_path,
            translation_path,
            maps_processing_mode,
            romanize,
            logging,
            game_type,
            engine_type,
            processing_mode,
            generate_json,
        );
    }

    if !disable_processing[1] {
        read_other(
            original_path,
            translation_path,
            romanize,
            logging,
            game_type,
            processing_mode,
            engine_type,
            generate_json,
        );
    }

    if !disable_processing[2] {
        read_system(
            &original_path.join(String::from("System") + extension),
            translation_path,
            romanize,
            logging,
            processing_mode,
            engine_type,
            generate_json,
        );
    }

    if !disable_processing[3] && engine_type != EngineType::New {
        read_scripts(
            &original_path.join(String::from("Scripts") + extension),
            translation_path,
            romanize,
            logging,
            generate_json,
        );
    }
}

#[command]
pub fn read_last_line(file_path: &Path) -> String {
    let mut file: File = File::open(file_path).unwrap_log(file!(), line!());
    let mut buffer: Vec<u8> = Vec::new();

    let mut position: u64 = file.seek(SeekFrom::End(0)).unwrap_log(file!(), line!());

    while position > 0 {
        position -= 1;
        file.seek(SeekFrom::Start(position)).unwrap_log(file!(), line!());

        let mut byte: [u8; 1] = [0; 1];
        file.read_exact(&mut byte).unwrap_log(file!(), line!());

        if byte == *b"\n" && !buffer.is_empty() {
            break;
        }

        buffer.push(byte[0]);
    }

    buffer.reverse();
    unsafe { String::from_utf8_unchecked(buffer) }
}

#[command]
pub async fn translate_text(text: String, from: String, to: String, replace: bool) -> String {
    tokio::time::sleep(std::time::Duration::from_millis(5)).await;

    let mut translated: String = GOOGLE_TRANS
        .translate_async(&text, &from, &to)
        .await
        .unwrap_log(file!(), line!());

    if replace {
        translated = translated.replace('\n', r"\#");
    }

    translated
}

#[command]
pub fn add_to_scope<R: Runtime>(window: Window<R>, path: &str) {
    let tauri_scope = window.state::<Scopes>();

    if let Some(s) = window.try_fs_scope() {
        s.allow_directory(path, true).unwrap_log(file!(), line!());
    }

    tauri_scope.allow_directory(path, true).unwrap_log(file!(), line!());
}

#[command]
pub fn extract_archive(input_path: &Path, output_path: &Path, processing_mode: ProcessingMode) {
    let bytes: Vec<u8> = std::fs::read(input_path).unwrap();
    let mut decrypter: rpgmad_lib::Decrypter = rpgmad_lib::Decrypter::new(bytes);
    decrypter
        .extract(output_path, processing_mode == ProcessingMode::Force)
        .unwrap();
}

#[tauri::command]
pub fn append_to_end(path: &Path, text: &str) {
    let mut file: File = OpenOptions::new().append(true).open(path).unwrap_log(file!(), line!());
    write!(file, "\n{text}").unwrap_log(file!(), line!());
}
