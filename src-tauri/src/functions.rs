use crate::{statics::NEW_LINE, GameType, ResultExt};
use regex::Regex;
use sonic_rs::{prelude::*, Object};

trait EachLine {
    fn each_line(&self) -> Vec<String>;
}

// Return a Vec of strings splitted by lines (inclusive), akin to each_line in Ruby
impl EachLine for str {
    fn each_line(&self) -> Vec<String> {
        let mut result: Vec<String> = Vec::new();
        let mut current_line: String = String::new();

        for char in self.chars() {
            current_line.push(char);

            if char == '\n' {
                result.push(std::mem::take(&mut current_line));
            }
        }

        if !current_line.is_empty() {
            result.push(std::mem::take(&mut current_line));
        }

        result
    }
}

pub fn romanize_string(string: String) -> String {
    let mut result: String = String::with_capacity(string.capacity());

    for char in string.chars() {
        let replacement: &str = match char {
            '。' => ".",
            '、' | '，' => ",",
            '・' => "·",
            '゠' => "–",
            '＝' | 'ー' => "—",
            '「' | '」' | '〈' | '〉' => "'",
            '『' | '』' | '《' | '》' => "\"",
            '（' | '〔' | '｟' | '〘' => "(",
            '）' | '〕' | '｠' | '〙' => ")",
            '｛' => "{",
            '｝' => "}",
            '［' | '【' | '〖' | '〚' => "[",
            '］' | '】' | '〗' | '〛' => "]",
            '〜' => "~",
            '？' => "?",
            '！' => "!",
            '：' => ":",
            '※' => "·",
            '…' | '‥' => "...",
            '　' => " ",
            'Ⅰ' => "I",
            'ⅰ' => "i",
            'Ⅱ' => "II",
            'ⅱ' => "ii",
            'Ⅲ' => "III",
            'ⅲ' => "iii",
            'Ⅳ' => "IV",
            'ⅳ' => "iv",
            'Ⅴ' => "V",
            'ⅴ' => "v",
            'Ⅵ' => "VI",
            'ⅵ' => "vi",
            'Ⅶ' => "VII",
            'ⅶ' => "vii",
            'Ⅷ' => "VIII",
            'ⅷ' => "viii",
            'Ⅸ' => "IX",
            'ⅸ' => "ix",
            'Ⅹ' => "X",
            'ⅹ' => "x",
            'Ⅺ' => "XI",
            'ⅺ' => "xi",
            'Ⅻ' => "XII",
            'ⅻ' => "xii",
            'Ⅼ' => "L",
            'ⅼ' => "l",
            'Ⅽ' => "C",
            'ⅽ' => "c",
            'Ⅾ' => "D",
            'ⅾ' => "d",
            'Ⅿ' => "M",
            'ⅿ' => "m",
            _ => {
                result.push(char);
                continue;
            }
        };

        result.push_str(replacement);
    }

    result
}

pub fn get_object_data(object: &Object) -> String {
    match object.get(&"__type") {
        Some(object_type) => {
            if object_type.as_str().is_some_and(|_type: &str| _type == "bytes") {
                unsafe { String::from_utf8_unchecked(sonic_rs::from_value(&object["data"]).unwrap_unchecked()) }
            } else {
                String::new()
            }
        }
        None => String::new(),
    }
}

pub fn extract_strings(
    ruby_code: &str,
    mode: bool,
) -> (
    indexmap::IndexSet<String, std::hash::BuildHasherDefault<xxhash_rust::xxh3::Xxh3>>,
    Vec<usize>,
) {
    fn is_escaped(index: usize, string: &str) -> bool {
        let mut backslash_count: u8 = 0;

        for char in string[..index].chars().rev() {
            if char == '\\' {
                backslash_count += 1;
            } else {
                break;
            }
        }

        backslash_count % 2 == 1
    }

    let mut strings: indexmap::IndexSet<String, std::hash::BuildHasherDefault<xxhash_rust::xxh3::Xxh3>> =
        indexmap::IndexSet::default();
    let mut indices: Vec<usize> = Vec::new();
    let mut inside_string: bool = false;
    let mut inside_multiline_comment: bool = false;
    let mut string_start_index: usize = 0;
    let mut current_quote_type: char = '\0';
    let mut global_index: usize = 0;

    for line in ruby_code.each_line() {
        let trimmed: &str = line.trim();

        if !inside_string {
            if trimmed.starts_with('#') {
                global_index += line.len();
                continue;
            }

            if trimmed.starts_with("=begin") {
                inside_multiline_comment = true;
            } else if trimmed.starts_with("=end") {
                inside_multiline_comment = false;
            }
        }

        if inside_multiline_comment {
            global_index += line.len();
            continue;
        }

        let char_indices: std::str::CharIndices = line.char_indices();

        for (i, char) in char_indices {
            if !inside_string && char == '#' {
                break;
            }

            if !inside_string && (char == '"' || char == '\'') {
                inside_string = true;
                string_start_index = global_index + i;
                current_quote_type = char;
            } else if inside_string && char == current_quote_type && !is_escaped(i, &line) {
                let extracted_string: String = ruby_code[string_start_index + 1..global_index + i]
                    .replace("\r\n", NEW_LINE)
                    .replace('\n', NEW_LINE);

                if !strings.contains(&extracted_string) {
                    strings.insert(extracted_string);
                }

                if mode {
                    indices.push(string_start_index + 1);
                }

                inside_string = false;
                current_quote_type = '\0';
            }
        }

        global_index += line.len();
    }

    (strings, indices)
}

pub fn get_game_type(game_title: &str) -> Option<GameType> {
    let lowercased: String = game_title.to_lowercase();

    if Regex::new(r"\btermina\b")
        .unwrap_log(file!(), line!())
        .is_match(&lowercased)
    {
        Some(GameType::Termina)
    } else if Regex::new(r"\blisa\b")
        .unwrap_log(file!(), line!())
        .is_match(&lowercased)
    {
        Some(GameType::LisaRPG)
    } else {
        None
    }
}
