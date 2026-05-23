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

---

## Temizlik

```bash
make clean
# dist/, android/erp.aar, android/erp-sources.jar silinir
```

---

## GitHub Actions — Otomatik Build

`main` branch'e her push'ta desktop platformlar otomatik derlenir:

```bash
git push origin main
```

Artifaktlar GitHub Release sayfasında yayınlanır (`v1.{run_number}`):
- `erp-macos.dmg` (macOS universal binary)
- `ERP-x86_64.AppImage` (Linux)
- `erp-windows-amd64.exe` (Windows)

**Not:** Android build gomobile NDK compatibility sorunları nedeniyle devre dışı bırakılmıştır. Android için manuel build gereklidir.
