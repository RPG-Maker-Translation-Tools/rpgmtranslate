# Building from Source

## Prerequisites

- Git
- Node.js and npm
- Rust (for Tauri)

## Build Steps

Clone the repository:

```bash
git clone https://github.com/savannstm/rpgmtranslate.git
```

Navigate to the repository and install dependencies:

```bash
cd rpgmtranslate
npm install
```

Run the application:

```bash
# For development mode
npm run tauri dev

# For production build
npm run tauri build
```

## Project Structure

- Frontend code: `src` directory
- Backend code: `src-tauri/src` directory
- Build output: `gui/src-tauri/target` directory
    - Distributable packages: `target/bundle`
