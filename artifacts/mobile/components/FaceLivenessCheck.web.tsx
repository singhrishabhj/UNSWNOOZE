import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  onVerified: () => void;
  onFailed: () => void;
}

type Phase = 'requesting' | 'ready' | 'detecting' | 'verified' | 'error';

const HINTS = [
  'Center your face in the frame',
  'Blink your eyes slowly',
  'Tilt your head slightly left or right',
  'Smile naturally',
  'Hold still a moment...',
];

export function FaceLivenessCheck({ onVerified, onFailed }: Props) {
  const containerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);

  const [phase, setPhase] = useState<Phase>('requesting');
  const [progress, setProgress] = useState(0);
  const [hintIdx, setHintIdx] = useState(0);
  const [motionScore, setMotionScore] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const motionAccum = useRef(0);
  const hintTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef(0);

  const VERIFY_DURATION = 3500;
  const MOTION_THRESHOLD = 12;
  const SAMPLE_W = 80;
  const SAMPLE_H = 60;

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (hintTimer.current) clearInterval(hintTimer.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.remove();
    }
    if (canvasRef.current) canvasRef.current.remove();
    animFrameRef.current = null;
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const analyzeFrames = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(analyzeFrames);
      return;
    }

    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    ctx2d.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
    const frame = ctx2d.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;

    if (prevFrameRef.current) {
      let diff = 0;
      for (let i = 0; i < frame.length; i += 4) {
        diff += Math.abs(frame[i] - prevFrameRef.current[i]);
      }
      const score = diff / (SAMPLE_W * SAMPLE_H);
      setMotionScore(score);

      if (score > MOTION_THRESHOLD) {
        motionAccum.current += 16;
      }

      const elapsed = Date.now() - startTime.current;
      const prog = Math.min(1, elapsed / VERIFY_DURATION);
      setProgress(prog);
      Animated.timing(progressAnim, { toValue: prog, duration: 60, useNativeDriver: false }).start();

      if (elapsed >= VERIFY_DURATION) {
        if (motionAccum.current > 400) {
          setPhase('verified');
          Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
          cleanup();
          setTimeout(onVerified, 800);
          return;
        } else {
          setPhase('error');
          cleanup();
          setTimeout(() => {
            setPhase('requesting');
            setProgress(0);
            motionAccum.current = 0;
            startCamera();
          }, 1500);
          return;
        }
      }
    }

    prevFrameRef.current = new Uint8ClampedArray(frame);
    animFrameRef.current = requestAnimationFrame(analyzeFrames);
  }, [onVerified, cleanup]);

  const startCamera = useCallback(async () => {
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
      });
      streamRef.current = stream;

      const container = containerRef.current;
      if (!container) return;

      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      video.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:50%;transform:scaleX(-1);';
      videoRef.current = video;

      const canvas = document.createElement('canvas');
      canvas.width = SAMPLE_W;
      canvas.height = SAMPLE_H;
      canvas.style.cssText = 'display:none;';
      canvasRef.current = canvas;

      container.appendChild(video);
      container.appendChild(canvas);

      video.onloadeddata = () => {
        setPhase('detecting');
        startTime.current = Date.now();
        motionAccum.current = 0;
        prevFrameRef.current = null;
        animFrameRef.current = requestAnimationFrame(analyzeFrames);
        hintTimer.current = setInterval(
          () => setHintIdx(i => (i + 1) % HINTS.length),
          1200,
        );
      };
    } catch {
      setPhase('error');
    }
  }, [analyzeFrames]);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const ringColor = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#FF6B00', '#FF8C33', '#4CAF50'],
  });

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,107,0,0)', 'rgba(76,175,80,0.4)'],
  });

  return (
    <View style={styles.wrapper}>
      {/* Camera circle */}
      <Animated.View
        style={[
          styles.cameraRing,
          { shadowColor: phase === 'verified' ? '#4CAF50' : Colors.primary },
          phase === 'verified' && { borderColor: '#4CAF50' },
        ]}
      >
        {/* Animated progress arc overlay */}
        <View ref={containerRef} style={styles.cameraCircle} />

        {(phase === 'requesting') && (
          <View style={styles.overlay}>
            <Feather name="camera" size={36} color="rgba(255,255,255,0.7)" />
            <Text style={styles.overlayText}>Accessing camera...</Text>
          </View>
        )}

        {phase === 'verified' && (
          <View style={[styles.overlay, { backgroundColor: 'rgba(76,175,80,0.6)' }]}>
            <Feather name="check-circle" size={48} color="#fff" />
          </View>
        )}

        {phase === 'error' && (
          <View style={[styles.overlay, { backgroundColor: 'rgba(255,59,48,0.6)' }]}>
            <Feather name="alert-circle" size={48} color="#fff" />
          </View>
        )}

        {/* Progress ring SVG */}
        {(phase === 'detecting' || phase === 'verified') && (
          <Animated.View
            style={[
              styles.progressRingContainer,
              { borderColor: ringColor, borderWidth: 4, borderRadius: 90 },
            ]}
            pointerEvents="none"
          />
        )}
      </Animated.View>

      {/* Status text */}
      <View style={styles.statusBlock}>
        {phase === 'detecting' && (
          <>
            <Text style={styles.statusLabel}>LIVELINESS CHECK</Text>
            <Text style={styles.hint}>{HINTS[hintIdx]}</Text>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          </>
        )}
        {phase === 'requesting' && (
          <Text style={styles.hint}>Allow camera access to continue</Text>
        )}
        {phase === 'verified' && (
          <Text style={[styles.hint, { color: '#4CAF50' }]}>Liveliness confirmed</Text>
        )}
        {phase === 'error' && (
          <>
            <Text style={[styles.hint, { color: '#FF3B30' }]}>
              Face verification failed. Please try again.
            </Text>
            <Pressable onPress={startCamera} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Motion indicator */}
      {phase === 'detecting' && (
        <View style={styles.motionRow}>
          <Text style={styles.motionLabel}>Motion</Text>
          <View style={styles.motionBarBg}>
            <View
              style={[
                styles.motionBarFill,
                {
                  width: `${Math.min(100, (motionScore / 40) * 100)}%`,
                  backgroundColor: motionScore > MOTION_THRESHOLD ? '#4CAF50' : '#FF6B00',
                },
              ]}
            />
          </View>
          <View
            style={[
              styles.motionDot,
              { backgroundColor: motionScore > MOTION_THRESHOLD ? '#4CAF50' : 'rgba(255,255,255,0.2)' },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  cameraRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(255,107,0,0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  cameraCircle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 90,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 90,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
  },
  overlayText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  progressRingContainer: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 94,
    zIndex: 3,
  },
  statusBlock: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 2,
  },
  hint: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  progressBarBg: {
    width: 200,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  progressPct: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.4)',
  },
  motionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  motionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.4)',
    width: 44,
  },
  motionBarBg: {
    width: 100,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  motionBarFill: {
    height: 3,
    borderRadius: 2,
  },
  motionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,59,48,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.4)',
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FF3B30',
  },
});
