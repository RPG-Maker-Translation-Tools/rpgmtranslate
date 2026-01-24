# Development

## Building

RPGMTranslate uses Tauri framework, which is built upon Rust and Web.

### Prerequisites

- `git`.
- `rustup` with an installed Rust toolchain.
- Tauri prerequisites (<https://v2.tauri.app/start/prerequisites>).
- JavaScript runtime (`nodejs`, `bun`, `deno`). It's recommended to use `bun`.

### Process

Clone the repository:

```bash
git clone https://github.com/RPG-Maker-Translation-Tools/rpgmtranslate.git
cd rpgmtranslate
```

Install JavaScript dependencies:

```bash
bun i
```

Run/build the program:

```bash
# Run in development mode
npm run tauri dev

# Build for release
npm run tauri build
```

After the build, `target` directory will be created in the `gui/src-tauri` path, containing binary file with program build and distributable bundled packages in the `target/bundle` directory.

Note that you will get error because of missing private key, but don't worry as that's post-compilation error. Bundled files will be generated successfully.

## Localization

For localizing text, we use `lingui` JavaScript library. It works by analyzing text inside t\`...\` macros in code and creating translation files corresponding to different languages.

To improve the workflow, we have written `parse-html-i18n.ts` script that parses text from `data-i18n` attributes to `html.ts` files, that contain macros for `lingui` to analyze.

`lingui` config is located in `lingui.config.ts` files and allows to adjust locales. Right now, the program is translated only to two locales: English (which is source) and Russian.

To translate the program to a language, it needs to be added to `lingui.config.ts` file, and command `bunx lingui extract` needs to be ran. After that, translatable `.po` files will be generated at `src-tauri/resources/locales/{locale}`.
