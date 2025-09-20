import React from 'react';
import { PromptInsight } from '../types';
import { Icon } from './Icon';

interface PromptInsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  insights: PromptInsight | null;
  isLoading: boolean;
}

const InsightSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-aivana-accent mb-2">
            <Icon name={icon} className="w-4 h-4" />
            {title}
        </h3>
        <div className="text-sm text-gray-300 space-y-2 pl-6">
            {children}
        </div>
    </div>
);

export const PromptInsightsPanel: React.FC<PromptInsightsPanelProps> = ({ isOpen, onClose, insights, isLoading }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <aside className="fixed top-0 right-0 h-full w-full max-w-sm md:relative md:max-w-none md:w-1/3 lg:w-80 bg-aivana-dark-sider border-l border-aivana-light-grey flex flex-col z-20 md:z-0 transform transition-transform md:translate-x-0"
            style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
            <header className="flex items-center justify-between p-4 border-b border-aivana-light-grey flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Icon name="lightbulb" className="w-6 h-6 text-yellow-300" />
                    <h2 className="text-lg font-bold text-white">Prompt Insights</h2>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-aivana-light-grey">
                    <Icon name="close" className="w-5 h-5" />
                </button>
            </header>

            <div className="flex-1 p-4 overflow-y-auto">
                {isLoading && (
                    <div className="flex items-center justify-center h-full">
                        <div className="flex flex-col items-center text-gray-400">
                             <div className="w-8 h-8 border-4 border-t-transparent border-aivana-accent rounded-full animate-spin mb-4"></div>
                             <span>Analyzing prompt...</span>
                        </div>
                    </div>
                )}
                {!isLoading && !insights && (
                     <div className="flex items-center justify-center h-full">
                        <div className="text-center text-gray-500 p-4">
                             <Icon name="keyboard" className="w-10 h-10 mx-auto mb-3"/>
                             <p>Send a message to get AI-powered suggestions for improving your prompts.</p>
                        </div>
                    </div>
                )}
                {!isLoading && insights && (
                    <div className="space-y-6 animate-fadeInUp">
                        <InsightSection title="Key Clinical Terms" icon="search">
                            {insights.keyTerms.length > 0 ? (
                                <ul className="list-disc list-inside">
                                    {insights.keyTerms.map((term, i) => <li key={i}>{term}</li>)}
                                </ul>
                            ) : <p className="text-gray-400">No specific terms identified.</p>}
                        </InsightSection>
                        
                        <InsightSection title="Refinement Suggestions" icon="sparkles">
                             {insights.suggestions.length > 0 ? (
                                <ul className="list-disc list-inside">
                                    {insights.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            ) : <p className="text-gray-400">Prompt looks good!</p>}
                        </InsightSection>

                        <InsightSection title="Follow-up Questions" icon="chatHistory">
                             {insights.followUps.length > 0 ? (
                                <ul className="list-disc list-inside">
                                    {insights.followUps.map((q, i) => <li key={i}>{q}</li>)}
                                </ul>
                            ) : <p className="text-gray-400">No follow-ups suggested.</p>}
                        </InsightSection>
                    </div>
                )}
            </div>
        </aside>
    );
};
