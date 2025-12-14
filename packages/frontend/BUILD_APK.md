# Como Gerar o APK do Guru do Dindin

## Pré-requisitos

1. **Node.js** (v18 ou superior)
2. **Android Studio** - [Download](https://developer.android.com/studio)
3. **JDK 17** - Geralmente já vem com o Android Studio

## Passos para Gerar o APK

### 1. Configurar Android Studio

Após instalar o Android Studio:
- Abra o Android Studio
- Vá em **Tools > SDK Manager**
- Instale o **Android SDK Platform 34** (ou superior)
- Na aba **SDK Tools**, marque:
  - Android SDK Build-Tools
  - Android SDK Command-line Tools
  - Android Emulator
  - Android SDK Platform-Tools

### 2. Configurar Variáveis de Ambiente

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

No Windows, adicione às variáveis de ambiente do sistema.

### 3. Build e Sincronização

No diretório `packages/frontend`, execute:

```bash
# Instalar dependências (se ainda não instalou)
npm install

# Build da aplicação web
npm run build

# Sincronizar com Android
npx cap sync android
```

### 4. Gerar APK de Debug (para testes)

```bash
cd android
./gradlew assembleDebug
```

O APK estará em: `android/app/build/outputs/apk/debug/app-debug.apk`

### 5. Gerar APK de Release (para Play Store)

#### 5.1 Criar Keystore (apenas uma vez)

```bash
keytool -genkey -v -keystore guru-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias guru
```

Guarde a senha em local seguro! Você precisará dela para cada atualização.

#### 5.2 Configurar Gradle para Signing

Edite `android/app/build.gradle` e adicione dentro de `android { }`:

```gradle
signingConfigs {
    release {
        storeFile file("guru-release-key.jks")
        storePassword "SUA_SENHA"
        keyAlias "guru"
        keyPassword "SUA_SENHA"
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

#### 5.3 Gerar APK/AAB de Release

```bash
# APK (para instalação direta)
./gradlew assembleRelease

# AAB - Android App Bundle (recomendado para Play Store)
./gradlew bundleRelease
```

O APK estará em: `android/app/build/outputs/apk/release/app-release.apk`
O AAB estará em: `android/app/build/outputs/bundle/release/app-release.aab`

## Personalizar Ícones e Splash Screen

### Opção 1: Android Studio

1. Abra o projeto Android em Android Studio
2. Clique direito em `app/res` > **New > Image Asset**
3. Selecione seu ícone (recomendado 1024x1024px)
4. Android Studio gerará todos os tamanhos automaticamente

### Opção 2: Capacitor Assets (automático)

```bash
# Instalar ferramenta
npm install -D @capacitor/assets

# Criar pasta de recursos
mkdir -p resources

# Adicione:
# - resources/icon.png (1024x1024, quadrado)
# - resources/splash.png (2732x2732, quadrado com logo centralizado)

# Gerar assets
npx capacitor-assets generate
```

## Publicar na Play Store

1. Acesse [Google Play Console](https://play.google.com/console)
2. Crie uma conta de desenvolvedor ($25 única vez)
3. Crie um novo app
4. Preencha as informações:
   - Nome: Guru do Dindin
   - Descrição
   - Screenshots (mínimo 2)
   - Ícone (512x512)
   - Feature graphic (1024x500)
5. Upload do AAB
6. Configure:
   - Classificação de conteúdo
   - Política de privacidade
   - Preço e distribuição
7. Envie para revisão

## Configurações Importantes

### Package Name
O package name atual é `com.gurudodindin.app`. Para mudar, edite:
- `capacitor.config.ts` - appId
- `android/app/build.gradle` - applicationId
- `android/app/src/main/AndroidManifest.xml` - package

### Versão
Para atualizar a versão, edite `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 2          // Incrementar a cada release
    versionName "1.1.0"    // Versão visível ao usuário
}
```

## Problemas Comuns

### Erro de JAVA_HOME
Defina o JAVA_HOME para o JDK do Android Studio:
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"  # macOS
export JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"                  # Windows
```

### Erro de licenças
```bash
yes | sdkmanager --licenses
```

### Build lento
Adicione ao `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m
org.gradle.parallel=true
org.gradle.caching=true
```
