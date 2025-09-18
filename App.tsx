import React, { useState, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { UserRole, Chat, Message, PreCodedGpt, DoctorProfile } from './types';
import { PRE_CODED_GPTS } from './constants';
import { Icon } from './components/Icon';
import { LicenseVerificationModal } from './components/LicenseVerificationModal';
import { VedaSessionView } from './components/VedaSessionView';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const userRole = UserRole.DOCTOR; // Hardcoded to Doctor role
  const [language, setLanguage] = useState('English');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // State for license verification flow
  const [isDoctorVerified, setIsDoctorVerified] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingVerificationMessage, setPendingVerificationMessage] = useState<string | null>(null);
  const [pendingFirstMessage, setPendingFirstMessage] = useState<string | null>(null);
  
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({
      qualification: 'BAMS',
      canPrescribeAllopathic: 'no'
  });
  
  // State for Veda Session
  const [isVedaSessionActive, setIsVedaSessionActive] = useState(false);


  const activeChat = useMemo(() => {
    return chats.find(chat => chat.id === activeChatId) || null;
  }, [chats, activeChatId]);

  const handleNewChat = useCallback((gpt?: PreCodedGpt) => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      title: gpt ? gpt.title : `New Conversation`,
      messages: gpt ? [{
        id: `msg-${Date.now()}`,
        sender: 'AI',
        text: `You've started a new session with ${gpt.title}. ${gpt.description} How can I help you today?`
      }] : [],
      userRole: userRole,
      gptId: gpt?.id,
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setPendingVerificationMessage(null);
    setPendingFirstMessage(null);
    if(window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [userRole]);

  const updateChat = useCallback((chatId: string, messages: Message[]) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, messages } : chat
    ));
  }, []);

  const handleSelectChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    setPendingVerificationMessage(null);
    if(window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);
  
  const relevantGpts = useMemo(() => PRE_CODED_GPTS, []);

  const handleVerifyLicense = () => {
    setIsDoctorVerified(true);
    setShowVerificationModal(false);
  };
  
  const handleStartVedaSession = () => {
      setIsVedaSessionActive(true);
      if(window.innerWidth < 768) {
        setSidebarOpen(false);
      }
  };


  return (
    <div className="flex h-screen w-screen text-aivana-text bg-aivana-dark-sider">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        gpts={relevantGpts}
        chats={chats}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        activeChatId={activeChatId}
        language={language}
        setLanguage={setLanguage}
        doctorProfile={doctorProfile}
        setDoctorProfile={setDoctorProfile}
        onStartVedaSession={handleStartVedaSession}
      />
      <main className="flex-1 flex flex-col bg-aivana-dark relative">
        {isVedaSessionActive ? (
            <VedaSessionView
                onEndSession={() => setIsVedaSessionActive(false)}
                doctorProfile={doctorProfile}
                language={language}
            />
        ) : (
            <>
                {/* Mobile Header */}
                <header className="md:hidden p-4 flex items-center justify-between border-b border-aivana-light-grey bg-aivana-dark sticky top-0 z-10">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="text-white p-2 rounded-md hover:bg-aivana-grey"
                    aria-label="Open menu"
                  >
                    <Icon name="menu" />
                  </button>
                  <h2 className="text-lg font-semibold truncate px-2">
                    {activeChat?.title || 'Aivana AI for Doctors'}
                  </h2>
                  <div className="w-9 h-9"></div> {/* Spacer to help center the title */}
                </header>
                <ChatView
                  key={activeChatId} // Force re-mount on chat change
                  chat={activeChat}
                  onNewChat={handleNewChat}
                  updateChat={updateChat}
                  userRole={userRole}
                  language={language}
                  isDoctorVerified={isDoctorVerified}
                  setShowVerificationModal={setShowVerificationModal}
                  setPendingVerificationMessage={setPendingVerificationMessage}
                  pendingVerificationMessage={pendingVerificationMessage}
                  doctorProfile={doctorProfile}
                  pendingFirstMessage={pendingFirstMessage}
                  setPendingFirstMessage={setPendingFirstMessage}
                />
            </>
        )}
      </main>
      <LicenseVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerify={handleVerifyLicense}
      />
    </div>
  );
};

export default App;