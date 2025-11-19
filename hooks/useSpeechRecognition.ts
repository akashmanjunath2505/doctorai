
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
  abort: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

export const useSpeechRecognition = (options: { lang: string }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Refs to track state without triggering effects
  const isListeningRef = useRef(isListening);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
      isListeningRef.current = isListening;
  }, [isListening]);


  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // NETWORK ERROR FIX:
    // Continuous mode in Chrome often leads to "network" errors after a short period or silence.
    // We use continuous=false and manually restart on 'end' to create a stable loop.
    recognition.continuous = false; 
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
          setTranscript(prev => {
              // Heuristic to avoid duplicate appending if the engine sends the same finalized chunk
              if (prev.endsWith(finalTranscript)) return prev;
              return prev ? `${prev} ${finalTranscript}` : finalTranscript;
          });
      }
    };
    
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
          // Ignore no-speech, it just means silence
          return; 
      }

      console.warn('Speech recognition error:', event.error);
      
      if (event.error === 'network') {
           // Network error is handled by the onend loop usually, but we log it.
           // We don't set user-visible error immediately to avoid UI flicker.
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Microphone access denied.');
          setIsListening(false);
          isListeningRef.current = false;
      } else {
          // For other errors, stop.
          if (event.error !== 'aborted') {
             // Only show error if it persists; for now, rely on restart.
          }
      }
    };

    recognition.onend = () => {
      // If we are still supposed to be listening, restart.
      if (isListeningRef.current) {
          // Small delay to prevent rapid-fire restart loops if something is broken
          restartTimeoutRef.current = setTimeout(() => {
              if (isListeningRef.current && recognitionRef.current) {
                  try {
                      recognitionRef.current.start();
                  } catch (e) {
                      console.error("Failed to restart recognition:", e);
                  }
              }
          }, 100);
      } else {
        setIsListening(false);
      }
    };
    
    return () => {
      if (recognitionRef.current) {
        isListeningRef.current = false;
        recognitionRef.current.abort();
      }
      if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [options.lang]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      if (isListeningRef.current) return;

      setTranscript(''); // Reset transcript on fresh start
      setError(null);
      isListeningRef.current = true;
      setIsListening(true);

      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      setIsListening(false);
      isListeningRef.current = false;
      try {
        recognitionRef.current.stop();
        // Also abort to ensure it stops immediately and doesn't fire a restart
        recognitionRef.current.abort();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
      if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
      }
    }
  }, []);

  return { isListening, transcript, error, startListening, stopListening };
};
