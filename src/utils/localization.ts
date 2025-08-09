// import { Language } from "@enums/index",

// export class SettingsWindowLocalization {
//     public readonly backupPeriodLabel: string,
//     public readonly backupPeriodNote: string,
//     public readonly backupMaxLabel: string,
//     public readonly backupMaxNote: string,
//     public readonly backup: string,
//     public readonly font: string,
//     public readonly defaultFont: string,
//     public readonly translationLanguages: string,
//     public readonly confirmation: string,
//     public readonly disabled: string,
//     public readonly allowed: string,
//     public readonly delete: string,
//     public readonly displayGhostLines: string,
//     public readonly checkForUpdates: string,

//     public constructor(language: Language) {
//         switch (language) {
//             case Language.Russian:
//                 backupPeriodLabel : "Создавать резервные копии каждые:",
//                 backupPeriodNote : "секунд (минимум 60, максимум 3600)",
//                 backupMaxLabel :
//                     "Максимальное количество резервных копий:",
//                 backupMaxNote : "(минимум 1, максимум 99)",
//                 backup : "Резервное копирование",
//                 font : "Шрифт",
//                 defaultFont : "Стандартный",
//                 translationLanguages :
//                     "Языки перевода (для машинного перевода)",
//                 delete : "Режим удаления рядов",
//                 disabled : "Выключить",
//                 confirmation : "Спрашивать",
//                 allowed : "Разрешить",
//                 displayGhostLines :
//                     "Отображать переносы строк в текстовых полях",
//                 checkForUpdates : "Проверять наличие обновлений",
//         }
//     }
// }

// export class AboutWindowLocalization {
//     public readonly version: string,
//     public readonly repoLink: string,
//     public readonly license: string,

//     public constructor(language: Language) {
//         switch (language) {
//             case Language.Russian:
//                 version : "Версия",
//                 repoLink : "Репозиторий программы",
//                 license : "Лицензия",
//                 break,
//         }
//     }
// }

// export type Localization :
//     | MainWindowLocalization
//     | AboutWindowLocalization
//     | SettingsWindowLocalization,
