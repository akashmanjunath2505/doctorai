

import { GoogleGenAI, Content, Type } from "@google/genai";
import { UserRole, PreCodedGpt, Citation, StructuredDataType, DoctorProfile, VedaInsightBlock } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const GROUNDING_KEYWORDS = ['latest', 'recent', 'news', 'guidelines', 'statistics', 'current events', 'who won', 'what is the score'];
const CONTROLLED_SUBSTANCES = ['morphine', 'fentanyl', 'oxycodone', 'codeine', 'diazepam', 'lorazepam', 'alprazolam', 'ketamine', 'buprenorphine'];

const TRUSTED_DATA_SOURCES = `

---
**Knowledge Base: Trusted Indian & Global Health Data Sources**
When answering questions about statistics, guidelines, or public health, you MUST prioritize and reference information from the following trusted sources. This is your primary knowledge base.

**General Public & National Health Info:**
*   **MoHFW India (https://mohfw.gov.in):** The official Ministry of Health and Family Welfare site for portals, dashboards, and national health advisories.
*   **Data.gov.in MoHFW (https://www.data.gov.in/ministrydepartment/Ministry%20of%20Health%20and%20Family%20Welfare):** Open government data with state/indicator level health datasets.
*   **NHM HMIS Portal (https://www.india.gov.in/nhm-health-statistics-information-portal):** For state and district level health statistics and HMIS indicators.

**Emergency Care & First Aid:**
*   **WHO Emergency Care Toolkit (https://www.who.int/teams/integrated-health-services/clinical-services-and-systems/emergency-and-critical-care/emergency-care-toolkit):** Provides protocols, tools, and training for triage and red flags.
*   **WHO Emergency Care Dataset (https://cdn.who.int/media/docs/default-source/integrated-health-services-(ihs)/csy/dataset-for-emergency-care.pdf):** Defines data standards and fields for emergency care.
*   **First Aid Intents Dataset (https://www.kaggle.com/datasets/mahmoudahmed6/first-aid-intents-dataset):** A dataset for understanding first aid related questions and utterances.
*   **AIDER (Zenodo - https://zenodo.org/records/3888300):** A dataset of annotated aerial images for disaster response.
---
`;

// Schemas for structured JSON responses
const JSON_SCHEMAS: Record<string, object> = {
    'doctor-ddx': {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: 'A natural language summary of the differential diagnoses.' },
            diagnoses: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        diagnosis: { type: Type.STRING },
                        rationale: { type: Type.STRING },
                        confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
                    },
                    required: ['diagnosis', 'rationale', 'confidence']
                }
            }
        },
        required: ['summary', 'diagnoses']
    },
    'doctor-lab': {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: 'A natural language summary of the lab result analysis.' },
            overallInterpretation: { type: Type.STRING, description: 'A high-level interpretation of the combined lab results.' },
            results: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        parameter: { type: Type.STRING },
                        value: { type: Type.STRING },
                        referenceRange: { type: Type.STRING },
                        interpretation: { type: Type.STRING },
                        urgency: { type: Type.STRING, enum: ['Normal', 'Abnormal', 'Critical'] }
                    },
                    required: ['parameter', 'value', 'referenceRange', 'interpretation', 'urgency']
                }
            }
        },
        required: ['summary', 'overallInterpretation', 'results']
    },
    'doctor-handout': {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: 'A short summary of what the handout is about.' },
            title: { type: Type.STRING },
            introduction: { type: Type.STRING },
            sections: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        heading: { type: Type.STRING },
                        content: { type: Type.STRING }
                    },
                    required: ['heading', 'content']
                }
            },
            disclaimer: { type: Type.STRING }
        },
        required: ['summary', 'title', 'introduction', 'sections', 'disclaimer']
    },
    'diarize-transcript': {
        type: Type.OBJECT,
        properties: {
            dialogue: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        speaker: { type: Type.STRING, enum: ['Doctor', 'Patient'] },
                        text: { type: Type.STRING }
                    },
                    required: ['speaker', 'text']
                }
            }
        },
        required: ['dialogue']
    },
    'veda-insights': {
        type: Type.OBJECT,
        properties: {
            insights: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, enum: ['Differential Diagnosis', 'Questions to Ask', 'Labs to Consider', 'General Note'] },
                        points: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['category', 'points']
                }
            }
        },
        required: ['insights']
    }
};

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
    try {
        const audioPart = {
            inlineData: {
                data: base64Audio,
                mimeType: mimeType,
            },
        };
        const textPart = { text: "Transcribe the following audio recording accurately." };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, audioPart] },
        });

        return response.text;
    } catch (error) {
        console.error("Gemini audio transcription error:", error);
        throw new Error("Failed to transcribe audio with Gemini API.");
    }
}

