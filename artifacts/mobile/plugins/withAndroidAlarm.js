/**
 * withAndroidAlarm.js — Expo Config Plugin
 *
 * Runs automatically during `expo prebuild` (EAS Build).
 *
 * What this does:
 *   1. Copies assets/sounds/alarm-beep.wav → android/app/src/main/res/raw/alarm_beep.wav
 *      so AlarmActivity can reference it as R.raw.alarm_beep (guaranteed sound,
 *      no dependence on device alarm ringtone settings).
 *   2. Writes four Kotlin source files:
 *        AlarmReceiver.kt  — BroadcastReceiver triggered by AlarmManager
 *        AlarmActivity.kt  — Lock-screen full-screen activity:
 *                             plays R.raw.alarm_beep immediately + TTS
 *        AlarmModule.kt    — Native module: scheduleAlarm / cancelAlarm / stopNativeAlarm
 *        AlarmPackage.kt   — Registers AlarmModule with the React bridge
 *   3. Patches AndroidManifest.xml:
 *        Permissions: SCHEDULE_EXACT_ALARM, USE_FULL_SCREEN_INTENT, WAKE_LOCK, RECEIVE_BOOT_COMPLETED
 *        <receiver> for AlarmReceiver (exported=true — needed for AlarmManager on OEM ROMs)
 *        <activity> for AlarmActivity with showWhenLocked / turnScreenOn
 *   4. Patches MainApplication.kt:
 *        adds import + packages.add(AlarmPackage())
 */

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs   = require('fs');

// ─── Path helpers ─────────────────────────────────────────────────────────────

function getPkgPath(projectRoot) {
  return path.join(
    projectRoot,
    'android', 'app', 'src', 'main', 'java',
    'com', 'unsnwooze', 'app',
  );
}

function getResRawPath(projectRoot) {
  return path.join(
    projectRoot,
    'android', 'app', 'src', 'main', 'res', 'raw',
  );
}

// ─── Step 0 — Copy alarm-beep.wav into res/raw/ ───────────────────────────────
// AlarmActivity uses MediaPlayer.create(this, R.raw.alarm_beep) for guaranteed,
// device-independent alarm sound that works even when no system ringtone is set.

const withAlarmSoundAsset = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const resRawPath = getResRawPath(config.modRequest.projectRoot);
      fs.mkdirSync(resRawPath, { recursive: true });

      const src  = path.join(config.modRequest.projectRoot, 'assets', 'sounds', 'alarm-beep.wav');
      const dest = path.join(resRawPath, 'alarm_beep.wav');

      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      } else {
        // Fallback: write a minimal 1-second 440 Hz sine-wave WAV so the build
        // never fails due to a missing asset. The real file is used in production.
        const sampleRate   = 44100;
        const numSamples   = sampleRate; // 1 second
        const numChannels  = 1;
        const bitsPerSmp   = 16;
        const byteRate     = sampleRate * numChannels * (bitsPerSmp / 8);
        const blockAlign   = numChannels * (bitsPerSmp / 8);
        const dataSize     = numSamples * blockAlign;
        const headerSize   = 44;
        const buf          = Buffer.alloc(headerSize + dataSize);
        // RIFF header
        buf.write('RIFF', 0);
        buf.writeUInt32LE(36 + dataSize, 4);
        buf.write('WAVE', 8);
        buf.write('fmt ', 12);
        buf.writeUInt32LE(16, 16);
        buf.writeUInt16LE(1, 20);           // PCM
        buf.writeUInt16LE(numChannels, 22);
        buf.writeUInt32LE(sampleRate, 24);
        buf.writeUInt32LE(byteRate, 28);
        buf.writeUInt16LE(blockAlign, 32);
        buf.writeUInt16LE(bitsPerSmp, 34);
        buf.write('data', 36);
        buf.writeUInt32LE(dataSize, 40);
        for (let i = 0; i < numSamples; i++) {
          const t     = i / sampleRate;
          const val   = Math.sin(2 * Math.PI * 440 * t);
          const int16 = Math.max(-32768, Math.min(32767, Math.round(val * 32767)));
          buf.writeInt16LE(int16, headerSize + i * 2);
        }
        fs.writeFileSync(dest, buf);
      }

      return config;
    },
  ]);

// ─── Kotlin templates ─────────────────────────────────────────────────────────

const ALARM_RECEIVER = `package com.unsnwooze.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Woken by AlarmManager. Starts AlarmActivity which plays sound + TTS and
 * opens the React Native alarm screen via deep link.
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

const BOOT_RECEIVER = `package com.unsnwooze.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Receives ACTION_BOOT_COMPLETED (and OEM equivalents) after the device reboots.
 * AlarmManager alarms are cleared on reboot; we restart the app so the React
 * Native layer can reschedule them via NotificationSync (syncNativeAlarms +
 * syncAlarmNotifications).
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.htc.intent.action.QUICKBOOT_POWERON") {
            try {
                val mainIntent = Intent(context, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                    putExtra("from_boot", true)
                }
                context.startActivity(mainIntent)
            } catch (_: Throwable) {}
        }
    }
}
`;

const ALARM_ACTIVITY = `package com.unsnwooze.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.speech.tts.TextToSpeech
import android.view.WindowManager
import java.util.Locale

