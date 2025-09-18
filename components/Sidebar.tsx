
import React from 'react';
import { PreCodedGpt, Chat, DoctorProfile } from '../types';
import { Icon } from './Icon';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  gpts: PreCodedGpt[];
  chats: Chat[];
  onNewChat: (gpt?: PreCodedGpt) => void;
  onSelectChat: (chatId: string) => void;
  activeChatId: string | null;
  language: string;
  setLanguage: (language: string) => void;
  doctorProfile: DoctorProfile;
  setDoctorProfile: (profile: DoctorProfile) => void;
  onStartVedaSession: () => void;
}

const DoctorProfileSwitcher: React.FC<{
    profile: DoctorProfile;
    setProfile: (profile: DoctorProfile) => void;
}> = ({ profile, setProfile }) => {
    const profiles: DoctorProfile[] = [
        { qualification: 'BAMS', canPrescribeAllopathic: 'no' },
        { qualification: 'BHMS', canPrescribeAllopathic: 'no' },
        { qualification: 'MBBS', canPrescribeAllopathic: 'yes' },
    ];

    return (
        <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
                Doctor Profile (Simulated)
            </label>
            <div className="flex bg-aivana-grey rounded-lg p-1">
                 {profiles.map(p => (
                     <button
                        key={p.qualification}
                        onClick={() => setProfile(p)}
                        className={`flex-1 text-xs px-2 py-1 rounded-md transition-colors ${profile.qualification === p.qualification ? 'bg-aivana-accent text-white font-semibold' : 'text-gray-300 hover:bg-aivana-light-grey'}`}
                     >
                         {p.qualification}
                     </button>
                 ))}
            </div>
        </div>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  gpts,
  chats,
  onNewChat,
  onSelectChat,
  activeChatId,
  language,
  setLanguage,
  doctorProfile,
  setDoctorProfile,
  onStartVedaSession,
}) => {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      ></div>
      <aside
        className={`fixed top-0 left-0 h-full bg-aivana-dark-sider w-64 flex-shrink-0 flex flex-col p-4 z-40 transform transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Icon name="logo" className="w-8 h-8 text-white" />
            <h1 className="text-xl font-bold text-white">Aivana</h1>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-gray-400 hover:text-white p-1"
            aria-label="Close menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <button
          onClick={onStartVedaSession}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 mb-4 text-base font-semibold text-white bg-aivana-grey rounded-lg border border-aivana-light-grey hover:border-aivana-accent hover:bg-aivana-light-grey transition-all transform hover:scale-105"
        >
          <Icon name="sparkles" className="w-5 h-5 text-aivana-accent" />
          Start Veda Session
        </button>
        
        <button
          onClick={() => onNewChat()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-6 text-sm font-medium text-white bg-aivana-accent rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Icon name="newChat" />
          New Chat
        </button>

        <div className="flex-1 overflow-y-auto pr-1 -mr-2 space-y-6">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
              Explore
            </h2>
            <nav className="space-y-1">
              {gpts.map((gpt) => (
                <button
                  key={gpt.id}
                  onClick={() => onNewChat(gpt)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-200 rounded-md hover:bg-aivana-grey"
                >
                  <div className="w-6 h-6 flex items-center justify-center">{gpt.icon}</div>
                  <span className="truncate">{gpt.title}</span>
                </button>
              ))}
            </nav>
          </div>
          {chats.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                Recent Chats
              </h2>
              <nav className="space-y-1">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md truncate ${
                      activeChatId === chat.id
                        ? 'bg-aivana-grey text-white'
                        : 'text-gray-300 hover:bg-aivana-grey hover:text-white'
                    }`}
                  >
                     <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                        <Icon name="chatHistory" className="w-4 h-4"/>
                    </div>
                    <span className="truncate">{chat.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
        
        <div className="mt-auto pt-4 border-t border-aivana-light-grey/20 space-y-4">
             <DoctorProfileSwitcher profile={doctorProfile} setProfile={setDoctorProfile} />
            <div>
                <label htmlFor="language-select" className="block text-xs font-medium text-gray-400 mb-1">
                    Response Language
                </label>
                <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-aivana-grey border border-aivana-light-grey text-white text-sm rounded-lg focus:ring-aivana-accent focus:border-aivana-accent block p-2"
                >
                    <option value="English">English</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Hindi">Hindi</option>
                </select>
            </div>
        </div>
      </aside>
    </>
  );
};
