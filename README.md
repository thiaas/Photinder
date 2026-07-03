# Photinder

MVP Android in React Native + TypeScript per pulire foto e video con swipe. Lo swipe non elimina subito i file: gli elementi finiscono prima nel cestino interno dell'app e l'eliminazione definitiva parte solo dal cestino, dopo conferma.

## Stack

- Expo SDK 57
- React Native 0.86
- TypeScript
- `expo-media-library/legacy` per lettura, paginazione e cancellazione asset
- `expo-video` per riproduzione video
- `@react-native-async-storage/async-storage` per la sessione

## Installazione

```bash
npm install
```

Se Expo segnala versioni non allineate:

```bash
npx expo install --fix
```

## Avvio in sviluppo

```bash
npm run start
```

Poi apri il progetto con Expo Go oppure esegui su Android:

```bash
npm run android
```

Per un build nativo locale serve Android Studio con Android SDK configurato.

## Generare un APK

Il profilo `preview` in `eas.json` produce un APK installabile:

```bash
npx eas-cli login
npm run build:apk
```

Comando equivalente, se preferisci installare EAS CLI globalmente:

```bash
npm install -g eas-cli
eas build -p android --profile preview
```

A build conclusa, EAS fornisce un link per scaricare l'APK. Puoi installarlo sul telefono aprendo quel link oppure con:

```bash
adb install path/to/app.apk
```

## Flusso app

- Se esiste una sessione salvata, la schermata iniziale propone ripresa o nuova data.
- La data di partenza include tutto il giorno selezionato e scorre verso il passato.
- Swipe destra o `Tieni`: passa all'elemento successivo.
- Swipe sinistra o `Cestina`: aggiunge l'elemento al cestino interno.
- Dopo un cestinamento, `Annulla` resta disponibile per 5 secondi.
- Nel cestino si possono selezionare elementi, ripristinarli o eliminarli definitivamente.
- `Rivedi cestino` mostra solo gli elementi nel cestino: destra ripristina, sinistra lascia nel cestino.

## Note Android

- Android 13+ usa permessi granulari: `READ_MEDIA_IMAGES` e `READ_MEDIA_VIDEO`.
- Android 14+ puo' concedere accesso parziale a foto/video selezionati. L'app mostra un avviso e permette di riaprire il selettore permessi quando possibile.
- Android 11+ richiede normalmente una conferma di sistema per modificare o eliminare media non creati dall'app. L'MVP mostra prima una conferma interna e poi lascia a `expo-media-library`/Android la conferma di sistema.
- Il cestino interno non sposta fisicamente i file: salva solo ID e metadati degli elementi scartati.
- Se l'ultimo elemento salvato non esiste piu', la ripresa propone di scegliere una nuova data o ripartire da zero.

Riferimenti:

- Expo MediaLibrary legacy: https://docs.expo.dev/versions/latest/sdk/media-library-legacy/
- Expo APK builds: https://docs.expo.dev/build-reference/apk/
- Android media permissions: https://developer.android.com/about/versions/13/behavior-changes-13#granular-media-permissions
- Android selected photos access: https://developer.android.com/about/versions/14/changes/partial-photo-video-access
- Android media deletion: https://developer.android.com/training/data-storage/shared/media#remove-item
