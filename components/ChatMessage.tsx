import React from 'react';
import { Message, DdxItem, LabResultAnalysis, MedicalCodeResult, PatientHandout, LabParameter } from '../types';
import { Icon } from './Icon';
import { TypingIndicator } from './TypingIndicator';

interface ChatMessageProps {
  message: Message;
  onToggleTts: (message: Message) => void;
  playingMessageId: string | null;
}

const Citations: React.FC<{ citations: NonNullable<Message['citations']> }> = ({ citations }) => {
    if (citations.length === 0) return null;

    return (
        <div className="mt-4 pt-3 border-t border-gray-500/50">
            <h4 className="text-xs font-semibold text-gray-300 mb-2">Sources</h4>
            <div className="flex flex-wrap gap-2">
                {citations.map((citation, index) => (
                    <a
                        key={index}
                        href={citation.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-gray-600/50 hover:bg-gray-600 text-gray-200 rounded-full px-2 py-1 transition-colors truncate max-w-xs"
                        title={citation.title}
                    >
                        {index + 1}. {citation.title}
                    </a>
                ))}
            </div>
        </div>
    );
};

// --- Structured Data Renderers ---

const RenderDdx: React.FC<{ items: DdxItem[] }> = ({ items }) => (
    <div className="mt-4 pt-3 border-t border-aivana-light-grey/80">
        <h4 className="text-sm font-semibold text-gray-200 mb-3">Differential Diagnosis</h4>
        <div className="space-y-3">
            {items.map((item, index) => (
                <div key={index} className="p-3 bg-aivana-grey/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-white">{item.diagnosis}</h5>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.confidence === 'High' ? 'bg-green-500/20 text-green-300' :
                            item.confidence === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                        }`}>{item.confidence}</span>
                    </div>
                    <p className="text-xs text-gray-300 mt-1">{item.rationale}</p>
                </div>
            ))}
        </div>
    </div>
);

const RenderLabAnalysis: React.FC<{ analysis: LabResultAnalysis }> = ({ analysis }) => {
    const getUrgencyClass = (urgency: LabParameter['urgency']) => {
        switch (urgency) {
            case 'Critical': return 'text-red-400 border-red-500';
            case 'Abnormal': return 'text-yellow-400 border-yellow-500';
            default: return 'text-gray-400 border-gray-600';
        }
    };
    return (
        <div className="mt-4 pt-3 border-t border-aivana-light-grey/80">
            <h4 className="text-sm font-semibold text-gray-200 mb-2">Lab Result Analysis</h4>
            <p className="text-xs text-gray-300 mb-4 italic">"{analysis.overallInterpretation}"</p>
            <div className="space-y-2">
                {analysis.results.map((param, index) => (
                    <div key={index} className={`p-2.5 bg-aivana-grey/50 rounded-lg border-l-2 ${getUrgencyClass(param.urgency)}`}>
                        <div className="flex justify-between items-start">
                            <span className="font-semibold text-white text-sm">{param.parameter}</span>
                            <span className="font-mono text-sm">{param.value}</span>
                        </div>
                        <div className="text-xs text-gray-400 flex justify-between items-center mt-1">
                             <span>Ref: {param.referenceRange}</span>
                             <span className={`font-semibold ${param.urgency !== 'Normal' ? 'text-white' : ''}`}>{param.urgency}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-2">{param.interpretation}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const RenderMedicalCodes: React.FC<{ result: MedicalCodeResult }> = ({ result }) => (
    <div className="mt-4 pt-3 border-t border-aivana-light-grey/80">
        <h4 className="text-sm font-semibold text-gray-200 mb-2">Medical Coding Suggestions</h4>
        <p className="text-xs text-gray-400 mb-3">For query: "{result.query}"</p>
        <div className="space-y-2">
            {result.codes.map((code, index) => (
                <div key={index} className="flex items-start gap-3 p-2 bg-aivana-grey/50 rounded-lg">
                    <span className="font-mono text-sm bg-aivana-dark text-aivana-accent px-2 py-1 rounded">{code.code}</span>
                    <p className="text-sm text-gray-200">{code.description}</p>
                </div>
            ))}
        </div>
    </div>
);

const RenderPatientHandout: React.FC<{ handout: PatientHandout }> = ({ handout }) => (
    <div className="mt-4 pt-3 border-t border-aivana-light-grey/80">
        <div className="p-4 bg-aivana-dark rounded-lg border border-aivana-light-grey">
            <h4 className="text-lg font-bold text-aivana-accent mb-2">{handout.title}</h4>
            <p className="text-sm text-gray-300 mb-4">{handout.introduction}</p>
            <div className="space-y-3">
                {handout.sections.map((section, index) => (
                    <div key={index}>
                        <h5 className="font-semibold text-white mb-1">{section.heading}</h5>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{section.content}</p>
                    </div>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-6 pt-3 border-t border-aivana-light-grey">{handout.disclaimer}</p>
        </div>
    </div>
);

const StructuredContent: React.FC<{ message: Message }> = ({ message }) => {
    if (!message.structuredData) return null;

    switch (message.structuredData.type) {
        case 'ddx':
            return <RenderDdx items={message.structuredData.data} />;
        case 'lab':
            return <RenderLabAnalysis analysis={message.structuredData.data} />;
        case 'billing':
            return <RenderMedicalCodes result={message.structuredData.data} />;
        case 'handout':
            return <RenderPatientHandout handout={message.structuredData.data} />;
        default:
            return null;
    }
};

const renderMarkdownToHTML = (text: string) => {
    // Basic replacements for markdown syntax
    let html = text
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Process lines for lists and paragraphs
    const lines = html.split('\n');
    let inList = false;
    const processedLines = lines.map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('* ')) {
            const listItem = `<li>${trimmedLine.substring(2)}</li>`;
            if (!inList) {
                inList = true;
                return `<ul>${listItem}`;
            }
            return listItem;
        } else {
            if (inList) {
                inList = false;
                // Close the list and start a new paragraph if the line has content
                return `</ul>${trimmedLine ? `<p>${trimmedLine}</p>` : ''}`;
            }
            // Wrap non-empty lines in paragraphs
            return trimmedLine ? `<p>${trimmedLine}</p>` : '';
        }
    }).join('');

    // Close any open list at the end
    if (inList) {
        html = processedLines + '</ul>';
    } else {
        html = processedLines;
    }

    return html.replace(/<p>\s*<\/p>/g, ''); // Clean up empty paragraphs
};


export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onToggleTts, playingMessageId }) => {
  const isUser = message.sender === 'USER';
  const isPlaying = playingMessageId === message.id;

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-aivana-accent flex items-center justify-center">
            <Icon name="ai" className="w-5 h-5 text-white" />
        </div>
      )}
      <div className={`flex items-end gap-2 max-w-2xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`px-4 py-3 shadow-md ${
            isUser 
            ? 'bg-aivana-accent text-white rounded-t-2xl rounded-bl-2xl' 
            : 'bg-aivana-light-grey rounded-t-2xl rounded-br-2xl'
        }`}>
          {message.text === '...' ? (
            <TypingIndicator />
          ) : isUser ? (
            <div className="text-sm whitespace-pre-wrap">{message.text}</div>
          ) : (
            <div
              className="text-sm prose prose-sm prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(message.text) }}
            />
          )}
          <StructuredContent message={message} />
          {message.citations && <Citations citations={message.citations} />}
        </div>
        {!isUser && message.text.length > 0 && message.text !== '...' && (
            <button
                onClick={() => onToggleTts(message)}
                className={`p-1.5 rounded-full transition-colors ${isPlaying ? 'text-white bg-aivana-accent' : 'text-gray-400 hover:text-white bg-aivana-light-grey hover:bg-aivana-grey'}`}
                aria-label={isPlaying ? "Stop speech" : "Read message aloud"}
                title={isPlaying ? "Stop speech" : "Read aloud"}
            >
                <Icon name={isPlaying ? "stopCircle" : "speaker"} className="w-5 h-5" />
            </button>
        )}
      </div>
      {isUser && (
         <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gray-600 flex items-center justify-center">
            <Icon name="user" className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};