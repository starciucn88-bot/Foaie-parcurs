package ro.starciuc.foaieparcurs;
import android.app.*;
import android.content.*;
import android.os.*;
import androidx.core.app.NotificationCompat;
public class TripNotificationService extends Service {
 private static final String CHANNEL="ns_autobook_trip";
 @Override public void onCreate(){super.onCreate();if(Build.VERSION.SDK_INT>=26){NotificationChannel c=new NotificationChannel(CHANNEL,"Deplasare activa",NotificationManager.IMPORTANCE_LOW);c.setDescription("Notificare pe durata deplasarii");getSystemService(NotificationManager.class).createNotificationChannel(c);}}
 @Override public int onStartCommand(Intent intent,int flags,int startId){
  if(intent==null||!"START".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
  String place=intent.getStringExtra("place"),time=intent.getStringExtra("time");
  String message="Plecare: "+(place==null?"":place)+"  "+(time==null?"":time);
  Intent open=getPackageManager().getLaunchIntentForPackage(getPackageName());
  PendingIntent pi=PendingIntent.getActivity(this,0,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification n=new NotificationCompat.Builder(this,CHANNEL).setSmallIcon(android.R.drawable.ic_menu_mylocation)
   .setContentTitle("NS AutoBook - Deplasare activa").setContentText(message).setContentIntent(pi)
   .setOngoing(true).setOnlyAlertOnce(true).setCategory(NotificationCompat.CATEGORY_SERVICE).build();
  startForeground(1313,n);return START_STICKY;
 }
 @Override public IBinder onBind(Intent i){return null;}
}