/**
 * Full-screen lock-screen bridge activity.
 *
 * Execution order in onCreate():
 *   1. Set FLAG_SHOW_WHEN_LOCKED / FLAG_TURN_SCREEN_ON / FLAG_KEEP_SCREEN_ON
 *   2. Acquire FULL_WAKE_LOCK so the CPU + screen stay on
 *   3. Play alarm sound IMMEDIATELY via MediaPlayer (R.raw.alarm_beep)
 *      — no network call, no JS bundle load, guaranteed device-independent
 *   4. Initialise TextToSpeech — speaks alarm title the moment TTS is ready
 *      — uses applicationContext so the callback fires even after finish()
 *   5. Launch MainActivity via deep link → Expo Router → /alarm/trigger
 *   6. Call finish() — RN UI takes over; MediaPlayer + TTS keep running via
 *      companion-object singletons until AlarmModule.stopNativeAlarm() is
 *      called from JavaScript when the user completes the wake-up task
 */
class AlarmActivity : Activity() {

    companion object {
        @Volatile var activePlayer: MediaPlayer? = null
        @Volatile var activeTts: TextToSpeech?   = null

        /** Called by AlarmModule.stopNativeAlarm() from JavaScript. */
        fun stopAll() {
            try { activePlayer?.stop()    } catch (_: Throwable) {}
            try { activePlayer?.release() } catch (_: Throwable) {}
            activePlayer = null

            try { activeTts?.stop()     } catch (_: Throwable) {}
            try { activeTts?.shutdown() } catch (_: Throwable) {}
            activeTts = null
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── 1. Lock-screen and wake-screen flags ─────────────────────────────
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

        // ── 2. Wake lock (CPU + screen, max 10 min) ──────────────────────────
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        @Suppress("DEPRECATION")
        wakeLock = pm.newWakeLock(
            PowerManager.FULL_WAKE_LOCK        or
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "unsnwooze:alarm:wakelock"
        )
        wakeLock?.acquire(10L * 60L * 1000L)

        val alarmId    = intent?.getStringExtra("alarmId") ?: ""
        val rawTitle   = (intent?.getStringExtra("title") ?: "Wake Up!").trim()
        val spokenText = if (rawTitle.isNotEmpty()) "$rawTitle. Wake up." else "Wake up."

        // Stop any previous native alarm (e.g. rapid re-trigger or missed alarm)
        stopAll()

        // ── 3. Play alarm sound IMMEDIATELY (R.raw.alarm_beep) ──────────────
        try {
            val player = MediaPlayer.create(this, R.raw.alarm_beep)
            if (player != null) {
                player.isLooping = true
                player.start()
                activePlayer = player
            }
        } catch (e: Exception) {
            // Last-resort fallback: system alarm ringtone
            try {
                val uri = android.media.RingtoneManager
                    .getDefaultUri(android.media.RingtoneManager.TYPE_ALARM)
                    ?: android.media.RingtoneManager
                        .getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE)
                if (uri != null) {
                    val attrs = android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                    val fallback = MediaPlayer().apply {
                        setAudioAttributes(attrs)
                        setDataSource(applicationContext, uri)
                        isLooping = true
                        prepare()
                        start()
                    }
                    activePlayer = fallback
                }
            } catch (_: Throwable) {}
        }

        // ── 4. TextToSpeech — speaks title as soon as TTS engine is ready ───
        // activeTts is assigned BEFORE this callback ever fires (Android TTS
        // always calls OnInitListener asynchronously via a Handler post, so the
        // assignment below is guaranteed to complete first).
        val tts = TextToSpeech(applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                try {
                    val ref = activeTts ?: return@TextToSpeech
                    // Attempt device locale; fall back to English if unsupported.
                    val locResult = ref.setLanguage(Locale.getDefault())
                    if (locResult == TextToSpeech.LANG_MISSING_DATA ||
                        locResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                        ref.setLanguage(Locale.ENGLISH)
                    }
                    ref.speak(spokenText, TextToSpeech.QUEUE_FLUSH, null, "alarm_speech")
                } catch (_: Throwable) {}
            }
        }
        activeTts = tts

