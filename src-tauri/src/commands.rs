use crate::{
    functions::get_game_type,
    read::{read_map, read_other, read_scripts, read_system},
    statics::{EXTENSION, GOOGLE_TRANS, LOCALIZATION},
    write::{write_maps, write_other, write_plugins, write_scripts, write_system},
    EngineType, GameType, Language, Localization, MapsProcessingMode, ProcessingMode, ResultExt,
};
use regex::escape;
use serde::Deserialize;
use std::{
    fs::{create_dir_all, File},
    io::{Read, Seek, SeekFrom},
    mem::transmute,
    path::{Path, PathBuf},
    time::Instant,
};
use tauri::{command, Manager, Runtime, Scopes, Window};
use tauri_plugin_fs::FsExt;
use translators::Translator;

#[derive(Deserialize)]
pub struct CompileSettings {
    project_path: PathBuf,
    original_dir: PathBuf,
    output_path: PathBuf,
    game_title: String,
    maps_processing_mode: u8,
    romanize: bool,
    disable_custom_processing: bool,
    disable_processing: [bool; 4],
    engine_type: u8,
    logging: bool,
    language: Language,
}

#[derive(Deserialize)]
pub struct ReadSettings {
    project_path: PathBuf,
    original_dir: PathBuf,
    game_title: String,
    maps_processing_mode: u8,
    romanize: bool,
    disable_custom_processing: bool,
    disable_processing: [bool; 4],
    processing_mode: u8,
    engine_type: u8,
    logging: bool,
    language: Language,
}

#[command]
pub fn escape_text(text: &str) -> String {
    escape(text)
}

#[command(async)]
pub fn compile(options: CompileSettings) -> f64 {
    let CompileSettings {
        project_path,
        original_dir,
        output_path,
        game_title,
        maps_processing_mode,
        romanize,
        disable_custom_processing,
        disable_processing,
        engine_type,
        language,
        logging,
    } = options;

    if unsafe { LOCALIZATION.is_none() } {
        unsafe { LOCALIZATION = Some(Localization::new(language)) };
    }

    let start_time: Instant = Instant::now();

    let maps_processing_mode: MapsProcessingMode = unsafe { transmute(maps_processing_mode) };
    let engine_type: EngineType = unsafe { transmute(engine_type) };

    let extension: &str = match engine_type {
        EngineType::New => ".json",
        EngineType::VXAce => ".rvdata2",
        EngineType::VX => ".rvdata",
        EngineType::XP => ".rxdata",
    };

    unsafe { EXTENSION = extension };

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
        get_game_type(&game_title)
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
            unsafe { LOCALIZATION.as_ref().unwrap_unchecked() },
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
            unsafe { LOCALIZATION.as_ref().unwrap_unchecked() },
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
            unsafe { LOCALIZATION.as_ref().unwrap_unchecked() },
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
                unsafe { LOCALIZATION.as_ref().unwrap_unchecked() },
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
                unsafe { LOCALIZATION.as_ref().unwrap_unchecked() },
            );
        }
    }

    start_time.elapsed().as_secs_f64()
}

#[command(async)]
pub fn read(settings: ReadSettings) {
    let ReadSettings {
        project_path,
        original_dir,
        game_title,
        maps_processing_mode,
        romanize,
        disable_custom_processing,
        disable_processing,
        processing_mode,
        engine_type,
        language,
        logging,
    } = settings;

    if unsafe { LOCALIZATION.is_none() } {
        unsafe { LOCALIZATION = Some(Localization::new(language)) };
    }

    let processing_mode: ProcessingMode = unsafe { transmute(processing_mode) };
    let engine_type: EngineType = unsafe { transmute(engine_type) };
    let maps_processing_mode: MapsProcessingMode = unsafe { transmute(maps_processing_mode) };

    let extension: &str = match engine_type {
        EngineType::New => ".json",
        EngineType::VXAce => ".rvdata2",
        EngineType::VX => ".rvdata",
        EngineType::XP => ".rxdata",
    };

    unsafe { EXTENSION = extension };

    let game_type: Option<GameType> = if disable_custom_processing {
        None
    } else {
        get_game_type(&game_title)
    };

    let data_dir: &Path = &PathBuf::from(".rpgmtranslate");
    let original_path: &Path = &project_path.join(original_dir);
    let translation_path: &Path = &project_path.join(data_dir).join("translation");

    create_dir_all(translation_path).unwrap_log(file!(), line!());

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
            unsafe { LOCALIZATION.as_ref().unwrap_unchecked() },
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
            unsafe { LOCALIZATION.as_ref().unwrap_unchecked() },
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
            unsafe { LOCALIZATION.as_ref().unwrap_unchecked() },
        );
    }

    if !disable_processing[3] && engine_type != EngineType::New {
        read_scripts(
            &original_path.join(String::from("Scripts") + extension),
            translation_path,
            romanize,
            logging,
            unsafe { LOCALIZATION.as_ref().unwrap_unchecked() },
        );
    }
}

#[command]
pub fn read_last_line(file_path: PathBuf) -> String {
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
pub async fn translate_text(text: String, from: String, to: String) -> String {
    GOOGLE_TRANS
        .translate_async(&text, &from, &to)
        .await
        .unwrap_log(file!(), line!())
}

#[command]
pub fn add_to_scope<R: Runtime>(window: Window<R>, path: &str) {
    let tauri_scope = window.state::<Scopes>();

    if let Some(s) = window.try_fs_scope() {
        s.allow_directory(path, true);
    }

    tauri_scope.allow_directory(path, true).unwrap_log(file!(), line!());
}
