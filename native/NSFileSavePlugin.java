package ro.starciuc.foaieparcurs;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;

/** Saves the complete backup through the system file picker, not the Share menu. */
@CapacitorPlugin(name = "NSFileSave")
public class NSFileSavePlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String name = call.getString("name");
        String cacheUri = call.getString("cacheUri");
        if (name == null || name.trim().isEmpty() || cacheUri == null || cacheUri.isEmpty()) {
            call.reject("Lipsește fișierul de backup temporar.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mime", "application/json"));
        intent.putExtra(Intent.EXTRA_TITLE, name);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        startActivityForResult(call, intent, "saveResult");
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }
        Uri destination = result.getData().getData();
        if (destination == null) {
            call.reject("Nu a fost selectată o locație pentru salvare.");
            return;
        }
        try {
            Uri source = Uri.parse(call.getString("cacheUri"));
            File cache = getContext().getCacheDir().getCanonicalFile();
            if (!"file".equals(source.getScheme()) || source.getPath() == null) {
                throw new IllegalArgumentException("Sursă de backup invalidă.");
            }
            File input = new File(source.getPath()).getCanonicalFile();
            if (!input.getPath().startsWith(cache.getPath() + File.separator)) {
                throw new SecurityException("Backupul nu este în zona temporară a aplicației.");
            }
            try (InputStream from = new FileInputStream(input);
                 OutputStream to = getContext().getContentResolver().openOutputStream(destination, "w")) {
                if (to == null) throw new IllegalStateException("Nu se poate deschide fișierul ales.");
                byte[] buffer = new byte[65536];
                int count;
                while ((count = from.read(buffer)) != -1) to.write(buffer, 0, count);
                to.flush();
            }
            JSObject ok = new JSObject();
            ok.put("saved", true);
            ok.put("uri", destination.toString());
            call.resolve(ok);
        } catch (Exception e) {
            call.reject("Salvarea copiei de siguranță a eșuat: " + e.getMessage(), e);
        }
    }
}
