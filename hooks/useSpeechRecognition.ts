
import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";

// Configuration for the Gemini Live API
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Add type augmentation for webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string; // Accumulated finalized transcript
  interimTranscript: string; // Current turn transcript (streaming)
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
  supported: boolean;
}

// Helper: Convert Float32 audio data to Int16 PCM and then to Base64
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
    const output = new DataView(new ArrayBuffer(input.length * 2));
    for (let i = 0; i < input.length; i++) {
        let s = Math.max(-1, Math.min(1, input[i]));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        output.setInt16(i * 2, s, true); // Little endian
    }
    return output.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export const useSpeechRecognition = (options: { lang?: string } = {}): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const supported = true;

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const wsRef = useRef<any>(null);
  const currentTurnTextRef = useRef('');
  const isCleaningUpRef = useRef(false);

  // Initialize AI client safely
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const cleanup = useCallback(async () => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    try {
        // 1. Stop Audio Processing Nodes
        if (processorRef.current) {
            try {
                processorRef.current.disconnect();
                processorRef.current.onaudioprocess = null;
            } catch (e) { console.warn("Error disconnecting processor", e) }
            processorRef.current = null;
        }
        if (sourceRef.current) {
            try { sourceRef.current.disconnect(); } catch (e) { console.warn("Error disconnecting source", e) }
            sourceRef.current = null;
        }

        // 2. Stop Media Stream Tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // 3. Close Audio Context Safely
        if (audioContextRef.current) {
            const ctx = audioContextRef.current;
            audioContextRef.current = null; // Clear ref immediately
            try {
                if (ctx.state !== 'closed') {
                    await ctx.close();
                }
            } catch (e) {
                console.warn("Error closing AudioContext:", e);
            }
        }

        // 4. Reset Session
        wsRef.current = null;
        
        // 5. Flush pending text
        if (currentTurnTextRef.current) {
            const leftover = currentTurnTextRef.current;
            setTranscript(prev => (prev + ' ' + leftover).trim());
            currentTurnTextRef.current = '';
            setInterimTranscript('');
        }
    } catch (error) {
        console.error("Error during cleanup:", error);
    } finally {
        isCleaningUpRef.current = false;
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (!isListening) return;
    setIsListening(false);
    await cleanup();
  }, [isListening, cleanup]);

  const startListening = useCallback(async () => {
    if (isListening || isCleaningUpRef.current) return;
    setError(null);

    try {
        // 1. Setup Audio Context
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        // 2. Connect to Gemini Live
        // IMPORTANT: inputAudioTranscription is an empty object to enable it with default settings.
        // We strictly define the config to avoid 'Invalid Argument' errors.
        const config = {
            responseModalities: ['AUDIO'], 
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            inputAudioTranscription: {},
            systemInstruction: "You are a passive listener. Do not speak. Listen to the input audio and transcribe it internally.",
        };

        const sessionPromise = ai.live.connect({
            model: MODEL_NAME,
            config: config,
            callbacks: {
                onopen: () => {
                    console.log("Gemini Live Session Connected");
                    setIsListening(true);
                },
                onmessage: (message: any) => {
                    // Handle Transcription
                    const inputTranscription = message.serverContent?.inputTranscription;
                    if (inputTranscription) {
                        const text = inputTranscription.text;
                        if (text) {
                            currentTurnTextRef.current += text;
                            setInterimTranscript(currentTurnTextRef.current);
                        }
                    }

                    // Handle Turn Completion
                    if (message.serverContent?.turnComplete) {
                        if (currentTurnTextRef.current) {
                             const finalized = currentTurnTextRef.current;
                             setTranscript(prev => (prev + ' ' + finalized).trim());
                             currentTurnTextRef.current = '';
                             setInterimTranscript('');
                        }
                    }
                },
                onclose: () => {
                    console.log("Gemini Live Session Closed");
                    setIsListening(false);
                },
                onerror: (err: any) => {
                    console.error("Gemini Live Session Error:", err);
                    // Suppress harmless connection errors during teardown
                    if (isListening) {
                        setError("Connection interrupted. Please restart.");
                        cleanup();
                        setIsListening(false);
                    }
                }
            }
        });
        
        // Wait for connection before sending audio
        const session = await sessionPromise;
        wsRef.current = session;

        // 3. Start Microphone Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;
        
        // Use ScriptProcessor for raw PCM access
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
            if (!wsRef.current) return;

            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBuffer = floatTo16BitPCM(inputData);
            const base64Audio = arrayBufferToBase64(pcmBuffer);
            
            try {
                wsRef.current.sendRealtimeInput({
                    media: {
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Audio
                    }
                });
            } catch(err) {
                // Silent fail if socket is closing
            }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

    } catch (err: any) {
        console.error("Failed to start listening:", err);
        setError("Microphone access denied or connection failed.");
        cleanup();
        setIsListening(false);
    }
  }, [isListening, cleanup]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    currentTurnTextRef.current = '';
  }, []);

  useEffect(() => {
    return () => {
        cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    error,
    supported
  };
};
