import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chat, Message, UserRole, PreCodedGpt, DoctorProfile } from '../types';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { Icon } from './Icon';
import { PRE_CODED_GPTS } from '../constants';
import { streamChatResponse } from '../services/geminiService';
import { synthesizeSpeech } from '../services/googleTtsService';
import { Content } from '@google/genai';

interface ChatViewProps {
  chat: Chat | null;
  onNewChat: (gpt?: PreCodedGpt) => void;
  updateChat: (chatId: string, messages: Message[]) => void;
  userRole: UserRole;
  language: string;
  isDoctorVerified: boolean;
  setShowVerificationModal: (show: boolean) => void;
  setPendingVerificationMessage: (message: string | null) => void;
  pendingVerificationMessage: string | null;
  doctorProfile: DoctorProfile;
  pendingFirstMessage: string | null;
  setPendingFirstMessage: (message: string | null) => void;
}

const languageToCodeMap: Record<string, string> = {
    'English': 'en-US',
    'Marathi': 'mr-IN',
    'Hindi': 'hi-IN',
};

export const ChatView: React.FC<ChatViewProps> = ({
  chat,
  onNewChat,
  updateChat,
  userRole,
  language,
  isDoctorVerified,
  setShowVerificationModal,
  setPendingVerificationMessage,
  pendingVerificationMessage,
  doctorProfile,
  pendingFirstMessage,
  setPendingFirstMessage,
}) => {
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);


  const activeGpt = chat?.gptId ? PRE_CODED_GPTS.find(g => g.id === chat.gptId) : undefined;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [chat?.messages]);
  
  const handleToggleTts = useCallback(async (message: Message) => {
    if (!audioRef.current) return;

    if (playingMessageId === message.id) {
        audioRef.current.pause();
        audioRef.current.src = '';
        setPlayingMessageId(null);
    } else {
        audioRef.current.pause();
        setPlayingMessageId(message.id); 

        const langCode = languageToCodeMap[language] || 'en-US';
        const audioSrc = await synthesizeSpeech(message.text, langCode);

        if (audioSrc && audioRef.current) {
            audioRef.current.src = audioSrc;
            audioRef.current.play().catch(e => {
                console.error("Audio playback failed:", e);
                setPlayingMessageId(null);
            });
            
            audioRef.current.onended = () => {
                setPlayingMessageId(null);
            };
            audioRef.current.onerror = () => {
                console.error("Audio element error");
                setPlayingMessageId(null);
            };
        } else {
            console.error("Failed to get audio source from TTS API.");
            setPlayingMessageId(null); 
        }
    }
  }, [playingMessageId, language]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!chat) return;
    
    setIsSending(true);

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'USER',
      text: message,
    };

    const aiMessagePlaceholder: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'AI',
        text: '...',
    };
    
    const currentMessages = chat.messages ? [...chat.messages, userMessage] : [userMessage];
    updateChat(chat.id, [...currentMessages, aiMessagePlaceholder]);

    const history: Content[] = currentMessages
      .map(msg => ({
        role: msg.sender === 'USER' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));

    const stream = streamChatResponse({
        message,
        history,
        userRole,
        language,
        activeGpt,
        isDoctorVerified,
        doctorProfile,
    });

    let fullResponseText = '';
    let finalMessage: Message = { ...aiMessagePlaceholder, text: '' };

    try {
        for await (const chunk of stream) {
            if (chunk.error) {
                if (chunk.error.includes("license verification")) {
                    setPendingVerificationMessage(message);
                    setShowVerificationModal(true);
                    const verificationMessage: Message = { ...aiMessagePlaceholder, text: "Verification required to proceed. Please verify your license to continue." };
                    updateChat(chat.id, [...currentMessages, verificationMessage]);
                } else {
                    finalMessage.text = chunk.error;
                    updateChat(chat.id, [...currentMessages, finalMessage]);
                }
                setIsSending(false);
                return; 
            }

            if (chunk.textChunk) {
                fullResponseText += chunk.textChunk;
                finalMessage.text = fullResponseText;
            }
            if (chunk.citations) {
                finalMessage.citations = chunk.citations;
            }
            if (chunk.structuredData) {
                finalMessage.structuredData = chunk.structuredData;
                finalMessage.text = chunk.structuredData.summary; 
            }
            
            updateChat(chat.id, [...currentMessages, { ...finalMessage }]);
        }
    } catch (error) {
        console.error("Error handling stream:", error);
        finalMessage.text = "An unexpected error occurred while processing your request.";
        updateChat(chat.id, [...currentMessages, finalMessage]);
    } finally {
        setIsSending(false);
    }
  }, [chat, language, updateChat, userRole, activeGpt, isDoctorVerified, doctorProfile, setPendingVerificationMessage, setShowVerificationModal]);

  useEffect(() => {
    if (isDoctorVerified && pendingVerificationMessage && chat) {
      const message = pendingVerificationMessage;
      setPendingVerificationMessage(null);
      handleSendMessage(message);
    }
  }, [isDoctorVerified, pendingVerificationMessage, chat, handleSendMessage, setPendingVerificationMessage]);
  
  useEffect(() => {
      if (chat && pendingFirstMessage && chat.messages.length === 0) {
          const messageToSend = pendingFirstMessage;
          setPendingFirstMessage(null); 
          handleSendMessage(messageToSend);
      }
  }, [chat, pendingFirstMessage, handleSendMessage, setPendingFirstMessage]);

  
    const handleSendMessageOnWelcome = (message: string) => {
        if (!message.trim()) return;
        onNewChat();
        setPendingFirstMessage(message);
    };

    const lastAiMessage = useMemo(() => {
        if (!chat?.messages) return null;
        // Find last message from AI that isn't a placeholder and has text
        return [...chat.messages]
          .reverse()
          .find(m => m.sender === 'AI' && m.text && m.text !== '...');
    }, [chat?.messages]);

    const handlePlayLastMessage = useCallback(() => {
        if (lastAiMessage) {
            handleToggleTts(lastAiMessage);
        }
    }, [lastAiMessage, handleToggleTts]);

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col h-full">
          <WelcomeScreen onNewChat={onNewChat} />
          <div className="p-4 w-full max-w-4xl mx-auto">
              <ChatInput 
                onSendMessage={handleSendMessageOnWelcome} 
                isSending={isSending} 
              />
          </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <audio ref={audioRef} style={{ display: 'none' }} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
        {chat.messages.map((message) => (
            <ChatMessage
                key={message.id}
                message={message}
                onToggleTts={handleToggleTts}
                playingMessageId={playingMessageId}
            />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 w-full max-w-4xl mx-auto">
        <ChatInput 
            onSendMessage={handleSendMessage} 
            isSending={isSending} 
            onPlayLastMessage={handlePlayLastMessage}
            isTtsPlaying={!!lastAiMessage && playingMessageId === lastAiMessage.id}
            canPlayTts={!!lastAiMessage}
        />
      </div>
    </div>
  );
};


const WelcomeScreen: React.FC<{ onNewChat: (gpt?: PreCodedGpt) => void }> = ({ onNewChat }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="max-w-4xl w-full animate-fadeInUp" style={{ animationFillMode: 'backwards' }}>
                <Icon name="logo" className="w-16 h-16 mx-auto mb-4 text-white" />
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ animationDelay: '100ms' }}>
                    Welcome to Aivana for Doctors
                </h1>
                <p className="text-gray-400 mb-10 max-w-2xl mx-auto" style={{ animationDelay: '200ms' }}>
                    Your AI partner for clinical excellence. Select a specialized tool or start a general conversation below.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {PRE_CODED_GPTS.map((gpt, index) => (
                        <button
                            key={gpt.id}
                            onClick={() => onNewChat(gpt)}
                            className="text-left p-4 bg-aivana-light-grey/60 hover:bg-aivana-light-grey rounded-lg transition-all transform hover:scale-105 group animate-fadeInUp"
                            style={{ animationDelay: `${300 + index * 100}ms`, animationFillMode: 'backwards' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-aivana-grey rounded-md">
                                    {gpt.icon}
                                </div>
                                <h3 className="font-semibold text-white">{gpt.title}</h3>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{gpt.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};