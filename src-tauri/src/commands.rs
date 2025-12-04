#![allow(clippy::too_many_arguments)]
use log::error;
use regex::{Regex, escape};
use rpgmad_lib::{Decrypter, ExtractError};
use rvpacker_lib::{
    BaseFlags, DuplicateMode, EngineType, FileFlags, GameType, PurgerBuilder,
    ReadMode, ReaderBuilder, WriterBuilder,
    constants::{NEW_LINE, SEPARATOR},
    get_ini_title, get_system_title,
};
use serde::{Serialize, Serializer};
use std::{
    fs::{self, File, OpenOptions, create_dir_all, read_to_string},
    io::{self, Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    sync::LazyLock,
    time::{Duration, Instant},
};
use tauri::{AppHandle, command};
use tauri_plugin_fs::FsExt;
use thiserror::Error;
use tokio::time::sleep;
use translators::{GoogleTranslator, Translator};
use walkdir::WalkDir;

#[derive(Debug, Error)]
pub enum Error {
    #[error("{0}: IO error occurred: {1}")]
    Io(PathBuf, io::Error),
    #[error(transparent)]
    Rvpacker(#[from] rvpacker_lib::Error),
    #[error(transparent)]
    Extract(#[from] ExtractError),
    #[error(transparent)]
    Translators(#[from] translators::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.to_string().serialize(serializer)
    }
}

static GOOGLE_TRANS: LazyLock<GoogleTranslator> =
    LazyLock::new(GoogleTranslator::default);

fn get_game_type(
    game_title: &str,
    disable_custom_processing: bool,
) -> GameType {
    if disable_custom_processing {
        GameType::None
    } else {
        let lowercased = game_title.to_lowercase();

        if unsafe { Regex::new(r"\btermina\b").unwrap_unchecked() }
            .is_match(&lowercased)
        {
            GameType::Termina
        } else if unsafe { Regex::new(r"\blisa\b").unwrap_unchecked() }
            .is_match(&lowercased)
        {
            GameType::LisaRPG
        } else {
            GameType::None
        }
    }
}

#[command]
pub fn escape_text(text: &str) -> String {
    escape(text)
}

#[command]
pub fn walk_dir(dir: &str) -> Vec<String> {
    let mut entries = Vec::new();

    for entry in WalkDir::new(dir).into_iter().flatten() {
        if entry.file_type().is_file()
            && let Some(str) = entry.path().to_str()
        {
            entries.push(str.into());
        }
    }

    entries
}

#[command(async)]
pub fn write(
    source_path: &Path,
    translation_path: &Path,
    output_path: &Path,
    engine_type: EngineType,
    duplicate_mode: DuplicateMode,
    game_title: &str,
    file_flags: FileFlags,
    flags: BaseFlags,
) -> Result<String, Error> {
    let start_time = Instant::now();
    let game_type = get_game_type(
        game_title,
        flags.contains(BaseFlags::DisableCustomProcessing),
    );

    let mut writer = WriterBuilder::new()
        .with_files(file_flags)
        .with_flags(flags)
        .game_type(game_type)
        .duplicate_mode(duplicate_mode)
        .build();

    writer.write(source_path, translation_path, output_path, engine_type)?;

    Ok(format!("{:.2}", start_time.elapsed().as_secs_f32()))
}

#[command(async)]
pub fn read(
    project_path: &Path,
    source_path: &Path,
    translation_path: &Path,
    read_mode: ReadMode,
    engine_type: EngineType,
    duplicate_mode: DuplicateMode,
    file_flags: FileFlags,
    flags: BaseFlags,
) -> Result<(), Error> {
    let game_title: String = if engine_type.is_new() {
        let system_file_path = source_path.join("System.json");
        let system_file_content = read_to_string(&system_file_path)
            .map_err(|err| Error::Io(system_file_path, err))?;
        get_system_title(&system_file_content)?
    } else {
        let ini_file_path = Path::new(project_path).join("Game.ini");
        let ini_file_content = fs::read(&ini_file_path)
            .map_err(|err| Error::Io(ini_file_path, err))?;
        let title = get_ini_title(&ini_file_content)?;
        String::from_utf8_lossy(&title).into_owned()
    };

    let game_type = get_game_type(
        &game_title,
        flags.contains(BaseFlags::DisableCustomProcessing),
    );

    let mut reader = ReaderBuilder::new()
        .with_files(file_flags)
        .with_flags(flags)
        .game_type(game_type)
        .read_mode(read_mode)
        .duplicate_mode(duplicate_mode)
        .build();

    reader.read(source_path, translation_path, engine_type)?;

    append_to_end(
        &Path::new(translation_path).join("system.txt"),
        &format!("{game_title}{SEPARATOR}"),
    )?;

    Ok(())
}

#[command]
pub fn purge(
    source_path: &Path,
    translation_path: &Path,
    engine_type: EngineType,
    duplicate_mode: DuplicateMode,
    game_title: &str,
    flags: BaseFlags,
    file_flags: FileFlags,
) -> Result<(), Error> {
    let game_type = get_game_type(
        game_title,
        flags.contains(BaseFlags::DisableCustomProcessing),
    );

    PurgerBuilder::new()
        .with_files(file_flags)
        .with_flags(flags)
        .game_type(game_type)
        .duplicate_mode(duplicate_mode)
        .build()
        .purge(source_path, translation_path, engine_type)?;

    Ok(())
}

#[command]
pub fn read_last_line(file_path: &Path) -> Result<String, Error> {
    let mut file = File::open(file_path)
        .map_err(|err| Error::Io(file_path.to_path_buf(), err))?;
    let mut buffer = Vec::new();

    let mut position =
        unsafe { file.seek(SeekFrom::End(0)).unwrap_unchecked() };

    while position > 0 {
        position -= 1;
        unsafe { file.seek(SeekFrom::Start(position)).unwrap_unchecked() };

        let mut byte = [0];
        unsafe { file.read_exact(&mut byte).unwrap_unchecked() };

        if byte[0] == b'\n' && !buffer.is_empty() {
            break;
        }

        buffer.push(byte[0]);
    }

    buffer.reverse();
    Ok(unsafe { String::from_utf8_unchecked(buffer) })
}

#[command]
pub async fn translate_text(
    text: String,
    from: String,
    to: String,
    normalize: bool,
) -> Result<String, Error> {
    sleep(Duration::from_millis(5)).await;

    let mut translated =
        GOOGLE_TRANS.translate_async(&text, &from, &to).await?;

    if normalize {
        translated = translated.replace('\n', NEW_LINE);
    }

    Ok(translated)
}

#[command]
#[allow(clippy::needless_pass_by_value)]
pub fn expand_scope(app_handle: AppHandle, dir: PathBuf) -> Result<(), Error> {
    app_handle.fs_scope().allow_directory(&dir, true)?;
    Ok(())
}

#[command]
pub fn extract_archive(
    input_path: &Path,
    output_path: &Path,
) -> Result<(), Error> {
    let bytes = fs::read(input_path)
        .map_err(|err| Error::Io(input_path.to_path_buf(), err))?;

    let decrypted_entries = Decrypter::new().decrypt(&bytes)?;

    for file in decrypted_entries {
        let path = String::from_utf8_lossy(&file.path);
        let output_file_path = output_path.join(path.as_ref());

        if let Some(parent) = output_file_path.parent() {
            create_dir_all(parent)
                .map_err(|err| Error::Io(parent.to_path_buf(), err))?;
        }

        fs::write(&output_file_path, file.data)
            .map_err(|err| Error::Io(output_file_path, err))?;
    }

    Ok(())
}

pub fn append_to_end(path: &Path, text: &str) -> Result<(), Error> {
    let mut file = OpenOptions::new()
        .append(true)
        .open(path)
        .map_err(|err| Error::Io(path.to_path_buf(), err))?;

    write!(file, "\n{text}")
        .map_err(|err| Error::Io(path.to_path_buf(), err))?;

    Ok(())
}
