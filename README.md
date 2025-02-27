# rpgmtranslate

[README на русском](README-ru.md)

## General

A fast and light graphical interface, designed for editing and translating games based on RPG Maker XP/VX/VX Ace/MV/MZ engines.

Under the hood, this GUI uses:

- [rvpacker-txt-rs-lib](https://github.com/savannstm/rvpacker-txt-rs-lib) to parse and write RPG Maker MV/MZ `.json` files.
- [marshal-rs](https://github.com/savannstm/marshal-rs) to parse and write RPG Maker XP/VX/VX Ace files.
- [rpgm-archive-decrypter-lib](https://github.com/savannstm/rpgm-archive-decrypter-lib) to decrypt `.rgss` RPG Maker XP/VX/VX Ace archives.

Using these tools, the program parses the text to `.txt` files, allows you to edit them, and then write them back to the original form with translation applied.

![Interface](./screenshots/interface.png)

If you have troubled figuring out the program, check the `Help > Help` top menu option. That will probably help.

**Download the latest version from the Releases section.**

## Manual building

### Prerequisites

- C runtime, like `msvc` or `mingw64` on Windows and `gcc` or `clang` on Linux.
- `rustup` with an installed Rust toolchain.
- On Linux - Tauri dependencies (`gtk`, `webkit2gtk`).
- JavaScript runtime (`nodejs`, `bun`, `deno`).

### Building

Clone the repository: `git clone https://github.com/savannstm/rpgmtranslate.git`.

`cd` to the repository and install all required Node.js dependencies: `npm install`.

Run `npm run tauri dev`, to run the program in dev mode, or `npm run tauri build`, to build the program for your current OS.

You can edit frontend's program source code in `src` directory, and backend source code in `src-tauri/src` directory.

After the build, `target` directory will be created in the `gui/src-tauri` path, containing binary file with program build and distributable bundled packages in the `target/bundle` directory.

## License

The repository is licensed under [WTFPL](http://www.wtfpl.net/).
This means that you can use and modify the program in any way. You can do what the fuck you want to.

The repository contains third-party software, that is licensed under other conditions:

- `Google Material Icons` - licensed under `Apache License Version 2.0`.
