# CareFlow Multi-Platform Deployment Guides

This directory contains native build templates, configuration wrappers, and deployment files to package the CareFlow Hospital Information System (HIS) web dashboard into native clients for Android, Windows, and iPad tablets.

---

## 1. Android Phone & Tablet Client (`/platforms/android`)
A native Kotlin/Android app wrapping the web dashboard with auto-scaling layout capabilities.

### Prerequisites:
- Android Studio (Iguana or newer) / Gradle 8.2+
- Android SDK (API Level 26 to 34)

### Build Instructions:
1. Open the `/platforms/android` directory in Android Studio.
2. Verify SDK configurations in `app/build.gradle`.
3. Build the release package via CLI:
   ```bash
   cd platforms/android
   ./gradlew assembleRelease
   ```
4. Find the compiled APK file at:
   `app/build/outputs/apk/release/app-release.apk`

---

## 2. Windows Desktop Client & Installer (`/platforms/windows`)
An Electron wrapper with a solid local process launcher and custom wizard setups.

### Prerequisites:
- Node.js (v18+)
- Inno Setup Compiler (v6+)

### Build Instructions:
1. Initialize desktop build configurations:
   ```bash
   cd platforms/windows
   npm install
   ```
2. Build the unpacked distribution folder:
   ```bash
   npm run dist
   ```
3. Open **Inno Setup Compiler** and compile `installer.iss`.
4. Find the completed installation package wizard at:
   `Output/CareFlow-Setup.exe`

---

## 3. iPad Tablet Target (`/platforms/tablet`)
Tailored settings specifically designed for landscape-locked, high-throughput clinical bedside charts.

### Key Configurations:
- `UIDeviceFamily = 2` locks target deployments to iPadOS tablets only, avoiding interface skewing on smaller phones.
- Restricts orientation to landscape to avoid layout reflows during vital sign charting.
- Bypasses HTTP transport blocks for secure hospital local intranets.
