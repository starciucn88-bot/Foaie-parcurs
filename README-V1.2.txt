FOAIE DE PARCURS V1.2 — OCR + GPS

Corecturi față de V1.1:
- OCR nativ Google ML Kit este injectat în proiectul Android la build.
- NativeOcr este înregistrat explicit în MainActivity.
- Permisiuni CAMERA + GPS + INTERNET sunt adăugate în AndroidManifest.
- @capacitor/geolocation 7.1.8 este inclus în package.json.
- Workflow-ul verifică prezența OCR/GPS înainte de a construi APK-ul.
- Artifact: Foaie-parcurs-APK-v1.2-OCR-GPS.

IMPORTANT: Pentru GitHub trebuie înlocuite și fișierele din rădăcină (package.json și .github/workflows/build-apk.yml), nu doar www/.
- Sosire: fotografia odometrului este citită automat prin OCR; valoarea numerică plauzibilă este precompletată și verificată față de km de plecare.
- Utilizatorul confirmă/corectează valoarea OCR; introducerea manuală nu mai este fluxul implicit.
