# RENACE Android App - Configuración Android Studio

Este proyecto usa Capacitor para convertir la web app en una app nativa de Android.

## Requisitos

- Android Studio (última versión)
- Node.js 18+
- Java JDK 17
- Android SDK con API level 33+

## Estructura del Proyecto

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/tech/renace/app/
│   │   │   └── MainActivity.java
│   │   ├── res/
│   │   │   ├── drawable/
│   │   │   ├── layout/
│   │   │   ├── mipmap-*/
│   │   │   └── values/
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── build.gradle
└── settings.gradle
```

## Configuración

### 1. Sync Project with Gradle Files
   - Abrir Android Studio
   - File → Sync Project with Gradle Files

### 2. Configurar Keystore para Release
   - Crear archivo `keystore.properties` en `android/`
   - Añadir:
     ```
     storePassword=YOUR_PASSWORD
     keyPassword=YOUR_PASSWORD
     keyAlias=renace
     storeFile=renace.keystore
     ```

### 3. Build APK
   - Build → Build Bundle(s) / APK(s) → Build APK(s)

## Custom User Agent

La app usa un User Agent personalizado para identificarse como app nativa:

```
RENACE-App/1.0.0 (Android; Capacitor)
```

## SSO Integration

La app intercepta URLs con el scheme `renace://` para manejar tokens SSO.

## Deep Links

Configurados en `AndroidManifest.xml`:
- `https://renace.tech/*`
- `renace://sso/*`

## Troubleshooting

### Error: Gradle sync failed
   - Verificar que Java JDK 17 está instalado
   - File → Project Structure → SDK Location

### Error: Build failed
   - Build → Clean Project
   - Build → Rebuild Project

### App no carga el portal
   - Verificar conexión a internet
   - Verificar que el portal está accesible
