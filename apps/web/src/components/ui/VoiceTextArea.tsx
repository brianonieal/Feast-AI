// @version 2.0.0 - Pantheon: Voice-assisted textarea
// Web Speech API (Chrome/Safari) as primary, MediaRecorder → Deepgram fallback
// Inline mic button, teal border when recording, live interim transcript
"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
  className?: string;
}

export function VoiceTextArea({
  value,
  onChange,
  placeholder,
  label,
  rows = 4,
  className = "",
}: VoiceTextAreaProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ESCAPE: Web Speech API type
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Capture value at recording start so live append works correctly
  const baseValueRef = useRef("");

  const startRecording = useCallback(async () => {
    setError(null);
    baseValueRef.current = value;

    // Try Web Speech API first (Chrome/Safari)
    const SpeechRecognition = getSpeechRecognition();
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = "";

      // ESCAPE: Web Speech API types not in standard TS lib
      recognition.onresult = (event: any) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const separator = baseValueRef.current.trim() ? " " : "";
        onChange(baseValueRef.current + separator + finalTranscript + interim);
      };

      recognition.onerror = () => {
        setError("Speech recognition failed. Please try again.");
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      return;
    }

    // Fallback: MediaRecorder → Deepgram via /api/voice/transcribe
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        setIsProcessing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const res = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = (await res.json()) as { transcript?: string };
          if (data.transcript) {
            const separator = baseValueRef.current.trim() ? " " : "";
            onChange(baseValueRef.current + separator + data.transcript);
          }
        } catch {
          setError("Transcription failed. Please try again.");
        } finally {
          setIsProcessing(false);
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access denied.");
    }
  }, [value, onChange]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="font-sans text-xs font-medium text-ink-mid mb-1 block">
          {label}
        </label>
      )}
      <div
        className={`relative rounded-lg border-[1.5px] bg-card transition-colors ${
          isRecording
            ? "border-teal"
            : "border-border focus-within:border-mustard"
        }`}
      >
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal rounded-t-md">
            <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
            <span className="text-white text-[11px] font-sans">
              Recording — text updates live
            </span>
          </div>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-none bg-transparent p-3 pr-10 text-sm font-sans text-ink placeholder-ink-light focus:outline-none rounded-lg leading-relaxed"
        />
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            isRecording
              ? "bg-coral-soft border border-coral text-coral"
              : "bg-mustard-soft border border-mustard text-mustard"
          } disabled:opacity-50`}
          title={isRecording ? "Stop recording" : "Start voice input"}
        >
          {isProcessing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : isRecording ? (
            <MicOff size={13} />
          ) : (
            <Mic size={13} />
          )}
        </button>
      </div>
      {isRecording && (
        <p className="text-[10px] text-teal font-sans">
          Tap the mic to stop · all text is editable
        </p>
      )}
      {error && <p className="text-[10px] text-coral font-sans">{error}</p>}
    </div>
  );
}

// --- Helpers ---

// ESCAPE: Web Speech API types not in standard TS lib — use any for browser globals
function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return (
    (window as { SpeechRecognition?: new () => any }).SpeechRecognition ??
    (window as { webkitSpeechRecognition?: new () => any })
      .webkitSpeechRecognition ??
    null
  );
}
