from pathlib import Path
import re
import shutil

base = Path('android/app/src/main')
java_dir = base / 'java/ro/starciuc/foaieparcurs'
java_dir.mkdir(parents=True, exist_ok=True)
files = list(Path('native').glob('*.java'))
if len(files) < 3:
    raise RuntimeError('Lipsesc fisierele native/*.java')
for file in files:
    shutil.copyfile(file, java_dir / file.name)

manifest = base / 'AndroidManifest.xml'
s = manifest.read_text()
permissions = [
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
]
for permission in permissions:
    if permission not in s:
        s = s.replace('<application', f'<uses-permission android:name="{permission}" />\n    <application', 1)
if 'TripNotificationService' not in s:
    service = ('<service android:name=".TripNotificationService" '
               'android:exported="false" android:foregroundServiceType="specialUse">'
               '<property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE" '
               'android:value="Active trip notification" /></service>')
    s = s.replace('</application>', service + '\n    </application>', 1)
manifest.write_text(s)

gradle = Path('android/app/build.gradle')
s = gradle.read_text()
s, n = re.subn(r'\bversionCode\s+\d+', 'versionCode 11316', s, count=1)
if n != 1:
    raise RuntimeError('versionCode nu a fost gasit')
s, n = re.subn(r'\bversionName\s+["\'][^"\']+["\']', 'versionName "1.3.15"', s, count=1)
if n != 1:
    raise RuntimeError('versionName nu a fost gasit')
gradle.write_text(s)

# Replace only Android launcher images; no changes to web interface or stored data.
res = base / 'res'
assets = Path('assets/launcher')
for directory in sorted(assets.glob('mipmap-*')):
    target = res / directory.name
    target.mkdir(parents=True, exist_ok=True)
    for icon in directory.glob('*.png'):
        shutil.copyfile(icon, target / icon.name)
