package ro.starciuc.foaieparcurs;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle state) {
        registerPlugin(TripNotificationPlugin.class);
        registerPlugin(NSFileSavePlugin.class);
        super.onCreate(state);
    }
}
