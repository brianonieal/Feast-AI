// @version 2.0.0 - Pantheon: Voice input hook using expo-av + Deepgram
// Records audio, uploads to /api/voice/transcribe, returns transcript.
// No Web Speech API on mobile — always record → upload → transcribe.

import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";

// ESCAPE: Expo env vars accessed via process.env at build time
declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export interface VoiceInputState {
  isRecording: boolean;
  transcript: string;
  isProcessing: boolean;
  error: string | null;
}

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    transcript: "",
    isProcessing: false,
    error: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setState((s) => ({ ...s, error: "Microphone access denied" }));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setState((s) => ({ ...s, isRecording: true, error: null }));
    } catch {
      setState((s) => ({
        ...s,
        error: "Microphone access denied",
        isRecording: false,
      }));
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    setState((s) => ({ ...s, isRecording: false, isProcessing: true }));

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error("No recording URI");

      // Upload to Deepgram via API route
      const formData = new FormData();
      formData.append("audio", {
        uri,
        type: "audio/m4a",
        name: "recording.m4a",
      } as unknown as Blob);

      const res = await fetch(`${API_URL}/api/voice/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { transcript?: string };
      const text = data.transcript ?? "";

      setState((s) => ({ ...s, transcript: text, isProcessing: false }));
      if (text) onTranscript(text);
    } catch {
      setState((s) => ({
        ...s,
        isProcessing: false,
        error: "Transcription failed. Please try again.",
      }));
    }
  }, [onTranscript]);

  const clearTranscript = useCallback(() => {
    setState((s) => ({ ...s, transcript: "" }));
  }, []);

  return { ...state, startRecording, stopRecording, clearTranscript };
}
