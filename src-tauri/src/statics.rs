use crate::types::Localization;
use lazy_static::lazy_static;
use regex::Regex;
use translators::GoogleTranslator;

pub static NEW_LINE: &str = r"\#";
pub static LINES_SEPARATOR: &str = "<#>";
pub static mut EXTENSION: &str = "";
pub static mut LOCALIZATION: Option<Localization<'static>> = None;

lazy_static! {
    pub static ref STRING_IS_ONLY_SYMBOLS_RE: Regex = unsafe {
        Regex::new(r#"^[.()+\-:;\[\]^~%&!№$@`*\/→×？?ｘ％▼|♥♪！：〜『』「」〽。…‥＝゠、，【】［］｛｝（）〔〕｟｠〘〙〈〉《》・\\#'"<>=_ー※▶ⅠⅰⅡⅱⅢⅲⅣⅳⅤⅴⅥⅵⅦⅶⅧⅷⅨⅸⅩⅹⅪⅺⅫⅻⅬⅼⅭⅽⅮⅾⅯⅿ\s0-9]+$"#).unwrap_unchecked()
    };
    pub static ref ENDS_WITH_IF_RE: Regex = unsafe { Regex::new(r" if\(.*\)$").unwrap_unchecked() };
    pub static ref LISA_PREFIX_RE: Regex = unsafe { Regex::new(r"^(\\et\[[0-9]+\]|\\nbt)").unwrap_unchecked() };
    pub static ref INVALID_MULTILINE_VARIABLE_RE: Regex =
        unsafe { Regex::new(r"^#? ?<.*>.?$|^[a-z][0-9]$").unwrap_unchecked() };
    pub static ref INVALID_VARIABLE_RE: Regex =
        unsafe { Regex::new(r"^[+-]?[0-9]+$|^///|---|restrict eval").unwrap_unchecked() };
    pub static ref SELECT_WORDS_RE: Regex = unsafe { Regex::new(r"\S+").unwrap_unchecked() };
    pub static ref GOOGLE_TRANS: GoogleTranslator = GoogleTranslator::default();
}
