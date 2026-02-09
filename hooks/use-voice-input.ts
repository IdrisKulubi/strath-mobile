import { useState, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { File as ExpoFile } from 'expo-file-system';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ============================================
// useVoiceInput — Records audio, sends to Gemini for transcription
// ============================================
// Flow:
// 1. Request mic permissions
// 2. Record audio (up to 10 seconds)
// 3. Convert to base64
// 4. Send to /api/agent/voice for Gemini transcription
// 5. Return transcript text

interface UseVoiceInputOptions {
    maxDuration?: number;        // Max recording duration in ms (default 10s)
    onTranscript?: (text: string) => void;
    onError?: (error: string) => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
    const { maxDuration = 30000, onTranscript, onError } = options;
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcript, setTranscript] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const stopRecordingRef = useRef<(() => Promise<void>) | undefined>(undefined);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setTranscript(null);

            // Request permissions
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) {
                const msg = 'Microphone permission is required for voice search';
                setError(msg);
                onError?.(msg);
                Alert.alert('Permission Required', msg);
                return;
            }

            // Configure audio session
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            // Start recording
            const { recording } = await Audio.Recording.createAsync(
                {
                    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                    android: {
                        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                        extension: '.m4a',
                        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                        audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    },
                    ios: {
                        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
                        extension: '.m4a',
                        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                    },
                }
            );

            recordingRef.current = recording;
            setIsRecording(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Auto-stop after maxDuration
            timeoutRef.current = setTimeout(() => {
                stopRecordingRef.current?.();
            }, maxDuration);

        } catch (err) {
            console.error('[VoiceInput] Failed to start recording:', err);
            const msg = 'Failed to start recording';
            setError(msg);
            onError?.(msg);
        }
    }, [maxDuration, onError]);

    const stopRecording = useCallback(async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (!recordingRef.current) return;

        try {
            setIsRecording(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;

            // Reset audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });

            if (!uri) {
                const msg = 'No audio recorded';
                setError(msg);
                onError?.(msg);
                return;
            }

            // Convert to base64
            setIsTranscribing(true);
            console.log('[VoiceInput] Recording URI:', uri);
            let base64Audio: string;
            try {
                const audioFile = new ExpoFile(uri);
                base64Audio = await audioFile.base64();
                console.log('[VoiceInput] Base64 length:', base64Audio.length);
            } catch (b64Err) {
                console.error('[VoiceInput] Base64 conversion failed:', b64Err);
                const msg = 'Failed to read audio file';
                setError(msg);
                onError?.(msg);
                return;
            }

            // Send to transcription API
            const token = await getAuthToken();
            let response: Response;
            try {
                response = await fetch(`${API_URL}/api/agent/voice`, {
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        audio: base64Audio,
                        mimeType: 'audio/mp4',
                    }),
                });
            } catch (networkErr) {
                console.error('[VoiceInput] Network error:', networkErr);
                const msg = 'Network error — check your connection';
                setError(msg);
                onError?.(msg);
                return;
            }

            // Safely parse JSON (server may return empty body on error)
            let result: any = {};
            try {
                const text = await response.text();
                if (text && text.length > 0) {
                    result = JSON.parse(text);
                }
            } catch (parseErr) {
                console.error('[VoiceInput] Failed to parse response:', parseErr);
                const msg = 'Invalid response from server';
                setError(msg);
                onError?.(msg);
                return;
            }

            if (!response.ok) {
                const msg = result.error || `Transcription failed (${response.status})`;
                setError(msg);
                onError?.(msg);
                return;
            }

            const text = result.data?.transcript || result.transcript;
            if (text) {
                setTranscript(text);
                onTranscript?.(text);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                const msg = "Couldn't understand the audio";
                setError(msg);
                onError?.(msg);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }

            // Clean up audio file
            try { new ExpoFile(uri).delete(); } catch {}

        } catch (err) {
            console.error('[VoiceInput] Failed to stop recording:', err);
            const msg = 'Failed to process audio';
            setError(msg);
            onError?.(msg);
        } finally {
            setIsTranscribing(false);
        }
    }, [onTranscript, onError]);

    // Keep ref in sync for auto-stop timer
    stopRecordingRef.current = stopRecording;

    const toggleRecording = useCallback(async () => {
        if (isRecording) {
            await stopRecording();
        } else {
            await startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    const cancelRecording = useCallback(async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (recordingRef.current) {
            try {
                await recordingRef.current.stopAndUnloadAsync();
                const uri = recordingRef.current.getURI();
                recordingRef.current = null;
                if (uri) try { new ExpoFile(uri).delete(); } catch {}
            } catch {}
        }

        setIsRecording(false);
        setIsTranscribing(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    return {
        isRecording,
        isTranscribing,
        transcript,
        error,
        startRecording,
        stopRecording,
        toggleRecording,
        cancelRecording,
    };
}
