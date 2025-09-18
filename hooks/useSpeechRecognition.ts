import { useState, useRef, useCallback, useEffect } from 'react';

// This is a browser-only feature.
// Add SpeechRecognition to the window object for TypeScript
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

export const useSpeechRecognition = (options: { lang: string }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // This ref is to ensure we can restart listening inside onend
  // without causing the useEffect to re-run infinitely
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;


  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options.lang;
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
          // The hook's purpose is to return the latest final transcript
          setTranscript(finalTranscript.trim());
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
          // This is not a fatal error, just ignore it and let it restart if needed.
      } else if (event.error === 'network') {
          setError('Network error with speech recognition service.');
      } else {
          setError(`Speech recognition error: ${event.error}`);
      }
      // Stop listening on error
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    };

    recognition.onend = () => {
        // Some browsers stop recognition after a short period.
        // If we are still supposed to be listening, restart it.
      if (isListeningRef.current) {
        try {
            recognitionRef.current?.start();
        } catch(e) {
            // It might have been stopped manually just before this fired
            setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };
    
    return () => {
      if (recognitionRef.current) {
        // Use a flag to prevent onend from restarting
        isListeningRef.current = false;
        recognitionRef.current.stop();
      }
    };
  }, [options.lang]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError(null);
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
        setIsListening(false);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return { isListening, transcript, error, startListening, stopListening };
};
