
import React from 'react';

interface IconProps {
  name: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, className = 'w-5 h-5' }) => {
  const icons: { [key: string]: JSX.Element } = {
    logo: <path d="M12 2L2 7V17L12 22L22 17V7L12 2ZM12 12L22 7M12 12V22M12 12L2 7M17 4.5L7 9.5" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />,
    ai: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.5 1.591L5.25 15.25v2.25h9.5v-2.25l-4-4.842a2.25 2.25 0 01-.5-1.591V3.104m6.366 10.322-3-3a2.25 2.25 0 00-3.182 0l-3 3a2.25 2.25 0 001.591 3.842h6a2.25 2.25 0 001.591-3.842z" />,
    send: <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />,
    newChat: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />,
    diagnosis: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />,
    chevronDown: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />,
    menu: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />,
    close: <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />,
    explore: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a5.25 5.25 0 015.25 5.25c0 1.32-.486 2.53-1.288 3.483a.75.75 0 01-.933-.293l-1.32-2.2a.75.75 0 01.013-1.052l1.09-1.09a.75.75 0 00-1.06-1.06l-1.09 1.09a.75.75 0 01-1.053.013l-2.2-1.32a.75.75 0 01-.293-.933A5.25 5.25 0 0112 6.75zM12 21a8.956 8.956 0 005.974-2.213c2.1-2.21 3.026-5.14 3.026-8.037C21 5.015 16.985 1 12 1S3 5.015 3 10.75c0 2.897.926 5.827 3.026 8.037A8.956 8.956 0 0012 21z" />,
    chatHistory: <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.724.39-1.465 2.198a.75.75 0 01-1.262 0l-1.465-2.198-3.724-.39A2.25 2.25 0 013 14.894V10.608c0-.97.616-1.813 1.5-2.097m16.5 0c.225.02.446.046.662.077a5.25 5.25 0 014.588 4.588c.03.216.056.437.077.662m-18 0c-.225.02-.446.046-.662.077a5.25 5.25 0 00-4.588 4.588c-.03.216-.056.437-.077.662m18 0L12 15.25l-6.75-6.739" />,
    shieldCheck: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" />,
    microphone: <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2" />,
    speaker: <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />,
    sparkles: (
      <>
        <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 3 3 1.5-3 1.5L12 12l-1.5-3L7 7.5 10 6 12 3z" />
        <path strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" d="M5 13l.9 1.8L7.8 16 6 16.2 5 18l-1.2-1.8L2 16.2 3.1 14.8 2 13l1.9-0.2L5 11.2 5 13z" />
      </>
    ),
    stopCircle: <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442m-7.232 7.232c2.186 2.186 5.076 3.421 8.242 3.421s6.055-1.235 8.242-3.421m-16.484 0c-2.186-2.186-3.421-5.076-3.421-8.242s1.235-6.055 3.421-8.242m16.484 0c2.186 2.186 3.421 5.076 3.421 8.242s-1.235 6.055-3.421 8.242m-16.484 0l16.484 0" />,
    lab: <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21V5.25A2.25 2.25 0 019.75 3h4.5a2.25 2.25 0 012.25 2.25V21m-6.75 0h6.75" />,
    handout: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    waveform: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l3-9 3 18 3-9h3" />,
    spinner: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M12 12v.01M12 18v.01M16 12h.01M8 12h.01" />,
    keyboard: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />,
    lightbulb: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6c0-4-3.5-7.5-6-7.5s-6 3.5-6 7.5c0 2.25 1.125 4.25 2.875 5.438M12 18.75V21m-3.75-3.75H15.75" />,
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      {icons[name] || <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};