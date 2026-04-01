/**
 * withAndroidAlarm.js — Expo Config Plugin
 *
 * Generates four Kotlin source files and patches AndroidManifest.xml +
 * MainApplication.kt during `expo prebuild` (run automatically by EAS Build).
 *
 * Files generated:
 *   AlarmReceiver.kt   — BroadcastReceiver woken by AlarmManager
 *   AlarmActivity.kt   — Full-screen lock-screen bridge activity
 *                        Plays system alarm sound + TTS immediately on wake,
 *                        then opens the React Native trigger screen via deep link.
 *   AlarmModule.kt     — ReactNative native module
 *                        (scheduleAlarm / cancelAlarm / stopNativeAlarm)
 *   AlarmPackage.kt    — Registers AlarmModule with the React bridge
 *
 * AndroidManifest.xml changes:
 *   SCHEDULE_EXACT_ALARM, USE_FULL_SCREEN_INTENT, RECEIVE_BOOT_COMPLETED permissions
 *   <receiver android:name=".AlarmReceiver" />
 *   <activity android:name=".AlarmActivity" showWhenLocked turnScreenOn … />
 *
 * MainApplication.kt changes:
 *   import com.unsnwooze.app.AlarmPackage
 *   packages.add(AlarmPackage())
 */

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPkgPath(projectRoot) {
  return path.join(
    projectRoot,
    'android', 'app', 'src', 'main', 'java',
    'com', 'unsnwooze', 'app',
  );
}

// ─── Kotlin source templates ──────────────────────────────────────────────────

const ALARM_RECEIVER = `package com.unsnwooze.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Receives broadcasts from AlarmManager and launches AlarmActivity.
 * AlarmActivity sets the lock-screen/wake flags, plays sound + TTS immediately,
 * then opens the React Native deep link.
 */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getStringExtra("alarmId") ?: return
        val title   = intent.getStringExtra("title")   ?: "Wake Up!"

        val activityIntent = Intent(context, AlarmActivity::class.java).apply {
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK  or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            putExtra("alarmId", alarmId)
            putExtra("title",   title)
        }
        context.startActivity(activityIntent)
    }
}
`;

