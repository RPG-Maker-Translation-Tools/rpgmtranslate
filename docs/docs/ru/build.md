# Билдинг из исходного кода

## Требования

- Git
- `rustup` с установленным Rust тулчейном
- Требования Tauri (<https://v2.tauri.app/start/prerequisites>)
- Рантайм JavaScript (`nodejs`, `bun`, `deno`)

## Этапы

Клонируем репозиторий:

```bash
git clone https://github.com/RPG-Maker-Translation-Tools/rpgmtranslate.git
```

Переходим и устанавливаем зависимости

```bash
cd rpgmtranslate
npm install # или bun, или deno, или что угодно
```

Билдим приложение:

```bash
# Для дев билда
npm run tauri dev # или bun, или deno, или что угодно

# Для релизного билда
npm run tauri build # или bun, или deno, или что угодно
```

## Структура проекта

- Код фронтэнда: директория `src`
- Код бэкэнда: директория `src-tauri/src`
- Артефакты билда: `gui/src-tauri/target`
    - Распространяемые пакеты: `target/bundle`
