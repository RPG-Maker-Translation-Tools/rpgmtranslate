#![allow(clippy::too_many_arguments)]
use language_tokenizer::{
    Algorithm, MatchMode, MatchResult, find_all_matches as find_all_matches_,
    find_match as find_match_, tokenize,
};
use llm_connector::{
    LlmClient, LlmConnectorError,
    types::{ChatRequest, Message, Role},
};
use log::{debug, info};
use num_enum::{FromPrimitive, IntoPrimitive};
use regex::Regex;
use rpgmad_lib::{Decrypter, ExtractError};
use rvpacker_lib::{
    BaseFlags, DuplicateMode, EngineType, FileFlags, GameType, PurgerBuilder,
    RPGMFileType, ReadMode, ReaderBuilder, WriterBuilder,
    constants::{NEW_LINE, SEPARATOR},
    get_ini_title, get_system_title,
};
use serde::{Deserialize, Serialize, Serializer};
use serde_json::{from_str, to_string};
use std::{
    cell::UnsafeCell,
    collections::HashMap,
    fs::{self, File, OpenOptions, create_dir_all, read_to_string},
    io::{self, Read, Seek, SeekFrom, Write},
    mem::take,
    path::{Path, PathBuf},
    str::FromStr,
    time::Instant,
};
use strum_macros::Display;
use tauri::{AppHandle, command};
use tauri_plugin_fs::FsExt;
use thiserror::Error;
use tiktoken_rs::o200k_base;
use walkdir::WalkDir;
use whatlang::detect;

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
    #[error(transparent)]
    LLMConnectorError(#[from] LlmConnectorError),
    #[error("API key is not specified. Input it in settings.")]
    APIKeyNotSpecified,
    #[error(transparent)]
    Gemini(#[from] gemini_rust::ClientError),
    #[error(transparent)]
    Yandex(#[from] yandex_translate::YandexTranslateError),
    #[error("Yandex folder ID is not specified. Input it in settings.")]
    YandexFolderNotSpecified,
    #[error(transparent)]
    JSON(#[from] serde_json::Error),
    #[error(transparent)]
    DeepL(#[from] deepl::Error),
    #[error(transparent)]
    DeepLLangConvert(#[from] deepl::LangConvertError),
}

#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    Eq,
    FromPrimitive,
    IntoPrimitive,
    Serialize,
    Deserialize,
    Display,
)]
#[serde(try_from = "u8", into = "u8")]
#[repr(u8)]
pub enum TranslationEndpoint {
    #[default]
    Google,
    Yandex,
    DeepL,
    OpenAI,
    Anthropic,
    DeepSeek,
    Gemini,
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        self.to_string().serialize(serializer)
    }
}

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
    flags: BaseFlags,
    skip_files: FileFlags,
    skip_maps: Vec<u16>,
    skip_events: Vec<(RPGMFileType, Vec<u16>)>,
) -> Result<String, Error> {
    let start_time = Instant::now();
    let game_type = get_game_type(
        game_title,
        flags.contains(BaseFlags::DisableCustomProcessing),
    );

    let mut writer = WriterBuilder::new()
        .with_files(FileFlags::all() & !skip_files)
        .with_flags(flags)
        .game_type(game_type)
        .duplicate_mode(duplicate_mode)
        .skip_maps(skip_maps)
        .skip_events(skip_events)
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
    skip_files: FileFlags,
    flags: BaseFlags,
    skip_maps: Vec<u16>,
    skip_events: Vec<(RPGMFileType, Vec<u16>)>,
    map_events: bool,
    hashes: Vec<String>,
) -> Result<Vec<String>, Error> {
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
        .with_files(FileFlags::all() & !skip_files)
        .with_flags(flags)
        .game_type(game_type)
        .read_mode(read_mode)
        .duplicate_mode(duplicate_mode)
        .skip_maps(skip_maps)
        .skip_events(skip_events)
        .map_events(map_events)
        .hashes(hashes.iter().map(|s| s.parse::<u128>().unwrap()).collect())
        .build();

    reader.read(source_path, translation_path, engine_type)?;

    append_to_end(
        &Path::new(translation_path).join("system.txt"),
        &format!("{game_title}{SEPARATOR}"),
    )?;

    Ok(reader.hashes().into_iter().map(|n| n.to_string()).collect())
}

#[command]
pub fn purge(
    source_path: &Path,
    translation_path: &Path,
    engine_type: EngineType,
    duplicate_mode: DuplicateMode,
    game_title: &str,
    flags: BaseFlags,
    skip_files: FileFlags,
    skip_maps: Vec<u16>,
    skip_events: Vec<(RPGMFileType, Vec<u16>)>,
) -> Result<(), Error> {
    let game_type = get_game_type(
        game_title,
        flags.contains(BaseFlags::DisableCustomProcessing),
    );

    PurgerBuilder::new()
        .with_files(FileFlags::all() & !skip_files)
        .with_flags(flags)
        .game_type(game_type)
        .duplicate_mode(duplicate_mode)
        .skip_maps(skip_maps)
        .skip_events(skip_events)
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
pub async fn get_models(
    endpoint: TranslationEndpoint,
    api_key: &str,
) -> Result<Vec<String>, Error> {
    Ok(match endpoint {
        TranslationEndpoint::Google
        | TranslationEndpoint::Yandex
        | TranslationEndpoint::DeepL => Vec::new(),
        TranslationEndpoint::DeepSeek => {
            LlmClient::deepseek(api_key)?.models().await?
        }
        TranslationEndpoint::OpenAI => {
            LlmClient::openai(api_key)?.models().await?
        }
        TranslationEndpoint::Anthropic => {
            LlmClient::openai(api_key)?.models().await?
        }
        TranslationEndpoint::Gemini => {
            use gemini_rust::*;

            let mut models = Vec::with_capacity(4);
            models.push(Model::Gemini25Flash.as_str().into());
            models.push(Model::Gemini25FlashLite.as_str().into());
            models.push(Model::Gemini25Pro.as_str().into());
            models.push(Model::Gemini3Pro.as_str().into());

            models
        }
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block<'a> {
    name: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    before_strings: Option<Vec<&'a str>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    after_strings: Option<Vec<&'a str>>,
    strings: Vec<&'a str>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlossaryEntry<'a> {
    term: &'a str,
    translation: &'a str,
    note: &'a str,
}

#[derive(Debug, Clone, Serialize)]
pub struct Request<'a> {
    source_language: &'a str,
    translation_language: &'a str,
    project_context: &'a str,
    local_context: &'a str,
    glossary: &'a [GlossaryEntry<'a>],
    files: &'a HashMap<&'a str, HashMap<&'a str, Block<'a>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    strings: Vec<String>,
}

#[command]
pub async fn translate<'a>(
    translation_endpoint: TranslationEndpoint,
    model: String,
    project_context: &str,
    local_context: &str,
    files: HashMap<&'a str, HashMap<&'a str, Block<'a>>>,
    glossary: Vec<GlossaryEntry<'a>>,
    source_language: &str,
    translation_language: &str,
    api_key: &str,
    system_prompt: &str,
    yandex_folder_id: &str,
    token_limit: u16,
    temperature: f32,
    thinking: bool,
    normalize: bool,
) -> Result<HashMap<String, HashMap<String, Response>>, Error> {
    let mut response = HashMap::with_capacity(files.len());

    let result = match translation_endpoint {
        TranslationEndpoint::Google => {
            use translators::{GoogleTranslator, Translator};
            let translator = GoogleTranslator::default();

            for (file, blocks) in &files {
                response.insert(
                    file.to_string(),
                    HashMap::with_capacity(blocks.len()),
                );
                let response_file = response.get_mut(*file).unwrap();

                for (id, block) in blocks {
                    let mut strings = Vec::with_capacity(block.strings.len());

                    for string in &block.strings {
                        let translated = translator
                            .translate_async(
                                string,
                                source_language,
                                translation_language,
                            )
                            .await?;
                        strings.push(if normalize {
                            translated.replace("\n", NEW_LINE)
                        } else {
                            translated
                        });
                    }

                    response_file.insert(id.to_string(), Response { strings });
                }
            }

            response
        }

        _ if api_key.is_empty() => return Err(Error::APIKeyNotSpecified),

        TranslationEndpoint::Yandex => {
            use yandex_translate::*;

            if yandex_folder_id.is_empty() {
                return Err(Error::YandexFolderNotSpecified);
            }

            for (file, blocks) in &files {
                response.insert(
                    file.to_string(),
                    HashMap::with_capacity(blocks.len()),
                );
                let response_file = response.get_mut(*file).unwrap();

                for (id, block) in blocks {
                    let client = YandexTranslateClient::with_api_key(api_key)?;
                    let response = client.translate_texts(
                        yandex_folder_id,
                        &block.strings,
                        translation_language,
                    )?;
                    let strings = response
                        .translations
                        .into_iter()
                        .map(|x| {
                            if normalize {
                                x.text.replace("\n", NEW_LINE)
                            } else {
                                x.text
                            }
                        })
                        .collect();

                    response_file.insert(id.to_string(), Response { strings });
                }
            }

            response
        }

        TranslationEndpoint::DeepL => {
            use deepl::{glossary::*, *};

            let client = DeepLApi::with(api_key).new();
            let _ = client
                .create_glossary("glossary")
                .entries(glossary.iter().map(|e| (e.term, e.translation)))
                .source_lang(GlossaryLanguage::from_str(source_language)?)
                .target_lang(GlossaryLanguage::from_str(translation_language)?)
                .send()
                .await?;

            for (file, blocks) in &files {
                response.insert(
                    file.to_string(),
                    HashMap::with_capacity(blocks.len()),
                );
                let response_file = response.get_mut(*file).unwrap();

                for (id, block) in blocks {
                    let mut strings = Vec::with_capacity(files.len());

                    for &string in &block.strings {
                        let mut translated = client
                            .translate_text(
                                string,
                                Lang::from_str(translation_language)?,
                            )
                            .await?
                            .to_string();

                        if normalize {
                            translated = translated.replace("\n", NEW_LINE);
                        }

                        strings.push(translated);
                    }

                    response_file.insert(id.to_string(), Response { strings });
                }
            }

            response
        }

        _ => {
            let client = match translation_endpoint {
                TranslationEndpoint::OpenAI => LlmClient::openai(api_key)?,
                TranslationEndpoint::Anthropic => {
                    LlmClient::anthropic(api_key)?
                }
                TranslationEndpoint::DeepSeek => LlmClient::deepseek(api_key)?,
                TranslationEndpoint::Gemini => LlmClient::google(api_key)?,
                _ => unreachable!(),
            };

            let mut limited_files: Vec<
                HashMap<&'a str, HashMap<&'a str, Block<'a>>>,
            > = vec![HashMap::new()];
            let mut entry = limited_files.first_mut().unwrap();
            let mut limit = 0;

            let tokenizer = o200k_base().unwrap();

            for (file, blocks) in files {
                for block in blocks.values() {
                    for &string in &block.strings {
                        let tokens =
                            tokenizer.encode_with_special_tokens(string);
                        limit += tokens.len();
                    }
                }

                if limit < token_limit as usize {
                    entry.insert(file, blocks);
                } else {
                    limit = 0;
                    limited_files.push(HashMap::new());
                    entry = limited_files.last_mut().unwrap();
                }
            }

            let mut result = HashMap::new();

            let mut request = ChatRequest {
                model,
                messages: vec![
                    Message::text(Role::System, system_prompt),
                    Message::default(),
                ],
                enable_thinking: Some(thinking),
                temperature: Some(temperature),
                ..Default::default()
            };

            for files in limited_files {
                let prompt = Request {
                    source_language,
                    translation_language,
                    project_context,
                    local_context,
                    glossary: &glossary,
                    files: &files,
                };

                request.messages[1] =
                    Message::text(Role::User, to_string(&prompt)?);

                let response = client.chat(&request).await?;

                let response = from_str::<
                    HashMap<String, HashMap<String, Response>>,
                >(&response.content)?;

                result.extend(response);
            }

            if normalize {
                for blocks in result.values_mut() {
                    for strings in blocks.values_mut() {
                        for string in strings.strings.iter_mut() {
                            *string = string.replace("\n", NEW_LINE);
                        }
                    }
                }
            }

            result
        }
    };

    Ok(result)
}

#[command]
#[allow(clippy::needless_pass_by_value)]
pub fn expand_scope(app_handle: AppHandle, dir: &Path) -> Result<(), Error> {
    app_handle.fs_scope().allow_directory(dir, true)?;
    Ok(())
}

#[command]
pub fn extract_archive(
    input_path: &Path,
    output_path: &Path,
) -> Result<(), Error> {
    debug!("Decrypting archive: {}", input_path.display());

    let bytes = fs::read(input_path)
        .map_err(|err| Error::Io(input_path.to_path_buf(), err))?;

    let decrypted_entries = Decrypter::new().decrypt(&bytes)?;

    for file in decrypted_entries {
        let path = String::from_utf8_lossy(&file.path);
        debug!("Decrypting archive entry: {}", path);

        let output_file_path = output_path.join(path.as_ref());

        if let Some(parent) = output_file_path.parent() {
            create_dir_all(parent)
                .map_err(|err| Error::Io(parent.to_path_buf(), err))?;
        }

        fs::write(&output_file_path, file.data)
            .map_err(|err| Error::Io(output_file_path, err))?;

        info!("Decrypted archive entry: {}", path);
    }

    info!("Decrypted archive: {}", input_path.display());

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

#[command]
pub fn find_match(
    source_haystack: &str,
    source_needle: &str,
    tr_haystack: &str,
    tr_needle: &str,
    source_algorithm: Algorithm,
    tr_algorithm: Algorithm,
    mode: MatchMode,
    case_sensitive: bool,
    permissive: bool,
) -> Result<Option<(MatchResult, MatchResult)>, language_tokenizer::Error> {
    let source_haystack =
        tokenize(source_haystack, source_algorithm, case_sensitive)?;
    let source_needle =
        tokenize(source_needle, source_algorithm, case_sensitive)?;
    let tr_haystack = tokenize(tr_haystack, tr_algorithm, case_sensitive)?;
    let tr_needle = tokenize(tr_needle, tr_algorithm, case_sensitive)?;

    let source_match =
        find_match_(&source_haystack, &source_needle, mode, permissive);
    let source_has_needle = source_match.is_some();

    Ok(if source_has_needle {
        let translation_match =
            find_match_(&tr_haystack, &tr_needle, mode, permissive);

        source_match.zip(translation_match)
    } else {
        None
    })
}

#[command]
pub fn find_all_matches(
    source_haystack: &str,
    source_needle: &str,
    source_mode: (MatchMode, bool, bool),
    tr_haystack: &str,
    tr_needle: &str,
    tr_mode: (MatchMode, bool, bool),
    source_algorithm: Algorithm,
    tr_algorithm: Algorithm,
) -> Result<
    Option<(Vec<MatchResult>, Vec<MatchResult>)>,
    language_tokenizer::Error,
> {
    let source_haystack =
        tokenize(source_haystack, source_algorithm, source_mode.1)?;
    let source_needle =
        tokenize(source_needle, source_algorithm, source_mode.1)?;
    let tr_haystack = tokenize(tr_haystack, tr_algorithm, tr_mode.1)?;
    let tr_needle = tokenize(tr_needle, tr_algorithm, tr_mode.1)?;

    let source_matches = find_all_matches_(
        &source_haystack,
        &source_needle,
        source_mode.0,
        source_mode.2,
    );

    let source_has_needle = !source_matches.is_empty();

    Ok(if source_has_needle {
        let translation_matches =
            find_all_matches_(&tr_haystack, &tr_needle, tr_mode.0, tr_mode.2);

        Some((source_matches, translation_matches))
    } else {
        None
    })
}

thread_local! {
    static CHECKED_LANGS: UnsafeCell<HashMap<&'static str, f64>> = UnsafeCell::new(HashMap::new());
}

#[command(async)]
pub fn detect_lang(str: &str) {
    let lang = detect(str);

    if let Some(lang) = lang {
        CHECKED_LANGS.with(|x| {
            let entry = unsafe {
                (*x.get()).entry(lang.lang().eng_name()).or_default()
            };
            *entry += lang.confidence();
        });
    }
}

#[command]
pub fn get_lang() -> Option<&'static str> {
    CHECKED_LANGS.with(|x| {
        unsafe { take(&mut *x.get()).into_iter() }
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .and_then(|x| Some(x.0))
    })
}
