import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  onVerified: () => void;
  onFailed: () => void;
}

// MediaPipe landmark indices
const NOSE_TIP = 1;
const L_EYE_OUTER = 33;   // subject's left eye outer corner (x≈0.7 in raw image)
const R_EYE_OUTER = 263;  // subject's right eye outer corner (x≈0.3 in raw image)

// Nose offset relative to eye width to consider "turned"
const ROTATE_THRESHOLD = 0.14;
const TIMEOUT_MS = 10_000;
const FACE_ABSENT_GRACE = 1000; // ms with no face before showing "no face" warning

type Phase =
  | 'loading'
  | 'no_face'
  | 'face_found'
  | 'turn_left'
  | 'turn_right'
  | 'verified'
  | 'failed';

function StepRow({
  done,
  active,
  label,
}: {
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <View style={step.row}>
      <View
        style={[
          step.circle,
          done && step.done,
          active && !done && step.active,
        ]}
      >
        {done ? (
          <Feather name="check" size={12} color="#fff" />
        ) : (
          <View
            style={[
              step.dot,
              active && { backgroundColor: Colors.primary },
            ]}
          />
        )}
      </View>
      <Text
        style={[
          step.label,
          done && { color: '#4CAF50' },
          active && !done && { color: '#fff' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function FaceLivenessCheck({ onVerified }: Props) {
  const containerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noFaceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const faceMeshRef = useRef<any>(null);

  const hasLeft = useRef(false);
  const hasRight = useRef(false);
  const baseNoseOffset = useRef<number | null>(null);
  const lastFaceAt = useRef<number>(Date.now());

  const [phase, setPhase] = useState<Phase>('loading');
  const [faceOk, setFaceOk] = useState(false);
  const [leftOk, setLeftOk] = useState(false);
  const [rightOk, setRightOk] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopAll = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (noFaceTimerRef.current) { clearTimeout(noFaceTimerRef.current); noFaceTimerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.remove(); videoRef.current = null; }
    if (canvasRef.current) { canvasRef.current.remove(); canvasRef.current = null; }
    if (overlayRef.current) { overlayRef.current.remove(); overlayRef.current = null; }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  // Draw a single point on the overlay canvas (nose tip indicator)
  const drawOverlay = useCallback(
    (nose: { x: number; y: number } | null, vw: number, vh: number) => {
      const oc = overlayRef.current;
      if (!oc) return;
      const ctx = oc.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, vw, vh);
      if (!nose) return;
      // Mirror the x coordinate to match the mirrored video display
      const mx = (1 - nose.x) * vw;
      const my = nose.y * vh;
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,107,0,0.85)';
      ctx.fill();
    },
    []
  );

  const onResults = useCallback(
    (results: any) => {
      const vid = videoRef.current;
      if (!vid) return;
      const vw = vid.videoWidth || 640;
      const vh = vid.videoHeight || 480;

      const lmSet = results.multiFaceLandmarks;
      if (!lmSet || lmSet.length === 0) {
        // Face absent — start grace timer
        if (noFaceTimerRef.current === null) {
          noFaceTimerRef.current = setTimeout(() => {
            setPhase(p =>
              p !== 'verified' && p !== 'failed' ? 'no_face' : p
            );
          }, FACE_ABSENT_GRACE);
        }
        drawOverlay(null, vw, vh);
        return;
      }

      // Face present — cancel no-face grace timer
      if (noFaceTimerRef.current) {
        clearTimeout(noFaceTimerRef.current);
        noFaceTimerRef.current = null;
      }
      lastFaceAt.current = Date.now();

      const lm = lmSet[0];
      const nose = lm[NOSE_TIP];
      const lEye = lm[L_EYE_OUTER];
      const rEye = lm[R_EYE_OUTER];
      if (!nose || !lEye || !rEye) return;

      drawOverlay(nose, vw, vh);

      setFaceOk(true);
      setPhase(p => (p === 'loading' || p === 'no_face' ? 'face_found' : p));

      // Eye midpoint
      const midX = (lEye.x + rEye.x) / 2;
      const faceW = Math.abs(lEye.x - rEye.x);
      if (faceW < 0.01) return;

      // normalised offset: positive = nose right of midpoint = subject turned LEFT
      const offset = (nose.x - midX) / faceW;

      // Establish baseline once face is stable
      if (baseNoseOffset.current === null) {
        baseNoseOffset.current = offset;
        return;
      }

      const delta = offset - baseNoseOffset.current;

      // Step 1: detect LEFT turn
      if (!hasLeft.current && delta > ROTATE_THRESHOLD) {
        hasLeft.current = true;
        setLeftOk(true);
        setPhase('turn_right');
      }

      // Step 2: detect RIGHT turn (must have done left first)
      if (hasLeft.current && !hasRight.current && delta < -ROTATE_THRESHOLD) {
        hasRight.current = true;
        setRightOk(true);
        setPhase('verified');
        stopAll();
        setTimeout(onVerified, 700);
      }
    },
    [drawOverlay, stopAll, onVerified]
  );

  const start = useCallback(async () => {
    stopAll();
    setPhase('loading');
    setFaceOk(false);
    setLeftOk(false);
    setRightOk(false);
    hasLeft.current = false;
    hasRight.current = false;
    baseNoseOffset.current = null;

    try {
      // Dynamically load MediaPipe FaceMesh from CDN
      const loadScript = (src: string) =>
        new Promise<void>((res, rej) => {
          if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
          const s = document.createElement('script');
          s.src = src;
          s.crossOrigin = 'anonymous';
          s.onload = () => res();
          s.onerror = rej;
          document.head.appendChild(s);
        });

      const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';
      await loadScript(`${CDN}/face_mesh.js`);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      const container = containerRef.current as HTMLDivElement | null;
      if (!container) return;

      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      video.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:50%;transform:scaleX(-1);';
      videoRef.current = video;
      container.appendChild(video);

      // Hidden sampling canvas
      const canvas = document.createElement('canvas');
      canvas.style.display = 'none';
      canvasRef.current = canvas;
      container.appendChild(canvas);

      // Overlay canvas (mirrored to match video display)
      const overlay = document.createElement('canvas');
      overlay.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;pointer-events:none;z-index:2;';
      overlayRef.current = overlay;
      container.appendChild(overlay);

      await new Promise<void>(r => { video.onloadeddata = () => r(); });
      overlay.width = video.videoWidth || 640;
      overlay.height = video.videoHeight || 480;

      const FaceMeshCtor = (window as any).FaceMesh;
      const fm = new FaceMeshCtor({
        locateFile: (f: string) => `${CDN}/${f}`,
      });
      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      fm.onResults(onResults);
      faceMeshRef.current = fm;

      const loop = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        try { await fm.send({ image: videoRef.current }); } catch { /* silent */ }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      // 10 second timeout
      timeoutRef.current = setTimeout(() => {
        stopAll();
        setPhase('failed');
      }, TIMEOUT_MS);
    } catch {
      setPhase('failed');
    }
  }, [onResults, stopAll]);

  useEffect(() => { start(); }, [start]);

  // ── render ──────────────────────────────────────────────────────────────────

  const borderColor =
    phase === 'verified' ? '#4CAF50'
    : phase === 'failed' ? '#FF3B30'
    : phase === 'no_face' ? '#FF9500'
    : Colors.primary;

  const instruction =
    phase === 'loading' ? 'Opening camera…'
    : phase === 'no_face' ? 'No face detected. Please look at the camera.'
    : phase === 'face_found' ? 'Face detected! Rotate your head LEFT.'
    : phase === 'turn_left' ? 'Rotate your head LEFT.'
    : phase === 'turn_right' ? 'Good! Now rotate your head RIGHT.'
    : phase === 'verified' ? 'Liveliness confirmed!'
    : 'Face verification failed. Please try again.';

  const instrColor =
    phase === 'verified' ? '#4CAF50'
    : phase === 'failed' ? '#FF3B30'
    : phase === 'no_face' ? '#FF9500'
    : 'rgba(255,255,255,0.85)';

  return (
    <View style={styles.wrapper}>
      {/* Camera circle */}
      <Animated.View
        style={[
          styles.camRing,
          {
            borderColor,
            shadowColor: borderColor,
            transform: [{ scale: phase === 'loading' ? pulseAnim : 1 }],
          },
        ]}
      >
        <View ref={containerRef} style={styles.camCircle} />

        {/* Loading overlay */}
        {phase === 'loading' && (
          <View style={styles.overlay}>
            <Feather name="camera" size={32} color="rgba(255,255,255,0.6)" />
            <Text style={styles.overlayText}>Starting camera…</Text>
          </View>
        )}

        {/* Verified overlay */}
        {phase === 'verified' && (
          <View style={[styles.overlay, { backgroundColor: 'rgba(76,175,80,0.55)' }]}>
            <Feather name="check-circle" size={52} color="#fff" />
          </View>
        )}

        {/* Failed overlay */}
        {phase === 'failed' && (
          <View style={[styles.overlay, { backgroundColor: 'rgba(255,59,48,0.55)' }]}>
            <Feather name="alert-circle" size={52} color="#fff" />
          </View>
        )}

        {/* No-face warning badge */}
        {phase === 'no_face' && (
          <View style={styles.noFaceBadge}>
            <Feather name="alert-triangle" size={14} color="#fff" />
          </View>
        )}
      </Animated.View>

      {/* Instruction */}
      <Text style={[styles.instruction, { color: instrColor }]}>{instruction}</Text>

      {/* Step checklist */}
      {phase !== 'loading' && phase !== 'failed' && (
        <View style={styles.steps}>
          <StepRow done={faceOk} active={!faceOk} label="Face detected" />
          <StepRow done={leftOk} active={faceOk && !leftOk} label="Turn head left" />
          <StepRow done={rightOk} active={leftOk && !rightOk} label="Turn head right" />
        </View>
      )}

      {/* Retry button */}
      {phase === 'failed' && (
        <Pressable
          onPress={start}
          style={({ pressed }) => [styles.retryBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="refresh-cw" size={14} color="#FF3B30" />
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── step row styles ───────────────────────────────────────────────────────────
const step = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  active: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,107,0,0.12)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.4)',
  },
});

// ── main styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 22,
    width: '100%',
  },
  camRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  camCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 5,
  },
  overlayText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  noFaceBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 6,
  },
  instruction: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  steps: {
    gap: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.35)',
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FF3B30',
  },
});
