import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DoctorProfile, TranscriptEntry, ScribeInsightBlock, ScribeInsightCategory } from '../types';
import { Icon } from './Icon';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { getScribeSpokenResponse, streamScribeInsights, diarizeTranscriptChunk, generateClinicalNote } from '../services/geminiService';
import { synthesizeSpeech } from '../services/googleTtsService';
import { TypingIndicator } from './TypingIndicator';
import { renderMarkdownToHTML } from '../utils/markdownRenderer';


interface ScribeSessionViewProps {
  onEndSession: () => void;
  doctorProfile: DoctorProfile;
  language: string;
}

const languageToCodeMap: Record<string, string> = {
    'English': 'en-IN',
    'Marathi': 'mr-IN',
    'Hindi': 'hi-IN',
};

export const ScribeSessionView: React.FC<ScribeSessionViewProps> = ({ onEndSession, doctorProfile, language }) => {
    const [consentGiven, setConsentGiven] = useState(false);
    const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([]);
    const [insights, setInsights] = useState<ScribeInsightBlock[]>([]);
    const [isVedaSpeaking, setIsVedaSpeaking] = useState(false);
    const [isDiarizing, setIsDiarizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clinicalNote, setClinicalNote] = useState('');
    const [isGeneratingNote, setIsGeneratingNote] = useState(false);


    const audioRef = useRef<HTMLAudioElement | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement | null>(null);
    const insightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transcriptHistoryRef = useRef(transcriptHistory);
    
    useEffect(() => {
        transcriptHistoryRef.current = transcriptHistory;
    }, [transcriptHistory]);

    const langCode = languageToCodeMap[language] || 'en-IN';

    const { 
        isListening, 
        transcript: newTranscriptChunk, 
        error: speechError, 
        startListening, 
        stopListening 
    } = useSpeechRecognition({ lang: langCode });

    useEffect(() => {
        if(speechError) setError(speechError);
    }, [speechError]);


    const fetchInsights = useCallback(async () => {
        const fullTranscript = transcriptHistoryRef.current
            .filter(t => !t.isProcessing && t.text)
            .map(t => `${t.speaker}: ${t.text}`).join('\n');
            
        if (fullTranscript.length < 50) return;

        try {
            const stream = streamScribeInsights(fullTranscript, doctorProfile, language);
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
        const wasListening = isListening;
        setIsVedaSpeaking(true);
        if (wasListening) {
            stopListening();
        }

        const resumeSequence = () => {
            setIsVedaSpeaking(false);
            if (wasListening) {
                startListening();
            }
        };

        const question = text.toLowerCase().split('veda')[1]?.trim() || "please summarize the conversation so far";
        const responseText = await getScribeSpokenResponse(question, doctorProfile, language);
        
        const audioSrc = await synthesizeSpeech(responseText, langCode);

        if (audioSrc && audioRef.current) {
            audioRef.current.src = audioSrc;
            audioRef.current.play().catch(e => {
                console.error("Audio playback error", e);
                resumeSequence();
            });
            audioRef.current.onended = resumeSequence;
            audioRef.current.onerror = () => {
                console.error("Audio element error");
                resumeSequence();
            };
        } else {
            console.error("Failed to get audio source from TTS API.");
            resumeSequence();
        }
    }, [doctorProfile, language, langCode, isListening, startListening, stopListening]);

    useEffect(() => {
        if (!newTranscriptChunk) return;

        const processTranscriptChunk = async (chunk: string) => {
            setError(null);
            
            const lowerChunk = chunk.toLowerCase();
            if (lowerChunk.includes('veda')) {
                await handleWakeWord(chunk);
                return;
            }

            setIsDiarizing(true);
            try {
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
                     setError("Diarization failed. Could not analyze the conversation chunk.");
                }
            } catch (e: any) {
                 console.error("Diarization error:", e);
                 setError("Diarization failed. There was an issue analyzing the conversation.");
            } finally {
                setIsDiarizing(false);
            }
        };

        processTranscriptChunk(newTranscriptChunk);

    }, [newTranscriptChunk, handleWakeWord, language]);


    const handleToggleScribing = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            setError(null);
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    const handleEndSession = () => {
        if(window.confirm("Are you sure you want to end the session? The transcript and generated note will be permanently deleted.")) {
            stopListening();
            onEndSession();
        }
    }

    const handleGenerateNote = useCallback(async () => {
        const fullTranscript = transcriptHistoryRef.current
            .filter(t => !t.isProcessing && t.text)
            .map(t => `${t.speaker}: ${t.text}`).join('\n');
        
        if (fullTranscript.trim().length < 50) {
            setError("Not enough conversation to generate a note.");
            return;
        }

        setIsGeneratingNote(true);
        setError(null);
        try {
            const note = await generateClinicalNote(fullTranscript, doctorProfile, language);
            setClinicalNote(note);
        } catch(e) {
            console.error("Note generation error", e);
            setError("Failed to generate clinical note.");
        } finally {
            setIsGeneratingNote(false);
        }

    }, [doctorProfile, language]);
    
    const handleCopyNote = () => {
        navigator.clipboard.writeText(clinicalNote)
            .then(() => alert("Note copied to clipboard!"))
            .catch(err => alert("Failed to copy note."));
    };

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

    
    // Ensure recording stops on component unmount
    useEffect(() => {
        return () => {
           stopListening();
        }
    }, [stopListening]);

    const getStatusText = () => {
        if (isVedaSpeaking) return <p className="text-purple-400 italic animate-pulse">Veda is speaking...</p>;
        if (isDiarizing) {
             return (
                <div className="flex items-center gap-2 text-yellow-400 italic">
                    <div className="w-4 h-4 border-2 border-t-transparent border-yellow-400 rounded-full animate-spin"></div>
                    Analyzing conversation...
                </div>
            );
        }
        if (isListening) return <p className="text-gray-400 italic">Listening...</p>;
        return <p className="text-gray-500">Click the microphone to start transcribing</p>;
    }

    if (!consentGiven) {
        return <ConsentScreen onConsent={() => setConsentGiven(true)} />;
    }

    const insightOrder: ScribeInsightCategory[] = ['Questions to Ask', 'Differential Diagnosis', 'Labs to Consider', 'General Note'];
    const sortedInsights = [...insights].sort((a, b) => {
        const indexA = insightOrder.indexOf(a.category);
        const indexB = insightOrder.indexOf(b.category);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });


    return (
        <div className="flex flex-col h-full w-full bg-aivana-dark animate-fadeInUp">
            <audio ref={audioRef} hidden />
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-aivana-light-grey flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Icon name="waveform" className="w-6 h-6 text-aivana-accent" />
                    <h1 className="text-xl font-bold text-white">Ambient Scribe Session</h1>
                </div>
                <button onClick={handleEndSession} className="px-4 py-2 text-sm font-semibold bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors">
                    End Session
                </button>
            </header>

            {/* Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Panel: Transcript & Note */}
                <div className="flex-1 md:w-2/3 flex flex-col overflow-hidden">
                    {/* Transcript Panel */}
                    <div className="flex-1 flex flex-col p-4 overflow-hidden">
                        <h2 className="text-lg font-semibold mb-2">Live Transcript</h2>
                        <div className="flex-1 bg-aivana-dark-sider/50 rounded-lg p-3 overflow-y-auto space-y-4 pr-2">
                            {transcriptHistory.map(entry => (
                                <div key={entry.id} className={`flex flex-col ${entry.speaker === 'Doctor' ? 'items-start' : 'items-end'}`}>
                                    <div className={`text-xs mb-1 font-semibold ${entry.speaker === 'Doctor' ? 'text-aivana-accent' : 'text-blue-400'}`}>{entry.speaker}</div>
                                    <div className={`px-4 py-2 rounded-lg max-w-xl ${entry.speaker === 'Doctor' ? 'bg-aivana-light-grey' : 'bg-blue-800/50'}`}>
                                        {entry.isProcessing ? <TypingIndicator /> : entry.text}
                                    </div>
                                </div>
                            ))}
                             {transcriptHistory.length === 0 && !isListening && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 h-full">
                                    <Icon name="microphone" className="w-8 h-8 mb-2" />
                                    <p>Start the session to begin transcription.</p>
                                </div>
                            )}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>
                    {/* Note Panel */}
                    <div className="flex-1 flex flex-col p-4 border-t border-aivana-light-grey overflow-hidden">
                         <div className="flex justify-between items-center mb-2 flex-shrink-0">
                            <h2 className="text-lg font-semibold">Draft Clinical Note (SOAP)</h2>
                            <div className="flex items-center gap-2">
                                {clinicalNote && !isGeneratingNote && (
                                    <button onClick={handleCopyNote} className="px-3 py-1.5 text-xs font-semibold bg-aivana-grey hover:bg-aivana-light-grey rounded-lg transition-colors">
                                        Copy Note
                                    </button>
                                )}
                                <button onClick={handleGenerateNote} disabled={isGeneratingNote || transcriptHistory.length === 0} className="px-3 py-1.5 text-xs font-semibold bg-aivana-accent hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50">
                                    {isGeneratingNote ? "Generating..." : clinicalNote ? "Regenerate" : "Generate Note"}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-aivana-dark-sider/50 rounded-lg p-1 overflow-auto">
                            {isGeneratingNote && (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin mr-3"></div>
                                    <span>Composing SOAP note...</span>
                                </div>
                            )}
                            {!isGeneratingNote && clinicalNote && (
                                <div className="prose prose-sm prose-invert p-3 max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(clinicalNote)}}></div>
                            )}
                            {!isGeneratingNote && !clinicalNote && (
                                <div className="flex items-center justify-center h-full text-gray-500 text-center">
                                    <p>A draft clinical note will appear here after generation.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                {/* Insights Panel */}
                <aside className="w-full md:w-1/3 bg-aivana-dark-sider p-4 border-l border-aivana-light-grey flex flex-col overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4 text-white">Veda's Insights</h2>
                     {sortedInsights.length === 0 && !isListening && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                            <Icon name="lightbulb" className="w-8 h-8 mb-2" />
                            <p>Start the session to see real-time insights.</p>
                        </div>
                    )}
                     {sortedInsights.length === 0 && isListening && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                            <Icon name="spinner" className="w-8 h-8 mb-2 animate-pulse" />
                            <p>Listening for key information...</p>
                        </div>
                    )}
                    <div className="space-y-4">
                        {sortedInsights.map((insight, index) => (
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
            <footer className="flex flex-col p-4 border-t border-aivana-light-grey items-center justify-center flex-shrink-0">
                {error && <div className="text-red-400 p-2 text-center bg-red-900/50 rounded-md text-sm mb-2 max-w-xl">{error}</div>}
                 <div className="h-8 mb-2 flex items-center justify-center text-sm text-center">
                    {getStatusText()}
                </div>
                <button
                    onClick={handleToggleScribing}
                    disabled={isVedaSpeaking}
                    className="relative w-20 h-20 rounded-full bg-aivana-accent flex items-center justify-center text-white transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-aivana-dark focus:ring-purple-400 disabled:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={isListening ? 'Stop Transcribing' : 'Start Transcribing'}
                >
                    {isListening && <span className="absolute inset-0 rounded-full bg-aivana-accent animate-pulseRing" style={{animationDelay: '1s'}}></span>}
                    <Icon name={isListening ? 'stopCircle' : 'microphone'} className="w-8 h-8 z-10" />
                </button>
            </footer>
        </div>
    );
};

const ConsentScreen: React.FC<{onConsent: () => void}> = ({ onConsent }) => {
    const [checked, setChecked] = useState(false);
    
    return (
        <div className="flex flex-col h-full w-full items-center justify-center p-6 text-center animate-fadeInUp">
            <div className="w-full max-w-lg bg-aivana-light-grey p-8 rounded-xl border border-aivana-light-grey/50">
                <Icon name="shieldCheck" className="w-12 h-12 text-aivana-accent mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Patient Consent Required</h1>
                <p className="text-gray-400 mb-6">
                    Before starting the Ambient Scribe, please confirm you have obtained and documented verbal consent from the patient to record this session for clinical documentation purposes.
                </p>
                <label className="flex items-center justify-center space-x-3 p-3 rounded-md bg-aivana-dark hover:bg-aivana-dark/70 cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={checked} 
                        onChange={(e) => setChecked(e.target.checked)} 
                        className="form-checkbox h-5 w-5 text-aivana-accent bg-aivana-grey border-aivana-light-grey focus:ring-aivana-accent"
                    />
                    <span className="text-sm text-gray-300">I confirm that verbal consent has been obtained from the patient.</span>
                </label>
                 <button 
                    onClick={onConsent}
                    disabled={!checked}
                    className="w-full mt-6 bg-aivana-accent hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    Proceed to Scribe Session
                 </button>
            </div>
        </div>
    )
}