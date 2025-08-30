const version = (
    (await Bun.file("./package.json").json()) as { version: string }
).version;
const windowsSignatureFile = Bun.file(
    `./src-tauri/target/release/bundle/msi/rpgmtranslate_${version}_x64_en-US.msi.sig`,
);
const linuxSignatureFile = Bun.file(
    `./src-tauri/target/release/bundle/appimage/rpgmtranslate_${version}_amd64.AppImage.sig`,
);

const updaterMeta = {
    version,
    platforms: {
        "windows-x86_64": { signature: "", url: "" },
        "linux-x86_64": {
            signature: "",
            url: "",
        },
    },
};

if (await windowsSignatureFile.exists()) {
    updaterMeta.platforms["windows-x86_64"].signature =
        await windowsSignatureFile.text();
    updaterMeta.platforms["windows-x86_64"].url =
        `https://github.com/savannstm/rpgmtranslate/releases/download/v${version}/rpgmtranslate_${version}_x64_en-US.msi`;
}

if (await linuxSignatureFile.exists()) {
    updaterMeta.platforms["linux-x86_64"].signature =
        await linuxSignatureFile.text();
    updaterMeta.platforms["linux-x86_64"].url =
        `https://github.com/savannstm/rpgmtranslate/releases/download/v${version}/rpgmtranslate_${version}_amd64.AppImage`;
}

await Bun.write(
    "./src-tauri/target/release/bundle/updater_info.json",
    JSON.stringify(updaterMeta),
);
console.log("Produced updater info for the release");

export {};
