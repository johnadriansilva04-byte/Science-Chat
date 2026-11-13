import { useCallback, useEffect, useRef, useState } from "react";
import { pickVoiceName, splitSentences } from "@/lib/speech";

// Web Speech API — sem custo e sem chave. Tipos do DOM não cobrem SpeechRecognition,
// então declaramos o mínimo que usamos.
type SpeechResultAlt = { transcript: string; confidence: number };
type SpeechResult = { isFinal: boolean; length: number; [i: number]: SpeechResultAlt };
type SpeechResultList = { length: number; [i: number]: SpeechResult };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: SpeechResultList }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Escolhe a melhor voz disponível para o idioma (pt-BR preferido). */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const name = pickVoiceName(voices, lang);
  return name ? (voices.find((v) => v.name === name) ?? null) : null;
}

/** Ditado por voz (STT, com transcrição ao vivo) e leitura em voz alta (TTS) fluida. */
export function useVoice(lang = "pt-BR") {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [sttSupported] = useState(() => getRecognitionCtor() !== null);
  const [ttsSupported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const queueRef = useRef<string[]>([]);
  const stoppedRef = useRef(false);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    rec?.stop();
    setListening(false);
  }, []);

  /**
   * Inicia o ditado. `onText` recebe a transcrição parcial (ao vivo) e, ao final
   * da fala, o texto completo — para preencher o campo enquanto o usuário fala.
   */
  const startListening = useCallback(
    (onText: (text: string, isFinal: boolean) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      recognitionRef.current?.abort();
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      let finalText = "";
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i += 1) {
          const res = e.results[i];
          const alt = res?.[0];
          if (!alt) continue;
          if (res.isFinal) finalText += alt.transcript;
          else interim += alt.transcript;
        }
        const combined = `${finalText}${interim}`.trim();
        if (combined) onText(combined, false);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => {
        setListening(false);
        recognitionRef.current = null;
        if (finalText.trim()) onText(finalText.trim(), true);
      };
      recognitionRef.current = rec;
      setListening(true);
      rec.start();
    },
    [lang],
  );

  // Fala a fila em sequência: cada frase é um utterance curto, o que evita o corte
  // de vozes longas e faz a resposta começar a soar quase de imediato.
  const speakNext = useCallback(() => {
    if (stoppedRef.current) return;
    const next = queueRef.current.shift();
    if (next === undefined) {
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(next);
    utter.lang = lang;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.rate = 1.02;
    utter.pitch = 1;
    utter.onend = () => speakNext();
    utter.onerror = () => speakNext();
    window.speechSynthesis.speak(utter);
  }, [lang]);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const chunks = splitSentences(text);
      if (!chunks.length) return;
      window.speechSynthesis.cancel();
      queueRef.current = chunks;
      stoppedRef.current = false;
      setSpeaking(true);
      speakNext();
    },
    [speakNext],
  );

  const stopSpeaking = useCallback(() => {
    stoppedRef.current = true;
    queueRef.current = [];
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  // Algumas engines só populam a lista de vozes após um evento; aquecemos a lista.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    const onVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", onVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", onVoices);
    };
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    listening,
    speaking,
    sttSupported,
    ttsSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
