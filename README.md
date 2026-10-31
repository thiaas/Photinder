# Photinder

App React Native + TypeScript, Expo SDK 57, Android e iOS. Due sezioni nella stessa app:

- **Foto** (blu): foto e video della galleria.
- **Documenti** (rosso): file non multimediali nelle cartelle autorizzate dall'utente, incluse le sottocartelle.

Swipe destra = tieni; sinistra = cestino interno. Nessuno swipe sposta o elimina i file originali. Solo il Cestino puo' avviare l'eliminazione, sempre dopo conferma esplicita. Il cestino e' una lista di riferimenti, non una copia di sicurezza.

## Installazione

Da questa cartella, con Node.js LTS e Git installati:

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd test
```

In Windows `npm.cmd` evita il blocco di `npm.ps1` nelle configurazioni PowerShell restrittive.

## Sviluppo

La sezione Documenti contiene un modulo nativo locale (`modules/document-library`) e **non funziona in Expo Go**. Serve una build nativa. Una modifica al codice Kotlin/Swift richiede una nuova compilazione.

Android locale, dopo aver installato Android Studio, JDK e Android SDK:

```powershell
npm.cmd run android
```

iOS locale richiede macOS con Xcode:

```bash
npx expo run:ios
```

I progetti nativi principali vengono generati da Expo. Non sono versionati; il modulo nativo locale invece deve essere incluso nel repository e nelle build EAS.

## APK Android

```powershell
npx.cmd eas-cli login
npm.cmd run build:apk
```

Il profilo `preview` produce un APK installabile, non un AAB. EAS restituisce il collegamento al termine della build. Per aggiornare l'app esistente senza perdere le sessioni, usare lo stesso package e la stessa chiave di firma; **non disinstallare prima la vecchia app**.

Se EAS non trova Git, installarlo e riaprire il terminale. Come alternativa temporanea, in PowerShell:

```powershell
$env:EAS_NO_VCS = "1"
npm.cmd run build:apk
```

In Prompt dei comandi (CMD):

```cmd
set EAS_NO_VCS=1
npm run build:apk
```

## iPhone / iPad

Il codice include il modulo Swift e la configurazione iOS. Non esiste un APK per iPhone: serve una build iOS firmata.

Per una build EAS di prova su dispositivo fisico, occorrono un account Apple Developer abilitato alla distribuzione e la registrazione del dispositivo:

```powershell
npx.cmd eas-cli login
npx.cmd eas-cli device:create
npm.cmd run build:ios
```

Il profilo `preview` usa distribuzione interna ad hoc: solo i dispositivi presenti nel profilo possono installarla. La build cloud puo' essere richiesta da Windows; Xcode e' necessario solo per compilare localmente su Mac. Se `com.photinder.app` non e' disponibile per il proprio team Apple, impostare un bundleIdentifier univoco in `app.json` prima della prima build iOS.

Per preparare una build da distribuire tramite TestFlight/App Store:

```powershell
npm.cmd run build:ios:store
```

L'invio ad App Store Connect, la configurazione TestFlight, le firme e l'eventuale revisione Apple sono passaggi separati. Non vengono effettuati automaticamente da questo comando.

## Sessioni

- Le schede Foto e Documenti hanno elenchi di sessioni separati.
- `Nuova sessione` non sovrascrive le precedenti. Ogni sessione conserva nome, data iniziale, ultimo elemento, data raggiunta e progresso; per i documenti conserva anche le cartelle autorizzate.
- `Riprendi` continua dopo l'ultimo elemento trovato. Se non esiste piu', viene proposta la continuazione dalla data salvata oppure il ritorno alle sessioni.
- Il cestino e' **condiviso fra le sessioni della stessa sezione**: un file non rimane in cestini scollegati quando due sessioni si sovrappongono. Foto e Documenti mantengono cestini distinti.
- `Tieni` su un elemento gia' nel cestino della stessa sezione lo ripristina.
- La sessione della versione precedente viene migrata automaticamente in Foto, senza cancellare il vecchio valore di backup.
- I salvataggi sono locali. Disinstallare l'app o cancellarne i dati perde sessioni, autorizzazioni e cestino interno, ma non elimina gli originali.
- `Annulla` resta disponibile per cinque secondi dopo uno scarto, anche sull'ultimo elemento. Torna alla scheda scartata; eventuali schede successive gia' mantenute verranno mostrate di nuovo. Cambiare schermata chiude l'annullamento rapido, ma resta possibile ripristinare dal cestino.

## Documenti: accesso e sicurezza

- Android usa lo Storage Access Framework (`ACTION_OPEN_DOCUMENT_TREE`) con autorizzazioni persistenti. Non viene richiesto il permesso speciale di accesso indiscriminato a tutti i file.
- Da Android 11 non si possono autorizzare tramite questo selettore la radice della memoria, l'intera cartella Download, `Android/data` o `Android/obb`. Scegliere cartelle ammesse, per esempio Documents o sottocartelle consentite. L'app non aggira questi limiti.
- iOS usa il selettore cartelle dell'app File e bookmark di accesso autorizzato. Nessuna scansione libera di tutte le app o di tutti i file dell'iPhone.
- La scansione esclude foto, video e audio. PDF, documenti Office, testo, archivi e altri file non multimediali sono ammessi. Le anteprime sono schede con nome, tipo, dimensione e data; `Apri documento` usa un'app compatibile su Android e Quick Look su iOS. Non tutti i formati hanno un visualizzatore disponibile.
- Per i documenti la data usata e' **l'ultima modifica**, non la data di creazione, perche' quest'ultima non e' garantita dai fornitori. Se la data manca, il file viene mostrato per ultimo con `Data non disponibile`.
- Il pulsante cartelle accanto al nome della sessione permette di modificarle o autorizzarle nuovamente mantenendo il progresso.
- Il fornitore puo' offrire accesso in sola lettura, rifiutare eliminazioni, essere offline o revocare l'accesso. In quel caso viene mostrato un errore. Un'eliminazione multipla puo' riuscire solo in parte: solo i file effettivamente eliminati vengono rimossi dal cestino.
- Eliminare un originale in una cartella cloud puo' propagare la cancellazione agli altri dispositivi. L'app non garantisce il recupero del file dopo la conferma finale.

## Foto e video

Android 13+ usa permessi granulari; Android 14+ e iOS possono consentire accesso limitato agli elementi selezionati. L'app mostra l'accesso limitato. Android/iOS possono chiedere un'ulteriore conferma di sistema all'eliminazione. Su iOS gli elementi possono finire in `Eliminati di recente`: l'app non aggira la protezione del sistema ne' promette una cancellazione fisica immediata.

## Verifica prima di distribuire

```powershell
npm.cmd test
npm.cmd run typecheck
npx.cmd expo install --check
npx.cmd expo-doctor
npx.cmd expo export --platform android --output-dir dist/android
npx.cmd expo export --platform ios --output-dir dist/ios
```

I test automatici coprono migrazione, isolamento dei progressi, cestino condiviso e ripresa per ID/data. L'esportazione verifica i bundle JavaScript, **non compila Kotlin/Swift e non sostituisce le prove su dispositivo**.

Checklist su dispositivi con file di prova, prima di usare documenti importanti:

1. Aggiornare la vecchia app con la stessa firma e verificare che la sessione foto resti disponibile.
2. Creare due sessioni Foto con date diverse, alternarle e riaprire l'app.
3. Negare/concedere l'accesso alla galleria e provare l'accesso limitato.
4. Creare due sessioni Documenti, selezionare cartelle con PDF/DOCX/PPTX/XLSX e verificare che audio/foto/video siano esclusi.
5. Aprire i documenti; cestinare e annullare anche sull'ultima scheda. Verificare che gli originali esistano ancora.
6. Ripristinare dal cestino, fare la revisione e controllare i conteggi.
7. Confermare ed annullare eliminazioni singole/multiple. Provare una cartella in sola lettura e un file cloud offline.
8. Spostare o eliminare esternamente l'ultimo elemento e riprendere dalla data. Revocare le cartelle e autorizzarle di nuovo.

L'ambiente Windows usato per lo sviluppo non dispone di JDK/Android SDK o Xcode: nessuna compilazione nativa o prova su telefono e' implicita nei controlli JavaScript. Le segnalazioni `npm audit` delle dipendenze vanno valutate separatamente; non usare `npm audit fix --force` perche' puo' sostituire Expo con una versione incompatibile.

## Riferimenti

- [Expo: moduli nativi locali](https://docs.expo.dev/modules/get-started/)
- [Expo: distribuzione interna Android/iOS](https://docs.expo.dev/build/internal-distribution/)
- [Android: documenti e cartelle condivise](https://developer.android.com/training/data-storage/shared/documents-files)
- [Apple: accesso alle cartelle autorizzate](https://developer.apple.com/documentation/uikit/providing-access-to-directories)
