
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
    'English': 'en-US',
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
    const [isEnding, setIsEnding] = useState(false);

    // Buffering logic variables
    const [transcriptBuffer, setTranscriptBuffer] = useState('');
    const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement | null>(null);
    const insightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transcriptHistoryRef = useRef(transcriptHistory);
    
    useEffect(() => {
        transcriptHistoryRef.current = transcriptHistory;
    }, [transcriptHistory]);

    const langCode = languageToCodeMap[language] || 'en-US';

    // Use the robust hook
    const { 
        isListening, 
        transcript: finalTranscriptChunk, 
        interimTranscript,
        startListening, 
        stopListening, 
        resetTranscript,
        error: speechError
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
        // CRITICAL: We do NOT stop listening here. 
        // The AI keeps listening (transcribing) even while processing the wake word.
        // The audio constraints (echoCancellation) prevent the AI from hearing itself.
        setIsVedaSpeaking(true);

        const resumeSequence = () => {
            setIsVedaSpeaking(false);
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
    }, [doctorProfile, language, langCode]);


    // ----------------------------------------------------------------------
    // BUFFERING & DIARIZATION LOGIC
    // ----------------------------------------------------------------------

    const processBuffer = useCallback(async (textToProcess: string) => {
        if (!textToProcess.trim()) return;
        
        // Simple Wake Word detection
        if (textToProcess.toLowerCase().includes('veda')) {
            setTranscriptBuffer('');
            await handleWakeWord(textToProcess);
            return;
        }

        setIsDiarizing(true);
        try {
            // Contextual history is critical for the AI to determine speaker flow (Question -> Answer)
            const historyContext = transcriptHistoryRef.current.slice(-6).map(t => `${t.speaker}: ${t.text}`).join('\n');
            
            const diarizedChunks = await diarizeTranscriptChunk(textToProcess, historyContext, language, doctorProfile);
            
            if (diarizedChunks && diarizedChunks.length > 0) {
                const newEntries: TranscriptEntry[] = diarizedChunks.map((c, i) => ({
                    id: `entry-${Date.now()}-${i}`,
                    speaker: c.speaker,
                    text: c.text,
                    isProcessing: false,
                }));
                setTranscriptHistory(prev => [...prev, ...newEntries]);
            } else {
                 // Fallback if diarization fails
                 setTranscriptHistory(prev => [...prev, {
                     id: `entry-${Date.now()}`,
                     speaker: 'Patient', 
                     text: textToProcess,
                     isProcessing: false
                 }]);
            }
        } catch (e) {
             console.error("Diarization error:", e);
             setTranscriptHistory(prev => [...prev, {
                id: `entry-${Date.now()}`,
                speaker: 'Patient', 
                text: textToProcess,
                isProcessing: false
            }]);
        } finally {
            setIsDiarizing(false);
        }
    }, [language, doctorProfile, handleWakeWord]);

    // Accumulate finalized chunks
    useEffect(() => {
        if (finalTranscriptChunk) {
            setTranscriptBuffer(prev => (prev + ' ' + finalTranscriptChunk).trim());
            resetTranscript();
        }
    }, [finalTranscriptChunk, resetTranscript]);

    // Debounce processing:
    // Wait for 2 seconds of silence to let a full sentence/thought form before diarizing.
    // This improves accuracy as the AI sees the full grammar (Question vs Statement).
    useEffect(() => {
        if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);

        if (transcriptBuffer.length > 0) {
            // Force flush if buffer gets too long (prevent massive lag)
            if (transcriptBuffer.length > 250) {
                const text = transcriptBuffer;
                setTranscriptBuffer('');
                processBuffer(text);
            } else {
                processingTimeoutRef.current = setTimeout(() => {
                    const text = transcriptBuffer;
                    setTranscriptBuffer(''); 
                    processBuffer(text);
                }, 2000); // 2s delay for better context
            }
        }
    }, [transcriptBuffer, processBuffer]);


    // ----------------------------------------------------------------------
    
    const handleToggleScribing = useCallback(() => {
        if (isListening) {
            stopListening();
            if (transcriptBuffer) {
                 processBuffer(transcriptBuffer);
                 setTranscriptBuffer('');
            }
        } else {
            setError(null);
            startListening();
        }
    }, [isListening, startListening, stopListening, transcriptBuffer, processBuffer]);

    const handleEndSession = async () => {
        if (window.confirm("Are you sure you want to end the session? The transcript and generated note will be permanently deleted.")) {
            setIsEnding(true);
            try {
                await stopListening();
            } catch (err) {
                console.warn("Error stopping listening on end session:", err);
            } finally {
                onEndSession();
            }
        }
    };

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
            }, 3000);
        }
    }, [transcriptHistory, fetchInsights, isDiarizing]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptHistory, interimTranscript, transcriptBuffer]);

    useEffect(() => {
        return () => {
           // Ensure we stop listening when unmounting
           if (isListening) {
               stopListening();
           }
        }
    }, [isListening, stopListening]);

    const getStatusText = () => {
        if (isVedaSpeaking) return <p className="text-purple-400 italic animate-pulse">Veda is speaking (Listening active)...</p>;
        if (isDiarizing) {
             return (
                <div className="flex items-center gap-2 text-yellow-400 italic">
                    <div className="w-4 h-4 border-2 border-t-transparent border-yellow-400 rounded-full animate-spin"></div>
                    Analyzing context & speakers...
                </div>
            );
        }
        if (isListening) return <p className="text-green-400 italic">Listening (Active)...</p>;
        return <p className="text-gray-500">Click microphone to start</p>;
    }
    
    // STYLING LOGIC: Red for Questions, Green for DDx
    const getCategoryStyle = (category: string) => {
        switch(category) {
            case 'Questions to Ask': return 'border-red-500/30 bg-red-900/10 text-red-400';
            case 'Differential Diagnosis': return 'border-green-500/30 bg-green-900/10 text-green-400';
            case 'Labs to Consider': return 'border-blue-500/30 bg-blue-900/10 text-blue-300';
            default: return 'border-aivana-light-grey bg-aivana-grey text-gray-300';
        }
    }
    
    const getCategoryTitleColor = (category: string) => {
         switch(category) {
            case 'Questions to Ask': return 'text-red-400';
            case 'Differential Diagnosis': return 'text-green-400';
            case 'Labs to Consider': return 'text-blue-300';
            default: return 'text-aivana-accent';
        }
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
            <header className="flex items-center justify-between p-4 border-b border-aivana-light-grey flex-shrink-0 bg-aivana-dark z-10">
                <div className="flex items-center gap-3">
                    <Icon name="waveform" className="w-6 h-6 text-aivana-accent" />
                    <h1 className="text-xl font-bold text-white">Ambient Scribe Session</h1>
                </div>
                <button 
                    onClick={handleEndSession} 
                    disabled={isEnding}
                    className="px-4 py-2 text-sm font-semibold bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isEnding ? (
                         <>
                             <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                             Ending...
                         </>
                    ) : (
                        'End Session'
                    )}
                </button>
            </header>

            {/* Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Left Panel: Transcript & Note */}
                <div className="flex-1 md:w-2/3 flex flex-col overflow-hidden">
                    {/* Transcript Panel */}
                    <div className="flex-1 flex flex-col p-4 overflow-hidden">
                        <h2 className="text-lg font-semibold mb-2">Live Transcript</h2>
                        <div className="flex-1 bg-aivana-dark-sider/50 rounded-lg p-3 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {transcriptHistory.map(entry => (
                                <div key={entry.id} className={`flex flex-col ${entry.speaker === 'Doctor' ? 'items-start' : 'items-end'}`}>
                                    <div className={`text-xs mb-1 font-semibold ${entry.speaker === 'Doctor' ? 'text-aivana-accent' : 'text-blue-400'}`}>{entry.speaker}</div>
                                    <div className={`px-4 py-2 rounded-lg max-w-xl ${entry.speaker === 'Doctor' ? 'bg-aivana-light-grey' : 'bg-blue-800/50'}`}>
                                        {entry.isProcessing ? <TypingIndicator /> : entry.text}
                                    </div>
                                </div>
                            ))}
                            
                            {/* Buffered/Processing Text */}
                            {transcriptBuffer && !isDiarizing && (
                                 <div className="flex flex-col items-center opacity-80">
                                     <div className="px-4 py-2 rounded-lg max-w-xl bg-gray-700/30 text-gray-300 text-sm italic border border-gray-700 border-dashed">
                                        ... {transcriptBuffer} ...
                                     </div>
                                </div>
                            )}

                            {/* Interim Result Bubble (Ghost Text) */}
                            {isListening && interimTranscript && (
                                <div className="flex flex-col items-center opacity-60">
                                     <div className="text-xs mb-1 font-semibold text-gray-500">Hearing...</div>
                                     <div className="px-4 py-2 rounded-lg max-w-xl bg-transparent border border-gray-700 text-gray-400 italic">
                                        {interimTranscript}
                                     </div>
                                </div>
                            )}

                             {transcriptHistory.length === 0 && !interimTranscript && !isListening && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 h-full">
                                    <Icon name="microphone" className="w-8 h-8 mb-2" />
                                    <p>Start the session to begin transcription.</p>
                                </div>
                            )}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>
                    
                    {/* Redesigned Note Panel - Document Style */}
                    <div className="flex-1 flex flex-col p-4 md:p-6 border-t md:border-t-0 md:border-l border-aivana-light-grey overflow-hidden bg-[#0a0a0a]">
                         <div className="flex justify-between items-center mb-3 flex-shrink-0">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-aivana-accent/10 rounded-md">
                                    <Icon name="document-text" className="w-5 h-5 text-aivana-accent" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Draft Clinical Note</h2>
                             </div>
                            <div className="flex items-center gap-2">
                                {clinicalNote && !isGeneratingNote && (
                                    <button onClick={handleCopyNote} className="px-3 py-1.5 text-xs font-semibold bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg transition-colors border border-[#444]">
                                        Copy
                                    </button>
                                )}
                                <button onClick={handleGenerateNote} disabled={isGeneratingNote || transcriptHistory.length === 0} className="px-3 py-1.5 text-xs font-semibold bg-aivana-accent hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-purple-900/20">
                                    {isGeneratingNote ? "Generating..." : clinicalNote ? "Regenerate" : "Generate SOAP Note"}
                                </button>
                            </div>
                        </div>
                        
                        {/* Document Card */}
                        <div className="flex-1 bg-[#161616] border border-[#333] rounded-xl overflow-hidden flex flex-col shadow-2xl">
                            {/* Document Toolbar */}
                            <div className="bg-[#202020] border-b border-[#333] px-4 py-2 flex items-center justify-between text-xs font-mono text-gray-500">
                                <div className="flex gap-4">
                                    <span>FORMAT: SOAP</span>
                                    <span>STATUS: DRAFT</span>
                                </div>
                                <span>{new Date().toLocaleDateString()}</span>
                            </div>

                            {/* Document Content */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                {isGeneratingNote && (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                                        <div className="relative w-12 h-12">
                                            <div className="absolute w-full h-full border-4 border-[#333] rounded-full"></div>
                                            <div className="absolute w-full h-full border-4 border-t-aivana-accent rounded-full animate-spin"></div>
                                        </div>
                                        <span className="animate-pulse">Synthesizing clinical note...</span>
                                    </div>
                                )}
                                {!isGeneratingNote && clinicalNote && (
                                    <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(clinicalNote)}}></div>
                                )}
                                {!isGeneratingNote && !clinicalNote && (
                                    <div className="flex flex-col items-center justify-center h-full text-[#444] text-center space-y-2">
                                        <Icon name="document-text" className="w-12 h-12 opacity-20" />
                                        <p>No note generated yet.</p>
                                    </div>
                                )}
                            </div>
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
                            <p>Listening for clinical context...</p>
                        </div>
                    )}
                    <div className="space-y-4">
                        {sortedInsights.map((insight, index) => (
                            <div key={index} className={`p-3 rounded-lg border animate-fadeInUp ${getCategoryStyle(insight.category)}`} style={{animationDelay: `${index * 100}ms`}}>
                                <h3 className={`font-bold text-sm mb-2 ${getCategoryTitleColor(insight.category)}`}>{insight.category}</h3>
                                
                                {/* Custom Rendering for Differential Diagnosis */}
                                {insight.category === 'Differential Diagnosis' ? (
                                    <div className="space-y-3">
                                        {['High', 'Medium', 'Low'].map(level => {
                                            // Regex match for "High: Diagnosis - Rationale"
                                            const points = insight.points.filter(p => p.startsWith(`${level}:`));
                                            if (points.length === 0) return null;
                                            const color = level === 'High' ? 'text-green-400' : level === 'Medium' ? 'text-yellow-400' : 'text-blue-400';
                                            const bg = level === 'High' ? 'bg-green-900/20' : level === 'Medium' ? 'bg-yellow-900/20' : 'bg-blue-900/20';
                                            
                                            return (
                                                <div key={level}>
                                                    <div className={`text-[10px] uppercase font-bold mb-1 ${color} opacity-80 pl-1`}>{level} Probability</div>
                                                    <ul className="space-y-1">
                                                        {points.map((p, i) => {
                                                            const match = p.match(/^(High|Medium|Low):\s*(.*?)\s*-\s*(.*)$/);
                                                            const diagnosis = match ? match[2] : p.split(':')[1]?.trim() || p;
                                                            const rationale = match ? match[3] : '';
                                                            
                                                            return (
                                                                <li key={i} className={`text-xs p-2 rounded-md ${bg} border border-transparent`}>
                                                                    <span className="font-semibold text-gray-200 block mb-0.5">
                                                                        {diagnosis}
                                                                    </span>
                                                                    {rationale && (
                                                                        <span className="text-gray-400 block leading-tight">
                                                                            {rationale}
                                                                        </span>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            )
                                        })}
                                        {/* Fallback for unformatted points */}
                                        {insight.points.filter(p => !p.match(/^(High|Medium|Low):/)).length > 0 && (
                                            <ul className="list-disc list-inside space-y-1 text-sm opacity-90">
                                                {insight.points.filter(p => !p.match(/^(High|Medium|Low):/)).map((point, pIndex) => (
                                                    <li key={pIndex}>{point}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ) : (
                                    <ul className="list-disc list-inside space-y-1 text-sm opacity-90">
                                        {insight.points.map((point, pIndex) => (
                                            <li key={pIndex}>{point}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
             {/* Footer / Controls */}
            <footer className="flex flex-col p-4 border-t border-aivana-light-grey items-center justify-center flex-shrink-0 bg-aivana-dark z-10">
                {error && <div className="text-red-400 p-2 text-center bg-red-900/50 rounded-md text-sm mb-2 max-w-xl">{error}</div>}
                 <div className="h-8 mb-2 flex items-center justify-center text-sm text-center">
                    {getStatusText()}
                </div>
                <button
                    onClick={handleToggleScribing}
                    disabled={isEnding}
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