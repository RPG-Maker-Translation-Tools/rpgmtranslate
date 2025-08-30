# Building from Source

## Prerequisites

- Git
- `rustup` with an installed Rust toolchain
- Tauri prerequisites (<https://v2.tauri.app/start/prerequisites>)
- JavaScript runtime (`nodejs`, `bun`, `deno`)

## Build Steps

Clone the repository:

```bash
git clone https://github.com/savannstm/rpgmtranslate.git
```

Navigate to the repository and install dependencies:

```bash
cd rpgmtranslate
npm install # or bun, or deno, or whatever
```

Run the application:

```bash
# For development mode
npm run tauri dev # or bun, or deno, or whatever

# For production build
npm run tauri build # or bun, or deno, or whatever
```

## Project Structure

- Frontend code: `src` directory
- Backend code: `src-tauri/src` directory
- Build output: `src-tauri/target` directory
    - Distributable packages: `target/bundle`
