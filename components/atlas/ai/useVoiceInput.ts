"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { emitNavigatorEvent } from "./navigatorBus";
import { fixProjectNames } from "@/lib/atlas-ai/projectVocabulary";

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
  /** Recording mode only: "transcribing" while the server writes down what was said */
  phase: "idle" | "listening" | "transcribing";
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
  // project and place names first ("Mala Dugo" -> "Maladugao"), then the app's own phrases
  return fixProjectNames(text)
    .replace(/\b(?:turn|tore|torr?|two?r)\s+me\s+(on|through|around|in|across)\b/gi, "tour me $1")
    .replace(/\b(?:turn|tore)\s+(?:of|off)\s+(?=(?:the\s+)?(?:north|south|central|luzon|visayas|mindanao|region|project))/gi, "tour of ")
    .replace(/\bstart (?:the )?(?:tower|tore|turn)\b/gi, "start tour")
    .replace(/\bsta\.?\s*clara\b/gi, "Sta. Clara")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whisper invents these from silence or breath noise; they are never a real request */
const WHISPER_PHANTOMS = /^(?:thank you\.?|thanks for watching[.!]?|you\.?|bye\.?|\.+|okay\.?)$/i;
const RECORDER_KEY = "atlas.voiceInput.recorder";
/** Silence after speech that ends the recording (it is then sent straight away) */
const END_SILENCE_MS = 700;
/** A shorter pause already starts transcribing what was said so far: if the pause turns out to be
 *  the end, the text is usually back by the time the recording stops (talking again discards it) */
const EARLY_TRANSCRIBE_MS = 300;
const NO_SPEECH_MS = 7000;
const MAX_RECORD_MS = 20000;

/**
 * The browser's own speech recognition works in Chrome, Edge and Safari. Brave switches off the
 * Google service it relies on (it fails with "network") and Firefox has none: there the clip is
 * recorded and transcribed by the server (app/api/atlas-ai/transcribe, Whisper).
 */
function shouldRecord(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) return true;
  if (w.navigator?.brave) return true;
  try {
    return window.localStorage.getItem(RECORDER_KEY) === "1";
  } catch {
    return false;
  }
}

export function useVoiceInput(options?: UseVoiceInputOptions): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [phase, setPhase] = useState<"idle" | "listening" | "transcribing">("idle");

  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<{ stop: (send: boolean) => void } | null>(null);
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
      setIsSupported(!!SpeechRecognition || (!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"));
    }
  }, []);

  const stopListening = useCallback(() => {
    // (recording: stopping by hand still sends what was said)
    if (recorderRef.current) {
      recorderRef.current.stop(true);
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  // Record the request and let the server transcribe it. Stops by itself after a short silence.
  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    finalTranscriptRef.current = "";
    // wake the transcription function now (a serverless cold start would otherwise land after you speak)
    void fetch("/api/atlas-ai/transcribe", { method: "GET" }).catch(() => {});
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Microphone permission denied. Please allow microphone access in your browser settings.");
      return;
    }
    const mime =
      ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
    const type = mime || "audio/webm";
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];

    const transcribe = async (parts: Blob[]): Promise<string> => {
      const body = new FormData();
      body.append("audio", new Blob(parts, { type: recorder.mimeType || type }));
      body.append("lang", optionsRef.current?.lang || "en-PH");
      const res = await fetch("/api/atlas-ai/transcribe", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      return json.text || "";
    };
    // early transcription started at a pause (dropped if speech resumes)
    let early: Promise<string> | null = null;
    let wantEarly = false;
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
      if (wantEarly) {
        wantEarly = false;
        early = transcribe(chunks.slice());
        early.catch(() => {});
      }
    };

    // Loudness watch: has speech started, and has it been quiet long enough to stop?
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const startedAt = performance.now();
    let heardAt = 0;
    let lastLoudAt = 0;
    let send = true;
    let timer = 0;
    let floor = 0.01;

    const finish = (shouldSend: boolean) => {
      if (recorder.state === "inactive") return;
      send = shouldSend;
      window.clearInterval(timer);
      recorder.stop();
    };
    recorderRef.current = { stop: finish };

    // (a timer, not animation frames: it must keep running if the tab is in the background)
    timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      const rms = Math.sqrt(sum / samples.length);
      const now = performance.now();
      // the first 300 ms set the room's noise floor
      if (now - startedAt < 300) floor = Math.max(floor, rms * 1.5);
      else if (rms > Math.max(0.02, floor * 2)) {
        heardAt = heardAt || now;
        lastLoudAt = now;
        early = null; // still talking: what was sent early is out of date
        wantEarly = false;
      }
      const quietFor = now - lastLoudAt;
      if (heardAt && quietFor > EARLY_TRANSCRIBE_MS && !early && !wantEarly && recorder.state === "recording") {
        wantEarly = true;
        recorder.requestData();
      }
      if (heardAt && quietFor > END_SILENCE_MS) return finish(true);
      if (!heardAt && now - startedAt > NO_SPEECH_MS) {
        setError("No speech was detected. Please try speaking again.");
        return finish(false);
      }
      if (now - startedAt > MAX_RECORD_MS) finish(true);
    }, 40);

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close().catch(() => {});
      recorderRef.current = null;
      if (!send || !heardAt || !chunks.length) {
        setIsListening(false);
        setPhase("idle");
        return;
      }
      setPhase("transcribing");
      try {
        // nothing but silence was added after the early request: its answer is the whole request
        let raw: string;
        try {
          raw = early ? await early : await transcribe(chunks);
        } catch {
          raw = await transcribe(chunks);
        }
        const text = correctTranscript(raw);
        if (!text || WHISPER_PHANTOMS.test(text)) {
          setError("No speech was detected. Please try speaking again.");
        } else {
          // The mic is closed BEFORE the text is handed over, and the text is not kept as a live
          // transcript: the chat box mirrors the live transcript while listening, so it used to
          // copy the sentence back in right after it had been sent.
          finalTranscriptRef.current = "";
          setIsListening(false);
          setPhase("idle");
          optionsRef.current?.onTranscriptComplete?.(text);
        }
      } catch (err: any) {
        setError(`Speech input error: ${err?.message || "transcription failed"}`);
      } finally {
        setIsListening(false);
        setPhase("idle");
      }
    };

    recorder.start();
    setIsListening(true);
    setPhase("listening");
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    if (recorderRef.current) return;
    if (shouldRecord()) {
      void startRecording();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

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
        if (errType === "network") {
          // The browser's speech service is unreachable or switched off (Brave): record instead,
          // now and from here on
          try {
            window.localStorage.setItem(RECORDER_KEY, "1");
          } catch {}
          recognition.onend = null;
          recognitionRef.current = null;
          setIsListening(false);
          void startRecording();
          return;
        }
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
  }, [startRecording]);

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
      recorderRef.current?.stop(false);
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
    phase,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}
