# Билдинг из исходного кода

## Предварительные условия

- Git
- Node.js и npm
- Rust (для Tauri)

## Этапы билдинга

Клонирование репозитория:

```bash
git clone https://github.com/savannstm/rpgmtranslate.git
```

Перейдите в репозиторий и установите зависимости:

```bash
cd rpgmtranslate
npm install
```

Запустите приложение:

```bash
# Для режима разработки
npm run tauri dev

# Для производственной сборки
npm run tauri build
```

## Структура проекта

- Код фронтэнда: каталог `src`
- Код бэкэнда: каталог `src-tauri/src`
- Артефакты билдинга: `gui/src-tauri/target`
    - Распространяемые пакеты: `target/bundle`
