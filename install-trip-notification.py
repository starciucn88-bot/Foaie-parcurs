from pathlib import Path
import re,shutil
p=Path("android/app/src/main")
j=p/"java/ro/starciuc/foaieparcurs";j.mkdir(parents=True,exist_ok=True)
for f in Path(".github/native").glob("*.java"):shutil.copyfile(f,j/f.name)
m=p/"AndroidManifest.xml";s=m.read_text()
s=s.replace("<application ",'''<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
<application ''',1)
s=s.replace("</application>",'''<service android:name=".TripNotificationService" android:exported="false" android:foregroundServiceType="specialUse"><property android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE" android:value="Active trip notification" /></service></application>''')
m.write_text(s)
g=Path("android/app/build.gradle");s=g.read_text();s=re.sub(r"versionCode\s+\d+","versionCode 11313",s,count=1);s=re.sub(r'versionName\s+"[^"]+"','versionName "1.3.13"',s,count=1);g.write_text(s)
