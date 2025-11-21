import React from 'react';
import { PromptInsight, DdxItem } from '../types';
import { Icon } from './Icon';

interface PromptInsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  insights: PromptInsight | null;
  isLoading: boolean;
  currentDdx?: DdxItem[] | null;
  currentQuestions?: string[] | null;
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

const SidebarDdxDisplay: React.FC<{ items: DdxItem[] }> = ({ items }) => {
    if (!items || items.length === 0) return null;

    const normalizeConfidence = (c: string) => {
        const lower = (c || '').toLowerCase();
        if (lower.includes('high')) return 'High';
        if (lower.includes('medium')) return 'Medium';
        if (lower.includes('low')) return 'Low';
        return 'Low'; 
    };

    const grouped = {
        High: items.filter(i => normalizeConfidence(i.confidence) === 'High'),
        Medium: items.filter(i => normalizeConfidence(i.confidence) === 'Medium'),
        Low: items.filter(i => normalizeConfidence(i.confidence) === 'Low')
    };

    const hasAny = grouped.High.length > 0 || grouped.Medium.length > 0 || grouped.Low.length > 0;
    if (!hasAny) return null;

    return (
        <div className="mb-6 border-b border-aivana-light-grey pb-6">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                <Icon name="diagnosis" className="w-4 h-4 text-aivana-accent" />
                Active Differential
            </h3>
            
            <div className="space-y-4">
                {grouped.High.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                            High Probability
                        </h4>
                        {grouped.High.map((item, i) => (
                            <div key={i} className="p-2.5 bg-green-950/20 border border-green-500/20 rounded-lg">
                                <div className="font-semibold text-gray-200 text-xs">{item.diagnosis}</div>
                                <div className="text-[10px] text-gray-400 mt-1 leading-snug">{item.rationale}</div>
                            </div>
                        ))}
                    </div>
                )}

                {grouped.Medium.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div>
                            Medium Probability
                        </h4>
                        {grouped.Medium.map((item, i) => (
                            <div key={i} className="p-2.5 bg-yellow-950/20 border border-yellow-500/20 rounded-lg">
                                <div className="font-semibold text-gray-200 text-xs">{item.diagnosis}</div>
                                <div className="text-[10px] text-gray-400 mt-1 leading-snug">{item.rationale}</div>
                            </div>
                        ))}
                    </div>
                )}

                {grouped.Low.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>
                            Low Probability
                        </h4>
                        {grouped.Low.map((item, i) => (
                            <div key={i} className="p-2.5 bg-blue-950/20 border border-blue-500/20 rounded-lg">
                                <div className="font-semibold text-gray-200 text-xs">{item.diagnosis}</div>
                                <div className="text-[10px] text-gray-400 mt-1 leading-snug">{item.rationale}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const PromptInsightsPanel: React.FC<PromptInsightsPanelProps> = ({ isOpen, onClose, insights, isLoading, currentDdx, currentQuestions }) => {
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
                    <h2 className="text-lg font-bold text-white">Clinical Insights</h2>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-aivana-light-grey">
                    <Icon name="close" className="w-5 h-5" />
                </button>
            </header>

            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                
                {/* Section 1: Differential Diagnosis (Contextual) */}
                {currentDdx && <SidebarDdxDisplay items={currentDdx} />}

                 {/* Section 1.5: Questions to Ask (Contextual from DDx) */}
                {currentQuestions && currentQuestions.length > 0 && (
                    <div className="mb-6 border-b border-aivana-light-grey pb-6">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                             {/* Use an appropriate icon */}
                            <Icon name="help" className="w-4 h-4 text-aivana-accent" />
                            Questions to Ask Patient
                        </h3>
                        <ul className="space-y-2">
                            {currentQuestions.map((q, i) => (
                                <li key={i} className="text-xs text-gray-300 p-2.5 bg-[#1c1c1c] rounded-lg border border-[#333] flex gap-2">
                                    <span className="text-aivana-accent font-bold">•</span>
                                    {q}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Section 2: Prompt Analysis */}
                {isLoading && (
                    <div className="flex items-center justify-center h-32">
                        <div className="flex flex-col items-center text-gray-400">
                             <div className="w-8 h-8 border-4 border-t-transparent border-aivana-accent rounded-full animate-spin mb-4"></div>
                             <span className="text-xs">Analyzing prompt...</span>
                        </div>
                    </div>
                )}
                
                {!isLoading && !insights && !currentDdx && !currentQuestions && (
                     <div className="flex items-center justify-center h-64">
                        <div className="text-center text-gray-500 p-4">
                             <Icon name="diagnosis" className="w-10 h-10 mx-auto mb-3 opacity-50"/>
                             <p className="text-sm">Consultation insights and differential diagnoses will appear here.</p>
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
                            ) : <p className="text-gray-400 italic text-xs">No specific terms identified.</p>}
                        </InsightSection>
                        
                        <InsightSection title="Refinement Suggestions" icon="sparkles">
                             {insights.suggestions.length > 0 ? (
                                <ul className="list-disc list-inside">
                                    {insights.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            ) : <p className="text-gray-400 italic text-xs">Prompt looks good!</p>}
                        </InsightSection>

                        <InsightSection title="Follow-up Questions" icon="chatHistory">
                             {insights.followUps.length > 0 ? (
                                <ul className="list-disc list-inside">
                                    {insights.followUps.map((q, i) => <li key={i}>{q}</li>)}
                                </ul>
                            ) : <p className="text-gray-400 italic text-xs">No follow-ups suggested.</p>}
                        </InsightSection>
                    </div>
                )}
            </div>
        </aside>
    );
};