const ALARM_ACTIVITY = `package com.unsnwooze.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.speech.tts.TextToSpeech
import android.view.WindowManager
import java.util.Locale

/**
 * Bridge activity that:
 *   1. Acquires FULL_WAKE_LOCK — screen turns on from killed/locked state.
 *   2. Sets FLAG_SHOW_WHEN_LOCKED / FLAG_TURN_SCREEN_ON / FLAG_DISMISS_KEYGUARD.
 *   3. Plays the system alarm sound IMMEDIATELY via MediaPlayer (no JS delay).
 *   4. Starts TextToSpeech IMMEDIATELY — speaks alarm title as soon as TTS engine
 *      is initialised (typically <300 ms).
 *   5. Launches the React Native app via the "unsnwooze://" deep link so Expo
 *      Router routes to /alarm/trigger while the native sound is already playing.
 *   6. Finishes itself — only the RN UI is visible. Sound + TTS keep playing via
 *      the companion-object singletons until AlarmModule.stopNativeAlarm() is
 *      called from JavaScript when the user completes the wake-up task.
 */
class AlarmActivity : Activity() {

    companion object {
        @Volatile var activePlayer: MediaPlayer? = null
        @Volatile var activeTts: TextToSpeech? = null

        /** Called by AlarmModule.stopNativeAlarm() from the JS side. */
        fun stopAll() {
            try { activePlayer?.stop() } catch (_: Throwable) {}
            try { activePlayer?.release() } catch (_: Throwable) {}
            activePlayer = null

            try { activeTts?.stop() } catch (_: Throwable) {}
            try { activeTts?.shutdown() } catch (_: Throwable) {}
            activeTts = null
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── Lock-screen & wake flags ─────────────────────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON   or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON   or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )

        // ── Wake lock (CPU + screen) ─────────────────────────────────────────
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        @Suppress("DEPRECATION")
        wakeLock = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK        or
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "unsnwooze:alarm:wakelock"
        )
        wakeLock?.acquire(10L * 60L * 1000L) // max 10 min

        val alarmId  = intent?.getStringExtra("alarmId") ?: ""
        val rawTitle = (intent?.getStringExtra("title") ?: "Wake Up!").trim()
        val spokenText = if (rawTitle.isNotEmpty()) "$rawTitle. Wake up." else "Wake up."

        // ── Stop any previously running native alarm (e.g. rapid re-trigger) ─
        stopAll()

        // ── 1. Play system alarm sound IMMEDIATELY ───────────────────────────
        startNativeSound(applicationContext)

        // ── 2. Speak the alarm title via TextToSpeech IMMEDIATELY ───────────
        // TextToSpeech.OnInitListener is a lambda — the Activity may be destroyed
        // before onInit fires, but applicationContext keeps the TTS service bound.
        val tts = TextToSpeech(applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                try {
                    activeTts?.language = Locale.getDefault()
                    activeTts?.speak(
                        spokenText,
                        TextToSpeech.QUEUE_FLUSH,
                        null,
                        "alarm_speech"
                    )
                } catch (_: Throwable) {}
            }
        }
        activeTts = tts

        // ── 3. Open React Native trigger screen via deep link ────────────────
        val deepLink = "unsnwooze://alarm/trigger?alarmId=\${Uri.encode(alarmId)}"
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data   = Uri.parse(deepLink)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("alarmId",    alarmId)
            putExtra("alarmTitle", rawTitle)
        }
        startActivity(mainIntent)

        // ── 4. Finish — only RN UI is visible; sound + TTS keep running ──────
        // companion-object singletons (activePlayer / activeTts) survive this.
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        try { wakeLock?.release() } catch (_: Throwable) {}
        // Do NOT stop activePlayer/activeTts here — they are companion-object
        // singletons that must keep playing after this Activity finishes.
        // They are stopped by AlarmModule.stopNativeAlarm() from JavaScript,
        // or by the next AlarmActivity.onCreate() via stopAll().
    }

    private fun startNativeSound(context: Context) {
        try {
            // Try the device's designated alarm ringtone first
            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: return

            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            val player = MediaPlayer().apply {
                setAudioAttributes(attrs)
                setDataSource(context, alarmUri)
                isLooping = true
                prepare()
                start()
            }
            activePlayer = player
        } catch (_: Exception) {
            // Fallback: generic ringtone on default stream
            try {
                val fallbackUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                    ?: return
                val player = MediaPlayer().apply {
                    setDataSource(context, fallbackUri)
                    isLooping = true
                    prepare()
                    start()
                }
                activePlayer = player
            } catch (_: Throwable) {}
        }
    }
}
`;

const ALARM_MODULE = `package com.unsnwooze.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module exposed to JavaScript as NativeModules.AlarmModule.
 *
 *   scheduleAlarm(scheduleId, title, timestampMs)  — set exact alarm
 *   cancelAlarm(scheduleId)                        — cancel scheduled alarm
 *   stopNativeAlarm()                              — stop MediaPlayer + TTS
 *                                                    started by AlarmActivity
 *
 * Each scheduleId is hashed to an Int request code so multiple alarms
 * (including per-weekday repeat slots) can coexist.
 */
class AlarmModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AlarmModule"

    private val alarmManager: AlarmManager
        get() = reactApplicationContext
            .getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun pendingIntent(
        scheduleId: String,
        title: String,
        flags: Int = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    ): PendingIntent {
        val intent = Intent(reactApplicationContext, AlarmReceiver::class.java).apply {
            putExtra("alarmId", scheduleId)
            putExtra("title",   title)
        }
        return PendingIntent.getBroadcast(
            reactApplicationContext,
            scheduleId.hashCode(),
            intent,
            flags,
        )
    }

    /**
     * Schedule an exact alarm.
     * @param scheduleId   Unique string key (may include weekday suffix for repeats)
     * @param title        Alarm label shown / spoken on wake
     * @param timestampMs  Unix timestamp in milliseconds (JS Date.now() compatible)
     */
    @ReactMethod
    fun scheduleAlarm(scheduleId: String, title: String, timestampMs: Double, promise: Promise) {
        try {
            val triggerAt = timestampMs.toLong()
            val pi = pendingIntent(scheduleId, title)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ALARM_ERROR", e.message, e)
        }
    }

    /** Cancel a previously scheduled alarm by its scheduleId. */
    @ReactMethod
    fun cancelAlarm(scheduleId: String, promise: Promise) {
        try {
            val pi = PendingIntent.getBroadcast(
                reactApplicationContext,
                scheduleId.hashCode(),
                Intent(reactApplicationContext, AlarmReceiver::class.java),
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
            )
            if (pi != null) {
                alarmManager.cancel(pi)
                pi.cancel()
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("CANCEL_ALARM_ERROR", e.message, e)
        }
    }

    /**
     * Stop the native MediaPlayer and TextToSpeech that AlarmActivity started.
     * Called from JavaScript (alarmSound.ts) when the user completes the wake-up
     * task, so the device-level alarm sound is silenced even if JS-side expo-audio
     * is stopped separately.
     */
    @ReactMethod
    fun stopNativeAlarm(promise: Promise) {
        try {
            AlarmActivity.stopAll()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_NATIVE_ALARM_ERROR", e.message, e)
        }
    }

    // Required for React Native event emitter compatibility
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
`;

