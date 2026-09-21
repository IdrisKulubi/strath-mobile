import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { getAuthToken } from '@/lib/auth-helpers';
import { useAiConsent } from '@/hooks/use-ai-consent';
import { AI_CONSENT_REQUIRED_MESSAGE } from '@/lib/ai-consent';

// ============================================
// useVoiceInput — Gemini-powered voice transcription
// ============================================
// Architecture:
//   1. expo-audio records audio to a local .m4a file
//   2. File is read as base64 and POSTed to /api/agent/voice
//   3. Backend sends audio to Gemini 2.0 Flash for transcription
//   4. Transcript is returned and fed into the agent search
//
// This replaces expo-speech-recognition (Apple SFSpeechRecognizer)
// which silently fails on iPad Air and newer iPadOS versions.

interface UseVoiceInputOptions {
    /** Language hint (not used by Gemini but kept for API compat) */
    lang?: string;
    /** Called when a final transcript is ready */
    onTranscript?: (text: string) => void;
    /** Called on errors */
    onError?: (error: string) => void;
    /** Max recording duration in ms before auto-stop (default: 15000) */
    maxDurationMs?: number;
}

interface UseVoiceInputReturn {
    isRecording: boolean;
    /** True while audio is being uploaded and transcribed */
    isTranscribing: boolean;
    /** Final transcript text */
    transcript: string | null;
    /** Always empty — Gemini transcribes after recording, not live */
    liveTranscript: string;
    error: string | null;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    toggleRecording: () => Promise<void>;
    cancelRecording: () => void;
    clearTranscript: () => void;
    /** Volume level (0–10) for visualizations, driven by metering */
    volume: number;
}

const RECORDING_OPTIONS = {
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
};

const RECORDING_AUDIO_MODE = {
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers' as const,
    interruptionModeAndroid: 'duckOthers' as const,
    shouldDuckAndroid: true,
    shouldPlayInBackground: false,
};

const IDLE_AUDIO_MODE = {
    ...RECORDING_AUDIO_MODE,
    allowsRecording: false,
};

// Map dBFS metering (-160..0) to the 0–10 scale the overlay expects
function dbfsToVolume(db: number): number {
    if (db <= -60) return 0;
    if (db >= -10) return 10;
    return ((db + 60) / 50) * 10;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
    const { onTranscript, onError, maxDurationMs = 15000 } = options;
    const { hasAiConsent } = useAiConsent();

    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [volume, setVolume] = useState(0);

    const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelledRef = useRef(false);

    const onTranscriptRef = useRef(onTranscript);
    onTranscriptRef.current = onTranscript;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const recorder = useAudioRecorder(RECORDING_OPTIONS);
    const recorderState = useAudioRecorderState(recorder, 200);

    useEffect(() => {
        if (recorderState.isRecording && recorderState.metering !== undefined) {
            setVolume(dbfsToVolume(recorderState.metering));
        }
    }, [recorderState.isRecording, recorderState.metering]);

    const handleError = useCallback((msg: string) => {
        setError(msg);
        onErrorRef.current?.(msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, []);

    // ─── Transcribe the recorded file via backend ────────────────────────────
    const transcribeFile = useCallback(async (uri: string) => {
        setIsTranscribing(true);
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            const token = await getAuthToken();
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.strathspace.com';

            const response = await fetch(`${apiUrl}/api/agent/voice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({
                    audio: base64,
                    mimeType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                handleError(data.error || 'Could not understand — please try again');
                return;
            }

            const text: string = data.data?.transcript?.trim() ?? '';
            if (!text) {
                handleError("Couldn't understand — please try again");
                return;
            }

            setTranscript(text);
            onTranscriptRef.current?.(text);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.error('[VoiceInput] Transcription error:', err);
            handleError('Voice transcription failed — check your connection');
        } finally {
            setIsTranscribing(false);
            FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => null);
        }
    }, [handleError]);

    // ─── Start recording ─────────────────────────────────────────────────────
    const startRecording = useCallback(async () => {
        if (isRecording || isTranscribing) return;

        if (!hasAiConsent) {
            handleError(AI_CONSENT_REQUIRED_MESSAGE);
            return;
        }

        cancelledRef.current = false;
        setError(null);
        setTranscript(null);
        setVolume(0);

        try {
            const { granted } = await requestRecordingPermissionsAsync();
            if (!granted) {
                handleError('Microphone permission is required for voice search');
                return;
            }

            // MixWithOthers lets us activate the recording session without needing to
            // interrupt or evict other audio. DoNotMix causes iOS error !pri (561017449)
            // "AVAudioSessionErrorCodeCannotInterruptOthers" when any non-interruptible
            // session (Siri, calls, Expo Go host audio, etc.) is active.
            await setAudioModeAsync(RECORDING_AUDIO_MODE);
            await recorder.prepareToRecordAsync();
            recorder.record();

            setIsRecording(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            autoStopTimerRef.current = setTimeout(async () => {
                if (recorder.isRecording) {
                    await stopRecording();
                }
            }, maxDurationMs);
        } catch (err) {
            console.error('[VoiceInput] Failed to start recording:', err);
            handleError('Failed to start recording — please try again');
        }
    // stopRecording is defined below; we use a ref to avoid circular deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasAiConsent, isRecording, isTranscribing, handleError, maxDurationMs, recorder]);

    // ─── Stop recording and transcribe ───────────────────────────────────────
    const stopRecording = useCallback(async () => {
        if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
        }

        if (!recorder.isRecording && !isRecording) return;

        setIsRecording(false);
        setVolume(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            await recorder.stop();
            await setAudioModeAsync(IDLE_AUDIO_MODE);

            if (cancelledRef.current) return;

            const uri = recorder.uri;
            if (!uri) {
                handleError('Recording failed — no audio captured');
                return;
            }

            await transcribeFile(uri);
        } catch (err) {
            console.error('[VoiceInput] Failed to stop recording:', err);
            setAudioModeAsync(IDLE_AUDIO_MODE).catch(() => null);
            handleError('Failed to process recording — please try again');
        }
    }, [handleError, transcribeFile, recorder, isRecording]);

    // ─── Cancel without transcribing ─────────────────────────────────────────
    const cancelRecording = useCallback(() => {
        cancelledRef.current = true;

        if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
        }

        if (recorder.isRecording || isRecording) {
            recorder.stop()
                .then(() => setAudioModeAsync(IDLE_AUDIO_MODE))
                .then(() => {
                    const uri = recorder.uri;
                    if (uri) FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => null);
                })
                .catch(() => null);
        }

        setIsRecording(false);
        setIsTranscribing(false);
        setVolume(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [recorder, isRecording]);

    const toggleRecording = useCallback(async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    const clearTranscript = useCallback(() => {
        setTranscript(null);
    }, []);

    return {
        isRecording,
        isTranscribing,
        transcript,
        liveTranscript: '',
        error,
        startRecording,
        stopRecording,
        toggleRecording,
        cancelRecording,
        clearTranscript,
        volume,
    };
}
