import { useState, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// ============================================
// useVoiceInput — Native on-device speech recognition
// ============================================
// Architecture (v2):
//   Uses expo-speech-recognition which wraps:
//   - iOS: Apple SFSpeechRecognizer (Siri engine)
//   - Android: Google SpeechRecognizer
//
// NOTE: expo-speech-recognition requires a dev build.
// In Expo Go, voice input will show an error explaining this.

// Dynamic import to avoid crash in Expo Go
let ExpoSpeechRecognitionModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null = null;
let useSpeechRecognitionEvent: typeof import('expo-speech-recognition').useSpeechRecognitionEvent | null = null;
let nativeModuleAvailable = false;

try {
    const speech = require('expo-speech-recognition');
    ExpoSpeechRecognitionModule = speech.ExpoSpeechRecognitionModule;
    useSpeechRecognitionEvent = speech.useSpeechRecognitionEvent;
    nativeModuleAvailable = true;
} catch {
    console.warn('[VoiceInput] expo-speech-recognition not available (requires dev build)');
}

interface UseVoiceInputOptions {
    /** Language for speech recognition (default: "en-US") */
    lang?: string;
    /** Called when a final transcript is ready */
    onTranscript?: (text: string) => void;
    /** Called on recognition errors */
    onError?: (error: string) => void;
}

interface UseVoiceInputReturn {
    /** Whether speech recognition is actively listening */
    isRecording: boolean;
    /** Kept for backwards compat — always false now (no separate transcription step) */
    isTranscribing: boolean;
    /** Final transcript text (set once recognition produces a final result) */
    transcript: string | null;
    /** Live partial transcript while user is speaking */
    liveTranscript: string;
    /** Error message if something went wrong */
    error: string | null;
    /** Start speech recognition */
    startRecording: () => Promise<void>;
    /** Stop recognition and get final result */
    stopRecording: () => void;
    /** Toggle start/stop */
    toggleRecording: () => Promise<void>;
    /** Abort recognition without producing a result */
    cancelRecording: () => void;
    /** Clear the transcript so it can be re-consumed */
    clearTranscript: () => void;
    /** Volume level (-2 to 10) for visualizations */
    volume: number;
}

// ─── No-op hook for when native module unavailable ───
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function useNoOpSpeechEvent(_event: string, _handler: (e: any) => void) {
    // Do nothing - native module not available
}

// Use real hook if available, otherwise no-op
const useSpeechEvent = nativeModuleAvailable && useSpeechRecognitionEvent
    ? useSpeechRecognitionEvent
    : useNoOpSpeechEvent;

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
    const { lang = 'en-US', onTranscript, onError } = options;

    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState<string | null>(null);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [volume, setVolume] = useState(0);

    // Refs to hold latest callbacks (avoids stale closures)
    const onTranscriptRef = useRef(onTranscript);
    onTranscriptRef.current = onTranscript;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    // Track whether we initiated the current session
    const sessionActiveRef = useRef(false);

    // ─── Event listeners (only if native module available) ───
    useSpeechEvent('start', () => {
        sessionActiveRef.current = true;
        setIsRecording(true);
        setError(null);
        setLiveTranscript('');
    });

    useSpeechEvent('end', () => {
        sessionActiveRef.current = false;
        setIsRecording(false);
        setLiveTranscript('');
    });

    useSpeechEvent('result', (event: any) => {
        const text = event.results[0]?.transcript ?? '';

        if (event.isFinal) {
            // Final result — this is the complete transcription
            const trimmed = text.trim();
            if (trimmed.length > 0) {
                setTranscript(trimmed);
                setLiveTranscript('');
                onTranscriptRef.current?.(trimmed);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                // Got an empty final result
                const msg = "Couldn't understand — please try again";
                setError(msg);
                onErrorRef.current?.(msg);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } else {
            // Interim result — show live text to user
            setLiveTranscript(text);
        }
    });

    useSpeechEvent('error', (event: any) => {
        sessionActiveRef.current = false;
        setIsRecording(false);

        // "aborted" is expected when we call .abort() — don't show as error
        if (event.error === 'aborted') return;

        let msg: string;
        switch (event.error) {
            case 'not-allowed':
                msg = 'Microphone permission is required for voice search';
                break;
            case 'no-speech':
                msg = 'No speech detected — try speaking louder';
                break;
            case 'network':
                msg = 'Network error — check your connection';
                break;
            case 'audio-capture':
                msg = 'Microphone not available';
                break;
            case 'service-not-allowed':
                msg = 'Speech recognition not available on this device';
                break;
            default:
                msg = event.message || 'Voice recognition failed';
        }

        console.warn('[VoiceInput] Error:', event.error, event.message);
        setError(msg);
        onErrorRef.current?.(msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    });

    useSpeechEvent('volumechange', (event: any) => {
        setVolume(event.value);
    });

    // ─── Actions ────────────────────────────────────────
    const startRecording = useCallback(async () => {
        // Check if native module is available (requires dev build, not Expo Go)
        if (!nativeModuleAvailable || !ExpoSpeechRecognitionModule) {
            const msg = Platform.select({
                ios: 'Voice search requires a development build. Please use TestFlight or build locally.',
                android: 'Voice search requires a development build. Please build the app locally.',
                default: 'Voice search is not available in Expo Go.',
            });
            setError(msg);
            onErrorRef.current?.(msg);
            Alert.alert(
                'Voice Search Unavailable',
                msg + '\n\nVoice search uses native speech recognition which cannot run in Expo Go.',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            setError(null);
            setTranscript(null);
            setLiveTranscript('');

            // Check if recognition is available
            const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
            if (!available) {
                const msg = 'Speech recognition is not available on this device';
                setError(msg);
                onErrorRef.current?.(msg);
                Alert.alert('Not Available', msg);
                return;
            }

            // Request permissions
            const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!result.granted) {
                const msg = 'Microphone & speech recognition permissions are required';
                setError(msg);
                onErrorRef.current?.(msg);
                Alert.alert('Permission Required', msg);
                return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Start native speech recognition
            ExpoSpeechRecognitionModule.start({
                lang,
                interimResults: true,
                // Non-continuous: stops automatically after user pauses speaking
                continuous: false,
                // Punctuation helps with readability
                addsPunctuation: true,
                // Optimize for search queries
                iosTaskHint: 'search',
                // Volume metering for animation
                volumeChangeEventOptions: {
                    enabled: true,
                    intervalMillis: 200,
                },
                // Improve accuracy for dating app context
                contextualStrings: [
                    'Strathmore', 'campus', 'dating', 'match',
                    'sporty', 'creative', 'funny', 'ambitious',
                    'music', 'engineering', 'business', 'art',
                ],
                // Android: use web_search model for better short query recognition
                androidIntentOptions: {
                    EXTRA_LANGUAGE_MODEL: 'web_search',
                },
            });
        } catch (err) {
            console.error('[VoiceInput] Failed to start:', err);
            const msg = 'Failed to start voice recognition';
            setError(msg);
            onErrorRef.current?.(msg);
        }
    }, [lang]);

    const stopRecording = useCallback(() => {
        if (!ExpoSpeechRecognitionModule) return;
        // stop() will attempt to return a final result
        ExpoSpeechRecognitionModule.stop();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const cancelRecording = useCallback(() => {
        if (ExpoSpeechRecognitionModule) {
            // abort() immediately cancels without final result
            ExpoSpeechRecognitionModule.abort();
        }
        setIsRecording(false);
        setLiveTranscript('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const toggleRecording = useCallback(async () => {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    const clearTranscript = useCallback(() => {
        setTranscript(null);
        setLiveTranscript('');
    }, []);

    return {
        isRecording,
        isTranscribing: false, // No separate transcription step with native STT
        transcript,
        liveTranscript,
        error,
        startRecording,
        stopRecording,
        toggleRecording,
        cancelRecording,
        clearTranscript,
        volume,
    };
}