        // ── 5. Open React Native trigger screen via deep link ────────────────
        val deepLink = "unsnwooze://alarm/trigger?alarmId=\${Uri.encode(alarmId)}"
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data   = Uri.parse(deepLink)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("alarmId",    alarmId)
            putExtra("alarmTitle", rawTitle)
        }
        startActivity(mainIntent)

        // ── 6. Finish — companion-object singletons keep sound + TTS running ─
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        try { wakeLock?.release() } catch (_: Throwable) {}
        // Do NOT stop activePlayer/activeTts here — they are companion-object
        // singletons that must keep running after this Activity is destroyed.
        // Stopped by AlarmModule.stopNativeAlarm() called from JS stopAlarm().
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
 * Exposed to JavaScript as NativeModules.AlarmModule.
 *
 *   scheduleAlarm(scheduleId, title, timestampMs)  — schedule an exact alarm
 *   cancelAlarm(scheduleId)                        — cancel a scheduled alarm
 *   stopNativeAlarm()                              — stop MediaPlayer + TTS
 *                                                    running in AlarmActivity
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
     * @param title        Alarm label spoken via TTS on wake
     * @param timestampMs  Unix timestamp ms (compatible with JS Date.now())
     */
    @ReactMethod
    fun scheduleAlarm(scheduleId: String, title: String, timestampMs: Double, promise: Promise) {
        try {
            val triggerAt = timestampMs.toLong()
            val pi = pendingIntent(scheduleId, title)
            when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
                    // Android 12+: SCHEDULE_EXACT_ALARM requires explicit user grant.
                    // Use exact if granted; fall back to setAndAllowWhileIdle (~15 min window)
                    // so the alarm still fires rather than silently failing.
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                    } else {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                    }
                }
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                }
                else -> {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi)
                }
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ALARM_ERROR", e.message, e)
        }
    }

    /** Cancel a previously scheduled alarm. */
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
     * Stop the MediaPlayer and TextToSpeech started by AlarmActivity.
     * Called from alarmSound.ts (startAlarm and stopAlarm) so the native
     * audio layer is always silenced when JS audio takes over or the alarm ends.
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

// ─── Step 1 — Write Kotlin source files ───────────────────────────────────────

const withKotlinFiles = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const pkgPath = getPkgPath(config.modRequest.projectRoot);
      fs.mkdirSync(pkgPath, { recursive: true });

      fs.writeFileSync(path.join(pkgPath, 'AlarmReceiver.kt'), ALARM_RECEIVER, 'utf8');
      fs.writeFileSync(path.join(pkgPath, 'AlarmActivity.kt'), ALARM_ACTIVITY, 'utf8');
      fs.writeFileSync(path.join(pkgPath, 'AlarmModule.kt'),   ALARM_MODULE,   'utf8');
      fs.writeFileSync(path.join(pkgPath, 'AlarmPackage.kt'),  ALARM_PACKAGE,  'utf8');
      fs.writeFileSync(path.join(pkgPath, 'BootReceiver.kt'),  BOOT_RECEIVER,  'utf8');

      return config;
    },
  ]);

// ─── Step 2 — Patch AndroidManifest.xml ──────────────────────────────────────

const withAlarmManifest = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const app      = manifest.application[0];

    // Permissions
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

    // AlarmReceiver — exported:true required so AlarmManager can deliver
    // broadcasts on aggressive OEM ROMs (MIUI, ColorOS, etc.)
    if (!app.receiver) app.receiver = [];
    const hasAlarmReceiver = app.receiver.some(
      (r) => r.$?.['android:name'] === '.AlarmReceiver',
    );
    if (!hasAlarmReceiver) {
      app.receiver.push({
        $: {
          'android:name':     '.AlarmReceiver',
          'android:enabled':  'true',
          'android:exported': 'true',
        },
      });
    }

    // BootReceiver — reschedules AlarmManager alarms after device reboot.
    // AlarmManager entries are cleared by the OS on reboot; this receiver
    // starts MainActivity which re-runs syncNativeAlarms via NotificationSync.
    const hasBootReceiver = app.receiver.some(
      (r) => r.$?.['android:name'] === '.BootReceiver',
    );
    if (!hasBootReceiver) {
      app.receiver.push({
        $: {
          'android:name':     '.BootReceiver',
          'android:enabled':  'true',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
            ],
            category: [
              { $: { 'android:name': 'android.intent.category.DEFAULT' } },
            ],
          },
        ],
      });
    }

    // AlarmActivity
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

// ─── Step 3 — Register AlarmPackage in MainApplication.kt ────────────────────

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

      if (src.includes('AlarmPackage()')) return config; // already patched

      if (!src.includes('import com.unsnwooze.app.AlarmPackage')) {
        src = src.replace(
          /^(package com\.unsnwooze\.app)/m,
          '$1\n\nimport com.unsnwooze.app.AlarmPackage',
        );
      }

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
  config = withAlarmSoundAsset(config);      // Step 0: res/raw/alarm_beep.wav
  config = withKotlinFiles(config);           // Step 1: Kotlin sources
  config = withAlarmManifest(config);         // Step 2: AndroidManifest.xml
  config = withAlarmPackageRegistration(config); // Step 3: MainApplication.kt
  return config;
};
