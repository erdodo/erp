BINARY   := erp
SRC      := ./cmd/desktop
ANDROID_PKG := ./cmd/android/binding

# ── Desktop builds ──────────────────────────────────────────────────────────

.PHONY: macos-arm macos-intel macos-universal macos-app linux linux-arm64 windows android android-aar deps tidy clean

## Install Go module dependencies
deps:
	go mod tidy
	go mod download

## Build macOS ARM64 binary (Apple Silicon)
macos-arm:
	mkdir -p dist
	CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 \
	  go build -ldflags="-s -w" -o dist/$(BINARY)-macos-arm64 $(SRC)
	@echo "✅  dist/$(BINARY)-macos-arm64"

## Build macOS x86_64 binary (Intel)
macos-intel:
	mkdir -p dist
	CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 \
	  go build -ldflags="-s -w" -o dist/$(BINARY)-macos-amd64 $(SRC)
	@echo "✅  dist/$(BINARY)-macos-amd64"

## Build macOS Universal binary (ARM64 + x86_64 combined)
macos-universal: macos-arm macos-intel
	lipo -create -output dist/$(BINARY)-macos-universal \
	  dist/$(BINARY)-macos-arm64 dist/$(BINARY)-macos-amd64
	@echo "✅  dist/$(BINARY)-macos-universal"

## Create a runnable .app bundle (ARM64)
macos-app: macos-arm
	@mkdir -p dist/ERP.app/Contents/MacOS
	@mkdir -p dist/ERP.app/Contents/Resources
	@cp dist/$(BINARY)-macos-arm64 dist/ERP.app/Contents/MacOS/ERP
	@printf '<?xml version="1.0"?>\n\
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n\
<plist version="1.0"><dict>\n\
  <key>CFBundleName</key><string>ERP</string>\n\
  <key>CFBundleIdentifier</key><string>com.erp.app</string>\n\
  <key>CFBundleVersion</key><string>1.0.0</string>\n\
  <key>CFBundleExecutable</key><string>ERP</string>\n\
  <key>CFBundlePackageType</key><string>APPL</string>\n\
  <key>NSHighResolutionCapable</key><true/>\n\
  <key>NSAppTransportSecurity</key><dict>\n\
    <key>NSAllowsLocalNetworking</key><true/>\n\
  </dict>\n\
</dict></plist>\n' > dist/ERP.app/Contents/Info.plist
	@echo "✅  dist/ERP.app — çalıştır: open dist/ERP.app"

## Build Linux x86_64 binary
linux:
	CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
	  go build -ldflags="-s -w" -o dist/$(BINARY)-linux-amd64 $(SRC)
	@echo "✅  dist/$(BINARY)-linux-amd64"

## Build Linux ARM64 binary (cross-compile — needs arm64 CGO toolchain)
linux-arm64:
	CGO_ENABLED=1 GOOS=linux GOARCH=arm64 \
	CC=aarch64-linux-gnu-gcc \
	  go build -ldflags="-s -w" -o dist/$(BINARY)-linux-arm64 $(SRC)
	@echo "✅  dist/$(BINARY)-linux-arm64"

## Build Windows x86_64 executable (requires mingw-w64 cross-compiler on Linux/macOS)
windows:
	CGO_ENABLED=1 GOOS=windows GOARCH=amd64 \
	CC=x86_64-w64-mingw32-gcc \
	  go build -ldflags="-s -w -H=windowsgui" -o dist/$(BINARY)-windows-amd64.exe $(SRC)
	@echo "✅  dist/$(BINARY)-windows-amd64.exe"

# ── Android APK ─────────────────────────────────────────────────────────────
# Prerequisites:
#   go install golang.org/x/mobile/cmd/gomobile@latest
#   gomobile init
#   Android SDK + NDK (set ANDROID_HOME and NDK_HOME env vars)

## Generate erp.aar + erp-sources.jar for the Android project
android-aar:
	gomobile bind -target android \
	  -javapkg com.erp.app \
	  -o android/erp.aar \
	  $(ANDROID_PKG)
	@echo "✅  android/erp.aar  — copy into Android project libs/"

## Build the Android APK (runs Gradle after generating aar)
android: android-aar
	@if [ -f android/gradlew ]; then \
	  cd android && ./gradlew assembleRelease && \
	  echo "✅  android/app/build/outputs/apk/release/app-release.apk"; \
	else \
	  echo "⚠️  No Gradle project found in android/. Create one with Android Studio"; \
	  echo "    and place erp.aar in android/app/libs/. Then re-run: make android"; \
	fi

# ── Helpers ─────────────────────────────────────────────────────────────────

tidy:
	go mod tidy

clean:
	rm -rf dist/ android/erp.aar android/erp-sources.jar

dist:
	mkdir -p dist
