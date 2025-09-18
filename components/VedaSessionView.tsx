import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DoctorProfile, TranscriptEntry, VedaInsightBlock } from '../types';
import { Icon } from './Icon';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { getVedaSpokenResponse, streamVedaInsights, diarizeTranscriptChunk, transcribeAudio } from '../services/geminiService';
import { synthesizeSpeech } from '../services/googleTtsService';
import { TypingIndicator } from './TypingIndicator';


interface VedaSessionViewProps {
  onEndSession: () => void;
  doctorProfile: DoctorProfile;
  language: string;
}

const languageToCodeMap: Record<string, string> = {
    'English': 'en-IN',
    'Marathi': 'mr-IN',
    'Hindi': 'hi-IN',
};

// Helper to convert blob to base64 for API transport
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result !== 'string') {
                return reject(new Error('File could not be read as a string.'));
            }
            const base64data = reader.result as string;
            // remove the prefix e.g. "data:audio/webm;base64,"
            resolve(base64data.substring(base64data.indexOf(',') + 1));
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(blob);
    });
};


export const VedaSessionView: React.FC<VedaSessionViewProps> = ({ onEndSession, doctorProfile, language }) => {
    const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([]);
    const [insights, setInsights] = useState<VedaInsightBlock[]>([]);
    const [isVedaSpeaking, setIsVedaSpeaking] = useState(false);
    const [isDiarizing, setIsDiarizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // States for the robust recording mechanism
    const [isScribing, setIsScribing] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [accumulatedTranscript, setAccumulatedTranscript] = useState("");
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement | null>(null);
    const insightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const diarizationTimer = useRef<NodeJS.Timeout | null>(null);
    const lastProcessedTranscript = useRef<string>("");
    const wasScribingBeforeVedaSpoke = useRef(false);
    const transcriptHistoryRef = useRef(transcriptHistory);
    
    useEffect(() => {
        transcriptHistoryRef.current = transcriptHistory;
    }, [transcriptHistory]);

    const langCode = languageToCodeMap[language] || 'en-IN';
    const { startRecording, stopRecording, error: recorderError } = useAudioRecorder();

    const fetchInsights = useCallback(async () => {
        const fullTranscript = transcriptHistoryRef.current
            .filter(t => !t.isProcessing && t.text)
            .map(t => `${t.speaker}: ${t.text}`).join('\n');
            
        if (fullTranscript.length < 50) return;

        try {
            const stream = streamVedaInsights(fullTranscript, doctorProfile, language);
            for await (const result of stream) {
                if(result.insights) {
                    setInsights(result.insights);
                }
            }
        } catch (err) {
            console.error("Insight fetching failed:", err);
        }
    }, [doctorProfile, language]);
    
    const handleWakeWord = useCallback(async (text: string) => {
        setIsVedaSpeaking(true);
        if (isScribing) {
             wasScribingBeforeVedaSpoke.current = true;
             stopRecording();
             setIsScribing(false);
        }

        const restartSequence = () => {
            setIsVedaSpeaking(false);
            if (wasScribingBeforeVedaSpoke.current) {
                handleToggleScribing(); // This will restart scribing
                wasScribingBeforeVedaSpoke.current = false;
            }
        };

        const question = text.toLowerCase().split('veda')[1]?.trim() || "please summarize the conversation so far";
        const responseText = await getVedaSpokenResponse(question, doctorProfile, language);
        
        const audioSrc = await synthesizeSpeech(responseText, langCode);

        if (audioSrc && audioRef.current) {
            audioRef.current.src = audioSrc;
            audioRef.current.play().catch(e => {
                console.error("Audio playback error", e);
                restartSequence();
            });
            audioRef.current.onended = restartSequence;
            audioRef.current.onerror = () => {
                console.error("Audio element error");
                restartSequence();
            };
        } else {
            console.error("Failed to get audio source from TTS API.");
            restartSequence();
        }
    }, [doctorProfile, language, langCode, isScribing, stopRecording]);

     const handleDiarization = useCallback(async (chunk: string) => {
        if (!chunk) return;
        setIsDiarizing(true);
        setError(null);

        const history = transcriptHistoryRef.current.slice(-5).map(t => `${t.speaker}: ${t.text}`).join('\n');
        const diarizedChunks = await diarizeTranscriptChunk(chunk, history, language);
        
        if (diarizedChunks) {
            const newEntries: TranscriptEntry[] = diarizedChunks.map((c, i) => ({
                id: `entry-${Date.now()}-${i}`,
                speaker: c.speaker,
                text: c.text,
                isProcessing: false,
            }));
            setTranscriptHistory(prev => [...prev, ...newEntries]);
        } else {
             setError("Could not analyze the conversation. Please try again.");
        }
        setIsDiarizing(false);
    }, [language]);

    // Callback to handle real-time audio chunks from the recorder
    const handleAudioChunk = useCallback(async (audioBlob: Blob) => {
        if (!audioBlob || audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
            const base64Audio = await blobToBase64(audioBlob);
            const transcribedText = await transcribeAudio(base64Audio, audioBlob.type);
            if (transcribedText) {
                setAccumulatedTranscript(prev => (prev ? prev + ' ' : '') + transcribedText);
            }
        } catch (err) {
            console.error("Transcription failed", err);
            setError("Failed to transcribe audio. Please check your connection.");
        } finally {
            setIsTranscribing(false);
        }
    }, []);
    
    const handleToggleScribing = useCallback(() => {
        setIsScribing(currentIsScribing => {
            if (currentIsScribing) {
                stopRecording();
                return false;
            } else {
                setError(null);
                startRecording({ onChunk: handleAudioChunk, timeslice: 2500 });
                return true;
            }
        });
    }, [startRecording, stopRecording, handleAudioChunk]);

    // Effect to process newly transcribed text for diarization or wake word
    useEffect(() => {
        if (accumulatedTranscript.length > lastProcessedTranscript.current.length) {
            if (diarizationTimer.current) clearTimeout(diarizationTimer.current);

            diarizationTimer.current = setTimeout(() => {
                const newChunk = accumulatedTranscript.substring(lastProcessedTranscript.current.length).trim();
                const lowerChunk = newChunk.toLowerCase();

                if (newChunk && !isVedaSpeaking) {
                     if (lowerChunk.includes('veda')) {
                        handleWakeWord(newChunk);
                    } else {
                        handleDiarization(newChunk);
                    }
                    lastProcessedTranscript.current = accumulatedTranscript;
                }
            }, 1800); // Wait for a pause in transcription before processing
        }
    }, [accumulatedTranscript, handleDiarization, handleWakeWord, isVedaSpeaking]);
    
    useEffect(() => {
        if (transcriptHistory.length > 0 && !isDiarizing) {
            if (insightTimeoutRef.current) clearTimeout(insightTimeoutRef.current);
            insightTimeoutRef.current = setTimeout(() => {
                fetchInsights();
            }, 2500);
        }
    }, [transcriptHistory, fetchInsights, isDiarizing]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptHistory]);

    useEffect(() => {
        if(recorderError) setError(recorderError);
    }, [recorderError]);
    
    // Ensure recording stops on component unmount
    useEffect(() => {
        return () => {
            stopRecording();
        }
    }, [stopRecording]);

    return (
        <div className="flex flex-col h-full w-full bg-aivana-dark animate-fadeInUp">
            <audio ref={audioRef} hidden />
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-aivana-light-grey flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Icon name="sparkles" className="w-6 h-6 text-aivana-accent" />
                    <h1 className="text-xl font-bold text-white">Veda Session</h1>
                </div>
                <button onClick={onEndSession} className="px-4 py-2 text-sm font-semibold bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors">
                    End Session
                </button>
            </header>

            {/* Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Transcript Panel */}
                <div className="flex-1 md:w-2/3 flex flex-col p-4 overflow-hidden">
                    <h2 className="text-lg font-semibold mb-2">Live Transcript</h2>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {transcriptHistory.map(entry => (
                            <div key={entry.id} className={`flex flex-col ${entry.speaker === 'Doctor' ? 'items-start' : 'items-end'}`}>
                                <div className={`text-xs mb-1 font-semibold ${entry.speaker === 'Doctor' ? 'text-aivana-accent' : 'text-blue-400'}`}>{entry.speaker}</div>
                                <div className={`px-4 py-2 rounded-lg max-w-xl ${entry.speaker === 'Doctor' ? 'bg-aivana-light-grey' : 'bg-blue-800/50'}`}>
                                    {entry.isProcessing ? <TypingIndicator /> : entry.text}
                                </div>
                            </div>
                        ))}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>

                {/* Insights Panel */}
                <aside className="w-full md:w-1/3 bg-aivana-dark-sider p-4 border-l border-aivana-light-grey flex flex-col overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4 text-white">Veda's Insights</h2>
                     {insights.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                            <Icon name="waveform" className="w-8 h-8 mb-2" />
                            <p>Insights will appear here as the conversation progresses.</p>
                        </div>
                    )}
                    <div className="space-y-4">
                        {insights.map((insight, index) => (
                            <div key={index} className="bg-aivana-grey p-3 rounded-lg animate-fadeInUp" style={{animationDelay: `${index * 100}ms`}}>
                                <h3 className="font-semibold text-aivana-accent text-sm mb-2">{insight.category}</h3>
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                                    {insight.points.map((point, pIndex) => (
                                        <li key={pIndex}>{point}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
             {/* Footer / Controls */}
            <footer className="flex flex-col p-4 border-t border-aivana-light-grey items-center justify-center">
                {error && <div className="text-red-400 p-2 text-center bg-red-900/50 rounded-md text-sm mb-2 max-w-xl">{error}</div>}
                 <div className="h-8 mb-2 flex items-center justify-center text-sm">
                    {isVedaSpeaking ? (
                         <p className="text-purple-400 italic animate-pulse">Veda is speaking...</p>
                    ) : isTranscribing ? (
                         <div className="flex items-center gap-2 text-cyan-400 italic">
                            <div className="w-4 h-4 border-2 border-t-transparent border-cyan-400 rounded-full animate-spin"></div>
                            Transcribing audio...
                        </div>
                    ) : isDiarizing ? (
                        <div className="flex items-center gap-2 text-yellow-400 italic">
                            <div className="w-4 h-4 border-2 border-t-transparent border-yellow-400 rounded-full animate-spin"></div>
                            Analyzing conversation...
                        </div>
                    ) : isScribing ? (
                        <p className="text-gray-400 animate-pulse">Listening...</p>
                    ) : (
                         <p className="text-gray-500">Click the microphone to start scribing</p>
                    )}
                </div>
                <button
                    onClick={handleToggleScribing}
                    disabled={isVedaSpeaking}
                    className="relative w-20 h-20 rounded-full bg-aivana-accent flex items-center justify-center text-white transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-aivana-dark focus:ring-purple-400 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={isScribing ? 'Stop Scribing' : 'Start Scribing'}
                >
                    {isScribing && <span className="absolute inset-0 rounded-full bg-aivana-accent animate-pulseRing" style={{animationDelay: '1s'}}></span>}
                    <Icon name={isScribing ? 'stopCircle' : 'microphone'} className="w-8 h-8 z-10" />
                </button>
            </footer>
        </div>
    );
};