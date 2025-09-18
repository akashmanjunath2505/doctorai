import React, { useState, useRef } from 'react';
import { Icon } from './Icon';
import { transcribeAudio } from '../services/geminiService';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isSending: boolean;
    language: string;
    onPlayLastMessage?: () => void;
    isTtsPlaying?: boolean;
    canPlayTts?: boolean;
}

// Helper to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // remove the prefix e.g. "data:audio/webm;base64,"
            resolve(base64data.substr(base64data.indexOf(',') + 1));
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(blob);
    });
};

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    isSending,
    language,
    onPlayLastMessage,
    isTtsPlaying,
    canPlayTts,
}) => {
    const [message, setMessage] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { isRecording, startRecording, stopRecording, error: recorderError } = useAudioRecorder();

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleSendTextMessage = () => {
        if (message.trim() && !isSending) {
            onSendMessage(message.trim());
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };
    
    const handleSttButtonClick = async () => {
        if (isTranscribing) return; // Don't allow action while transcribing

        if (isRecording) {
            const audioBlob = await stopRecording();
            if (!audioBlob || audioBlob.size === 0) return;

            setIsTranscribing(true);
            try {
                const base64Audio = await blobToBase64(audioBlob);
                const transcribedText = await transcribeAudio(base64Audio, audioBlob.type, language);
                setMessage(prev => prev.length > 0 ? `${prev} ${transcribedText}` : transcribedText);
                
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                    textareaRef.current.focus();
                }
            } catch (err) {
                console.error('Transcription error:', err);
                // Optionally show an error to the user
            } finally {
                setIsTranscribing(false);
            }
        } else {
            startRecording();
        }
    };

    const isMicDisabled = isSending || isTranscribing;

    return (
        <div className="space-y-3">
             {(recorderError) && (
                <div className="text-red-400 text-xs text-center p-2 bg-red-900/30 border border-red-500/30 rounded-lg" role="alert">
                    {recorderError}
                </div>
            )}
            <div className={`bg-aivana-light-grey rounded-xl flex items-end p-2 gap-2 border border-transparent focus-within:border-aivana-accent transition-all duration-300`}>
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={message}
                    onChange={handleInput}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendTextMessage(); }}}
                    placeholder="Type your message..."
                    className="flex-1 w-full bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none max-h-48 py-2.5 pl-2"
                    disabled={isSending}
                />
                
                <button
                    onClick={handleSttButtonClick}
                    disabled={isMicDisabled}
                    title={isRecording ? "Stop Recording" : "Start Recording"}
                    aria-label={isRecording ? "Stop Recording" : "Start Recording"}
                    className={`p-3 rounded-lg text-white transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-aivana-light-grey/80 hover:bg-aivana-grey'}`}
                >
                    {isTranscribing ? (
                         <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                    ) : (
                         <Icon name="microphone" className="w-5 h-5" />
                    )}
                </button>

                <button
                    onClick={onPlayLastMessage}
                    disabled={isSending || !canPlayTts}
                    title={isTtsPlaying ? "Stop speech" : "Read last message aloud"}
                    aria-label={isTtsPlaying ? "Stop speech" : "Read last message aloud"}
                    className={`p-3 rounded-lg text-white transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${isTtsPlaying ? 'bg-purple-600' : 'bg-aivana-light-grey/80 hover:bg-aivana-grey'}`}
                >
                    <Icon name={isTtsPlaying ? "stopCircle" : "speaker"} className="w-5 h-5" />
                </button>
                
                <button
                    onClick={handleSendTextMessage}
                    disabled={isSending || !message.trim()}
                    className="p-3 bg-aivana-accent rounded-lg text-white transition-colors flex-shrink-0 disabled:bg-aivana-grey disabled:text-gray-500 disabled:cursor-not-allowed hover:bg-purple-700"
                    aria-label="Send message"
                >
                    <Icon name="send" className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};