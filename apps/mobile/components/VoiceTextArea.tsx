// @version 2.0.0 - Pantheon: Voice-assisted TextInput for mobile
// Inline mic button, teal border when recording, editable transcript
// React Native only — no lucide-react, uses emoji/text for icons

import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useVoiceInput } from "../hooks/useVoiceInput";

const C = {
  navy: "#2D1B69",
  mustard: "#C97B1A",
  teal: "#1D9E75",
  coral: "#E05535",
  border: "#E5DDD0",
  card: "#FDF9F2",
  mustardSoft: "#FDF0DC",
  coralSoft: "#FCEEE9",
  inkLt: "#9490B0",
  ink: "#1A1429",
};

interface VoiceTextAreaProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: number;
}

export function VoiceTextArea({
  value,
  onChangeText,
  placeholder,
  label,
  minHeight = 100,
}: VoiceTextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);

  const { isRecording, isProcessing, error, startRecording, stopRecording } =
    useVoiceInput((transcript) => {
      const separator = value.trim() ? " " : "";
      onChangeText(value + separator + transcript);
    });

  const borderColor = isRecording ? C.teal : isFocused ? C.mustard : C.border;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.fieldWrapper, { borderColor }]}>
        {isRecording && (
          <View style={styles.recordingPill}>
            <View style={styles.redDot} />
            <Text style={styles.recordingText}>Recording...</Text>
          </View>
        )}
        {isProcessing && (
          <View style={styles.processingPill}>
            <ActivityIndicator size="small" color={C.teal} />
            <Text style={styles.processingText}>Transcribing...</Text>
          </View>
        )}
        <TextInput
          style={[styles.input, { minHeight }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.inkLt}
          multiline
          textAlignVertical="top"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={C.teal} />
          ) : (
            <Text
              style={[styles.micIcon, isRecording && { color: C.coral }]}
            >
              {isRecording ? "■" : "🎙"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      {isRecording && (
        <Text style={styles.hint}>Tap ■ to stop · text is editable</Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 10,
    color: C.mustard,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    fontWeight: "500",
    marginBottom: 6,
  },
  fieldWrapper: {
    borderWidth: 1.5,
    borderRadius: 10,
    backgroundColor: C.card,
    overflow: "hidden",
  },
  recordingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.teal,
    paddingHorizontal: 10,
    paddingVertical: 4,
    margin: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  redDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.coral,
    marginRight: 6,
  },
  recordingText: { color: "white", fontSize: 11 },
  processingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    margin: 8,
  },
  processingText: { color: C.teal, fontSize: 11 },
  input: {
    padding: 12,
    paddingRight: 44,
    fontSize: 14,
    color: C.ink,
    lineHeight: 22,
  },
  micButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.mustardSoft,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.mustard,
  },
  micButtonActive: {
    backgroundColor: C.coralSoft,
    borderColor: C.coral,
  },
  micIcon: { fontSize: 14, color: C.mustard },
  hint: {
    fontSize: 10,
    color: C.teal,
    marginTop: 4,
    marginLeft: 2,
  },
  error: {
    fontSize: 10,
    color: C.coral,
    marginTop: 4,
    marginLeft: 2,
  },
});
