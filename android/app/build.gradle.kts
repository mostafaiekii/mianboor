plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.mianboor.vpn"
    compileSdk = 34

    // ── release keystore (CI injects via -P props from GitHub secrets) ──
    // The -P path may be absolute (CI) or relative to the repo/module — try every
    // base so the keystore is ALWAYS found. If it were missing, release builds
    // would silently fall back to the debug key, which is REGENERATED RANDOMLY on
    // every CI runner — each release would get a different signature and users
    // could no longer update the app over the previous one.
    val mbStorePath = project.findProperty("MB_STORE_FILE") as String?
    val mbStoreFile: java.io.File? = mbStorePath?.let { raw ->
        listOfNotNull(
            file(raw),
            rootDir.resolve(raw),
            rootDir.parentFile?.resolve(raw),
        ).firstOrNull { it.exists() }
    }
    if (mbStoreFile == null) {
        logger.warn("MB_STORE_FILE keystore not found — release APK will be signed with the DEBUG key (unstable across CI runners).")
    }
    signingConfigs {
        if (mbStoreFile != null) {
            create("mianboorRelease") {
                storeFile = mbStoreFile
                storePassword = (project.findProperty("MB_STORE_PASSWORD") as String?) ?: ""
                keyAlias = (project.findProperty("MB_KEY_ALIAS") as String?) ?: "mianboor"
                keyPassword = (project.findProperty("MB_KEY_PASSWORD") as String?) ?: ""
            }
        }
    }

    defaultConfig {
        applicationId = "com.mianboor.vpn"
        minSdk = 26
        targetSdk = 34
        versionCode = 12
        versionName = "1.6.3"

        ndk {
            abiFilters += "arm64-v8a"
        }

        // Injected at build time from GitHub Actions (or ./gradlew -P...).
        // SERVER_URL has a safe public fallback; the tokens below are secrets —
        // they are ONLY provided via -P props / CI secrets and are never
        // hardcoded in the repository. If empty, sync stays disabled.
        val serverUrl = (project.findProperty("MIANOOR_SERVER_URL") as String?)
            ?.takeIf { it.isNotBlank() } ?: "https://mianboor.vercel.app"
        val clientToken = (project.findProperty("MIANOOR_CLIENT_TOKEN") as String?)
            ?.takeIf { it.isNotBlank() } ?: ""
        val adminKey = (project.findProperty("MIANOOR_ADMIN_KEY") as String?)
            ?.takeIf { it.isNotBlank() } ?: ""
        if (clientToken.isBlank() || adminKey.isBlank()) {
            logger.warn("MIANOOR_CLIENT_TOKEN / MIANOOR_ADMIN_KEY not provided — sync tokens will be empty in this build.")
        }
        buildConfigField("String", "SERVER_URL", "\"$serverUrl\"")
        buildConfigField("String", "CLIENT_TOKEN", "\"$clientToken\"")
        buildConfigField("String", "ADMIN_KEY", "\"$adminKey\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Signed with the stable release key (from CI secrets) when present —
            // a consistent signature lowers Play Protect flags across updates.
            // Local builds fall back to the debug key so they stay installable.
            signingConfig = if (mbStoreFile != null)
                signingConfigs.getByName("mianboorRelease")
            else
                signingConfigs.getByName("debug")
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    packaging {
        jniLibs {
            // Required so the bundled xray core binary is extracted to the
            // filesystem (nativeLibraryDir) and stays executable.
            useLegacyPackaging = true
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.2")
    implementation("androidx.activity:activity-compose:1.9.0")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
