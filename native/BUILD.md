# ERP Native — Build Kılavuzu

Tüm komutlar `native/` dizininden çalıştırılır.

## Ön Gereksinimler

```bash
# Go 1.22+
go version

# Bağımlılıkları indir
go mod tidy && go mod download
```

---

## macOS

```bash
# Apple Silicon (ARM64)
make macos-arm
# → dist/erp-macos-arm64

# Intel (x86_64)
make macos-intel
# → dist/erp-macos-amd64

# Universal binary (ARM64 + Intel)
make macos-universal
# → dist/erp-macos-universal

# .app bundle + DMG (ARM64)
make macos-app
# → dist/ERP.app
```

## Linux

```bash
# Gerekli kütüphaneler (Ubuntu/Debian)
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev

# x86_64
make linux
# → dist/erp-linux-amd64

# ARM64 (cross-compile, aarch64-linux-gnu-gcc gerekli)
make linux-arm64
# → dist/erp-linux-arm64
```

## Windows (cross-compile — Linux/macOS üzerinden)

```bash
# mingw-w64 kur
# macOS: brew install mingw-w64
# Linux:  sudo apt-get install gcc-mingw-w64-x86-64

make windows
# → dist/erp-windows-amd64.exe
```

## Android

```bash
# gomobile kur
go install golang.org/x/mobile/cmd/gomobile@latest
go install golang.org/x/mobile/cmd/gobind@latest
gomobile init   # Android SDK + NDK gerekli (ANDROID_HOME ayarlı olmalı)

# AAR üret (Android Studio projesine kopyala)
make android-aar
# → android/erp.aar

# AAR + APK (Gradle projesi android/ dizininde olmalı)
make android
# → android/app/build/outputs/apk/release/app-release.apk
```

---

## Temizlik

```bash
make clean
# dist/, android/erp.aar, android/erp-sources.jar silinir
```

---

## GitHub Actions — Otomatik Build

`v*` etiketi push edildiğinde tüm platformlar otomatik derlenir:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Artifaktlar GitHub Release sayfasında yayınlanır:
- `erp-macos.dmg`
- `ERP-x86_64.AppImage`
- `erp-windows-amd64.exe`
- `erp.aar` / `app-release.apk`
