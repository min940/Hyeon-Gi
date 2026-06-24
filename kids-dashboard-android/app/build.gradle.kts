plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "app.kidsdashboard.kiosk"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.kidsdashboard.kiosk"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "1.1"
    }

    buildTypes {
        release {
            // 가정용 사이드로드 — 디버그 서명으로도 설치 가능.
            // 정식 배포 시 서명 키를 설정하세요.
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.webkit:webkit:1.11.0")

    // 위치
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // Firebase (네이티브 백그라운드 서비스에서 Firestore 직접 기록)
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-firestore")
    implementation("com.google.firebase:firebase-auth")

    // 자녀 로그인 자격증명 암호화 저장
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
}
