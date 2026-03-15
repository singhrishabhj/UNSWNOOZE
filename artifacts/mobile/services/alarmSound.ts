/**
 * Alarm sound service — plays a looping alarm on native (expo-audio)
 * and a Web Audio oscillator pattern on web. Persists across navigation
 * because the player object is a module-level singleton.
 *
 * Usage:
 *   import { startAlarm, stopAlarm } from '@/services/alarmSound';
 *   await startAlarm();   // starts looping
 *   await stopAlarm();    // stops and releases
 */
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

// ─── Native (expo-audio) ─────────────────────────────────────────────────────

let _player: ReturnType<typeof createAudioPlayer> | null = null;

async function _startNativeAlarm(): Promise<void> {
  try {
    // setAudioModeAsync is best-effort: if it fails (e.g. unsupported device
    // option) we still want the player to start, so it gets its own try/catch.
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
    } catch (modeErr) {
      console.warn('[alarmSound] setAudioModeAsync failed (non-fatal):', modeErr);
    }

    if (_player) {
      try { _player.release(); } catch {}
      _player = null;
    }

    _player = createAudioPlayer(
      require('../assets/sounds/alarm-beep.wav'),
    );
    _player.loop = true;
    _player.play();
  } catch (e) {
    console.warn('[alarmSound] Native start failed:', e);
  }
}

async function _stopNativeAlarm(): Promise<void> {
  try {
    if (_player) {
      _player.release();
      _player = null;
    }
  } catch (e) {
    console.warn('[alarmSound] Native stop failed:', e);
  }
}

// ─── Web (AudioContext oscillators) ──────────────────────────────────────────

let _webCtx: AudioContext | null = null;
let _webInterval: ReturnType<typeof setInterval> | null = null;

function _startWebAlarm(): void {
  if (typeof window === 'undefined') return;
  _stopWebAlarm();
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    _webCtx = new AudioCtx() as AudioContext;

    const master = _webCtx.createGain();
    master.gain.value = 0.45;
    master.connect(_webCtx.destination);

    const playBeep = (freq: number, startTime: number, dur: number) => {
      if (!_webCtx) return;
      const osc = _webCtx.createOscillator();
      const g = _webCtx.createGain();
      osc.connect(g);
      g.connect(master);
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(0.9, startTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.02);
    };

    const ring = () => {
      if (!_webCtx) return;
      const t = _webCtx.currentTime;
      playBeep(880, t, 0.18);
      playBeep(880, t + 0.22, 0.18);
      playBeep(1100, t + 0.44, 0.28);
    };

    ring();
    _webInterval = setInterval(ring, 1400);
  } catch {}
}

function _stopWebAlarm(): void {
  if (_webInterval) { clearInterval(_webInterval); _webInterval = null; }
  try { _webCtx?.close(); } catch {}
  _webCtx = null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function startAlarm(): Promise<void> {
  if (Platform.OS === 'web') {
    _startWebAlarm();
  } else {
    await _startNativeAlarm();
  }
}

export async function stopAlarm(): Promise<void> {
  if (Platform.OS === 'web') {
    _stopWebAlarm();
  } else {
    await _stopNativeAlarm();
  }
}
