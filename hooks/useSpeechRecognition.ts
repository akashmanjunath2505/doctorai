
import { useState, useEffect, useRef, useCallback } from 'react';

// TypeScript support for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

export const useSpeechRecognition = ({ lang }: { lang: string }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Use a ref to track the *intended* listening state. This helps avoid
  // issues with stale closures in the `onend` callback.
  const isListeningRef = useRef(false);

  const hasSupport = !!SpeechRecognitionAPI;

  useEffect(() => {
    if (!hasSupport) {
      setError('Speech recognition is not supported by your browser.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscriptChunk = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscriptChunk += transcriptPart + ' ';
            currentInterim = ''; // Clear interim when a final result comes in
        } else {
            currentInterim += transcriptPart;
        }
      }
      setInterimTranscript(currentInterim);
      if (finalTranscriptChunk) {
        setTranscript(prev => prev + finalTranscriptChunk);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        let errorMessage = `An unknown speech recognition error occurred: ${event.error}`;
        if (event.error === 'not-allowed') {
            errorMessage = "Microphone permission denied. Please allow microphone access in your browser settings.";
        } else if (event.error === 'no-speech') {
            // This error is common, we can ignore it and let it auto-restart
            return;
        } else if (event.error === 'network') {
            errorMessage = "A network error occurred with the speech recognition service. This may be due to a poor connection or browser security restrictions, especially in sandboxed environments like iframes. Please check your internet connection and try disabling any ad-blockers or privacy extensions that might interfere. If the issue persists, this feature may not be supported in your current browsing context.";
        } else if (event.error === 'service-not-allowed') {
             errorMessage = "Speech recognition service is not allowed. Check your browser or extension settings.";
        }
      setError(errorMessage);
    };

    recognition.onend = () => {
      // The recognition service ended. If we are *supposed* to be listening
      // (as tracked by our ref), start it again. This handles cases where the
      // browser automatically stops listening after a pause.
      if (isListeningRef.current) {
        try {
            recognition.start();
        } catch(e) {
            console.error("Error restarting recognition onend:", e);
            setError("Could not restart microphone.");
        }
      } else {
        setIsListening(false); // Sync state if we stopped manually
      }
    };

    return () => {
      isListeningRef.current = false; // On unmount, set intention to false
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [hasSupport]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, [lang]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      setTranscript(''); 
      setInterimTranscript('');
      setError(null);
      try {
        isListeningRef.current = true;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Could not start recognition", e);
        isListeningRef.current = false;
        setError("Could not start microphone. Please ensure it's not in use by another application.");
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false); // Give immediate UI feedback
    }
  }, []);
  
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    error,
    startListening,
    stopListening,
    hasSupport,
    resetTranscript,
  };
};
