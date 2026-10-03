"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { emitNavigatorEvent } from "./navigatorBus";

export interface UseVoiceInputOptions {
  onTranscriptComplete?: (transcript: string) => void;
  lang?: string;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
}
/**
 * Words speech recognition commonly mishears in this app, put right before the request is sent.
 * ("Tour me on North Luzon" came back as "turn me on north luzon".)
 */
export function correctTranscript(text: string): string {
  return text
    .replace(/\b(?:turn|tore|torr?|two?r)\s+me\s+(on|through|around|in|across)\b/gi, "tour me $1")
    .replace(/\b(?:turn|tore)\s+(?:of|off)\s+(?=(?:the\s+)?(?:north|south|central|luzon|visayas|mindanao|region|project))/gi, "tour of ")
    .replace(/\bstart (?:the )?(?:tower|tore|turn)\b/gi, "start tour")
    .replace(/\bsta\.?\s*clara\b/gi, "Sta. Clara")
    .replace(/\s+/g, " ")
    .trim();
}

export function useVoiceInput(options?: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Tell the 3D navigator the mic is live (listening pose + Stage Focus)
  useEffect(() => {
    emitNavigatorEvent(isListening ? "voice-start" : "voice-end");
  }, [isListening]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      // Abort any existing recognition instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      setError(null);
      setTranscript("");
      setInterimTranscript("");
      finalTranscriptRef.current = "";

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // Philippine English: better with local names (Isabela, Kapangan, Mandaluyong)
      recognition.lang = optionsRef.current?.lang || "en-PH";

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        // Rebuild the whole transcript from every result each time. Adding each new final result
        // to the previous text repeated phrases whenever the browser reported a result twice.
        let finalText = "";
        let interimText = "";
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = (res[0]?.transcript || "").trim();
          if (!text) continue;
          if (res.isFinal) finalText += (finalText ? " " : "") + text;
          else interimText += (interimText ? " " : "") + text;
        }
        finalTranscriptRef.current = correctTranscript(finalText);
        setTranscript(finalTranscriptRef.current);
        setInterimTranscript(interimText);
      };

      recognition.onerror = (event: any) => {
        const errType = event.error;
        console.warn("[useVoiceInput] Speech recognition error:", errType);
        if (errType === "not-allowed" || errType === "service-not-allowed") {
          setError("Microphone permission denied. Please allow microphone access in your browser settings.");
        } else if (errType === "no-speech") {
          setError("No speech was detected. Please try speaking again.");
        } else {
          setError(`Speech input error: ${errType}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
        const completeText = finalTranscriptRef.current.trim();
        if (completeText) {
          optionsRef.current?.onTranscriptComplete?.(completeText);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error("[useVoiceInput] Failed to start speech recognition:", err);
      setError(err?.message || "Failed to start microphone input.");
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}