const ALARM_PACKAGE = `package com.unsnwooze.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(AlarmModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;

// ─── 1. Write Kotlin source files ─────────────────────────────────────────────

const withKotlinFiles = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const pkgPath = getPkgPath(config.modRequest.projectRoot);
      fs.mkdirSync(pkgPath, { recursive: true });

      fs.writeFileSync(path.join(pkgPath, 'AlarmReceiver.kt'), ALARM_RECEIVER,  'utf8');
      fs.writeFileSync(path.join(pkgPath, 'AlarmActivity.kt'), ALARM_ACTIVITY,  'utf8');
      fs.writeFileSync(path.join(pkgPath, 'AlarmModule.kt'),   ALARM_MODULE,    'utf8');
      fs.writeFileSync(path.join(pkgPath, 'AlarmPackage.kt'),  ALARM_PACKAGE,   'utf8');

      return config;
    },
  ]);

// ─── 2. Patch AndroidManifest.xml ─────────────────────────────────────────────

const withAlarmManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const app = manifest.application[0];

    // ── Permissions ────────────────────────────────────────────────────────
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const wantedPerms = [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
    ];
    for (const perm of wantedPerms) {
      const exists = manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === perm,
      );
      if (!exists) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    // ── AlarmReceiver ──────────────────────────────────────────────────────
    if (!app.receiver) app.receiver = [];
    const hasReceiver = app.receiver.some(
      (r) => r.$?.['android:name'] === '.AlarmReceiver',
    );
    if (!hasReceiver) {
      app.receiver.push({
        $: {
          'android:name':     '.AlarmReceiver',
          'android:enabled':  'true',
          'android:exported': 'false',
        },
      });
    }

    // ── AlarmActivity ──────────────────────────────────────────────────────
    if (!app.activity) app.activity = [];
    const hasActivity = app.activity.some(
      (a) => a.$?.['android:name'] === '.AlarmActivity',
    );
    if (!hasActivity) {
      app.activity.push({
        $: {
          'android:name':               '.AlarmActivity',
          'android:showWhenLocked':     'true',
          'android:turnScreenOn':       'true',
          'android:exported':           'true',
          'android:excludeFromRecents': 'true',
          'android:taskAffinity':       '',
          'android:launchMode':         'singleTask',
          'android:theme':              '@style/Theme.AppCompat.NoActionBar',
        },
      });
    }

    return config;
  });

// ─── 3. Register AlarmPackage in MainApplication.kt ──────────────────────────

const withAlarmPackageRegistration = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const mainAppPath = path.join(
        getPkgPath(config.modRequest.projectRoot),
        'MainApplication.kt',
      );
      if (!fs.existsSync(mainAppPath)) return config;

      let src = fs.readFileSync(mainAppPath, 'utf8');

      // Skip if already patched
      if (src.includes('AlarmPackage()')) return config;

      // Add import after the package declaration
      if (!src.includes('import com.unsnwooze.app.AlarmPackage')) {
        src = src.replace(
          /^(package com\.unsnwooze\.app)/m,
          '$1\n\nimport com.unsnwooze.app.AlarmPackage',
        );
      }

      // Insert packages.add(AlarmPackage()) right after PackageList(this).packages
      src = src.replace(
        /(val packages = PackageList\(.*?\)\.packages)/,
        '$1\n          packages.add(AlarmPackage())',
      );

      fs.writeFileSync(mainAppPath, src, 'utf8');
      return config;
    },
  ]);

// ─── Export combined plugin ───────────────────────────────────────────────────

module.exports = (config) => {
  config = withKotlinFiles(config);
  config = withAlarmManifest(config);
  config = withAlarmPackageRegistration(config);
  return config;
};
