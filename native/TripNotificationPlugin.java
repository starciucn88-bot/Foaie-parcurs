package ro.starciuc.foaieparcurs;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
@CapacitorPlugin(name="TripNotification")
public class TripNotificationPlugin extends Plugin {
 @PluginMethod public void sync(PluginCall call){
  boolean active=Boolean.TRUE.equals(call.getBoolean("active",false));
  Intent intent=new Intent(getContext(),TripNotificationService.class);
  if(active){
   intent.setAction("START");intent.putExtra("place",call.getString("place",""));intent.putExtra("time",call.getString("time",""));
   if(Build.VERSION.SDK_INT>=33 && getContext().checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
    getActivity().requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},2401);
   try{if(Build.VERSION.SDK_INT>=26)getContext().startForegroundService(intent);else getContext().startService(intent);}
   catch(Exception e){call.reject("Pornirea notificarii a esuat",e);return;}
  }else getContext().stopService(intent);
  call.resolve(new JSObject());
 }
}