export async function diarizeTranscriptChunk(
    transcriptChunk: string,
    history: string,
    language: string
): Promise<Array<{ speaker: 'Doctor' | 'Patient'; text: string }> | null> {
    const systemInstruction = `You are an expert at speaker diarization for medical consultations. Analyze the following transcript chunk, using the provided history for context. Distinguish between the 'Doctor' and the 'Patient'. The Doctor uses clinical language, asks questions, and provides explanations. The Patient describes symptoms and personal experiences. Your output must be a single JSON object that strictly conforms to the provided schema, containing an array of dialogue entries. Do not output any text other than the JSON object. The conversation is in ${language}.`;
    
    const userPrompt = `CONTEXTUAL HISTORY:\n${history || 'No history provided.'}\n\nNEW TRANSCRIPT CHUNK TO DIARIZE:\n"${transcriptChunk}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: JSON_SCHEMAS['diarize-transcript'],
            },
        });

        const responseText = response.text.trim();
        const parsedJson = JSON.parse(responseText);
        if (parsedJson.dialogue) {
            return parsedJson.dialogue;
        }
        return null;
    } catch (error) {
        console.error("Diarization error:", error);
        return null;
    }
}


export function checkForControlledSubstances(message: string): boolean {
    const lowerCaseMessage = message.toLowerCase();
    return CONTROLLED_SUBSTANCES.some(drug => lowerCaseMessage.includes(drug));
}


function shouldUseGrounding(message: string): boolean {
    const lowerCaseMessage = message.toLowerCase();
    return GROUNDING_KEYWORDS.some(keyword => lowerCaseMessage.includes(keyword));
}

function constructSystemInstruction(
    userRole: UserRole, 
    language: string, 
    doctorProfile: DoctorProfile,
    activeGpt?: PreCodedGpt
): string {
    
    let baseInstruction = "You are Aivana, a helpful AI healthcare assistant operating in India. Be empathetic, clear, and professional. Format your answers using Markdown for clarity, including lists, bold text, and headings where appropriate. ";
    
    // Core Persona based on Qualification
    let persona = `You are assisting a qualified, verified doctor with a ${doctorProfile.qualification} degree. Your tone should be professional and concise. Provide evidence-based information and use precise medical terminology. Reference Indian clinical guidelines where possible. Always remind the user to use their clinical judgment.`;

    if (activeGpt) {
        persona += `\n\nCONTEXT: The user has selected the '${activeGpt.title}' mode. ${activeGpt.description} Tailor your responses to this specific context. `;
        if(JSON_SCHEMAS[activeGpt.id]) {
            persona += "Your response must be a single JSON object that strictly conforms to the provided schema. Include a natural language summary of your findings in the 'summary' field."
        }
    }

    let finalInstruction = `${baseInstruction}\n${persona}\n${TRUSTED_DATA_SOURCES}\nAll your responses must be in ${language}.`;
    
    return finalInstruction;
}


export async function* streamChatResponse({
    message,
    history,
    userRole,
    language,
    activeGpt,
    isDoctorVerified,
    doctorProfile
}: {
    message: string;
    history: Content[];
    userRole: UserRole;
    language: string;
    activeGpt?: PreCodedGpt;
    isDoctorVerified: boolean;
    doctorProfile: DoctorProfile;
}) {
    // CRITICAL SAFETY GUARDRAIL
    if (checkForControlledSubstances(message)) {
        if (!isDoctorVerified) {
            // This case should be handled by the UI, but as a fallback:
            yield { error: "Access to this information requires license verification. Please complete the verification step." };
            return;
        }
    }

    try {
        const useGrounding = shouldUseGrounding(message);
        const systemInstruction = constructSystemInstruction(userRole, language, doctorProfile, activeGpt);
        
        const activeSchema = activeGpt ? JSON_SCHEMAS[activeGpt.id] : undefined;
        const effectiveGptId = activeGpt?.id;

        const contents: Content[] = [...history, { role: 'user', parts: [{ text: message }] }];
        
        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                systemInstruction,
                ...(useGrounding && !activeSchema && { tools: [{ googleSearch: {} }] }), // Grounding is not compatible with JSON mode
                ...(activeSchema && { responseMimeType: "application/json", responseSchema: activeSchema }),
            },
        });

        if (activeSchema) {
            // Handle JSON streaming: accumulate chunks and parse at the end
            let responseText = '';
            for await (const chunk of stream) {
                const textChunk = chunk.text;
                if (textChunk) {
                    responseText += textChunk;
                }
            }

            try {
                const parsedJson = JSON.parse(responseText);
                let structuredData: StructuredDataType | undefined;

                switch (effectiveGptId) {
                    case 'doctor-ddx':
                        structuredData = { type: 'ddx', data: parsedJson.diagnoses, summary: parsedJson.summary };
                        break;
                    case 'doctor-lab':
                        structuredData = { type: 'lab', data: parsedJson, summary: parsedJson.summary };
                        break;
                    case 'doctor-handout':
                        structuredData = { type: 'handout', data: parsedJson, summary: parsedJson.summary };
                        break;
                    default:
                        structuredData = undefined;
                }

                if (structuredData) {
                    yield { structuredData };
                } else {
                     yield { textChunk: parsedJson.summary || 'Received structured data in an unknown format.' };
                }

            } catch (e) {
                console.error("JSON parsing error:", e);
                yield { error: "Failed to parse the structured response from the AI." };
            }

        } else {
             // Handle regular text streaming
            let groundingChunksFromStream: any[] | undefined;

            for await (const chunk of stream) {
                const textChunk = chunk.text;
                if (textChunk) {
                    yield { textChunk };
                }
                const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (groundingChunks) {
                    groundingChunksFromStream = groundingChunks;
                }
            }
            
            if (groundingChunksFromStream) {
                const citations: Citation[] = groundingChunksFromStream
                    .map((c: any) => ({ uri: c.web?.uri, title: c.web?.title }))
                    .filter((c: Citation) => c.uri && c.title);

                if (citations.length > 0) {
                    yield { citations };
                }
            }
        }

    } catch (error) {
        console.error("Gemini API error:", error);
        yield { error: "Failed to get response from Gemini API. Please check your connection and API key." };
    }
}

export async function* streamVedaInsights(
    transcript: string,
    doctorProfile: DoctorProfile,
    language: string
): AsyncGenerator<{ insights?: VedaInsightBlock[], error?: string }> {
    const systemInstruction = `You are Veda, an expert clinical decision support AI. Your user is a doctor with a ${doctorProfile.qualification} degree. Analyze the following real-time transcript of a doctor-patient consultation. Your task is to provide concise, real-time suggestions in the background. Based on the symptoms and history, generate a running list of differential diagnoses, suggest relevant follow-up questions for the doctor to ask, and recommend potential lab investigations. Your output must be a single JSON object that strictly conforms to the provided schema. Do not output any text other than the JSON object. Your response must be in ${language}.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: transcript }] }],
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: JSON_SCHEMAS['veda-insights'],
            },
        });

        const responseText = response.text.trim();
        const parsedJson = JSON.parse(responseText);
        if (parsedJson.insights) {
            yield { insights: parsedJson.insights };
        }
    } catch (error) {
        console.error("Veda Insights error:", error);
        yield { error: "Failed to generate insights." };
    }
}

export async function getVedaSpokenResponse(
    question: string,
    doctorProfile: DoctorProfile,
    language: string
): Promise<string> {
    const systemInstruction = `You are Veda, an expert clinical AI assistant for a doctor with a ${doctorProfile.qualification} degree. The doctor has asked you a direct question via voice command during a live patient consultation. Answer it clearly, accurately, and very concisely. Get straight to the point. Your response will be read aloud. Your response must be in ${language}.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: question }] }],
            config: { systemInstruction },
        });
        return response.text;
    } catch (error) {
        console.error("Veda spoken response error:", error);
        return "I'm sorry, I encountered an error trying to answer that question.";
    }
}
