
// services/geminiService.ts

import { GoogleGenAI, Type } from "@google/genai";
import {
  Message,
  DoctorProfile,
  PreCodedGpt,
  PromptInsight,
  ClinicalProtocol,
  ScribeInsightBlock,
} from '../types';
import { runNexusWorkflow } from '../engine/workflow';

// Per guidelines, initialize with apiKey from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a concise clinical case summary from a conversation history.
 */
export const generateCaseSummary = async (
  messages: Message[],
  language: string,
  doctorProfile: DoctorProfile
): Promise<string> => {
  const conversationHistory = messages
    .map((msg) => `${msg.sender}: ${msg.text}`)
    .join('\n');

  const prompt = `
    Based on the following conversation history between a user (doctor) and an AI, generate a concise and structured clinical case summary in markdown format.
    The summary should be suitable for patient records or handover.
    - Doctor's Profile: ${doctorProfile.qualification}.
    - Language for summary: ${language}.

    Conversation:
    ${conversationHistory}

    Generate the summary.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error generating case summary:', error);
    return 'Error: Could not generate summary.';
  }
};


/**
 * Analyzes a user's prompt and provides suggestions for improvement.
 */
export const getPromptInsights = async (
  prompt: string,
  doctorProfile: DoctorProfile,
  language: string
): Promise<PromptInsight | null> => {
  const systemInstruction = `You are an AI assistant that helps doctors refine their prompts to get better clinical answers.
    Your analysis should be based on the doctor's profile: ${doctorProfile.qualification}.
    The response language should be ${language}.
    Analyze the user's prompt and provide:
    1.  Key clinical terms identified.
    2.  Suggestions to make the prompt more specific, clear, or comprehensive.
    3.  Potential follow-up questions the doctor might ask.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this prompt: "${prompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keyTerms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key clinical terms or concepts identified in the prompt.',
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Actionable suggestions to improve the prompt for better clinical accuracy or detail.',
            },
            followUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Relevant follow-up questions the user might consider asking.',
            },
          },
          required: ['keyTerms', 'suggestions', 'followUps'],
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as PromptInsight;
  } catch (error) {
    console.error('Error getting prompt insights:', error);
    return null;
  }
};

/**
 * Transcribes an audio blob into text.
 */
export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string,
  language: string
): Promise<string> => {
  try {
    const audioPart = {
      inlineData: {
        data: base64Audio,
        mimeType: mimeType,
      },
    };
    const textPart = {
      text: `Transcribe this audio. The speaker is speaking in ${language}.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [audioPart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return '';
  }
};


/**
 * Streams a chat response by running the full clinical reasoning workflow.
 */
export async function* streamChatResponse(params: {
  message: string;
  history: Message[];
  userRole: 'Doctor';
  language: string;
  activeGpt?: PreCodedGpt;
  isDoctorVerified: boolean;
  doctorProfile: DoctorProfile;
  knowledgeBaseProtocols: ClinicalProtocol[];
}): AsyncGenerator<{
  textChunk?: string;
  citations?: { uri: string; title: string }[];
  structuredData?: any;
  source_protocol_id?: string;
  source_protocol_last_reviewed?: string;
  action_type?: 'Informational' | 'Requires Clinician Confirmation';
  error?: string;
}> {
  const {
    message,
    history,
    language,
    activeGpt,
    isDoctorVerified,
    doctorProfile,
    knowledgeBaseProtocols,
  } = params;
  
  // Simplified license check for demo (kept at the entry point)
  if (message.toLowerCase().includes('mtp') && !isDoctorVerified) {
    yield { error: 'Accessing some information requires license verification.' };
    return;
  }

  // Call the new workflow orchestrator
  yield* runNexusWorkflow({
      message,
      history,
      doctorProfile,
      language,
      activeGpt,
      isDoctorVerified,
      knowledgeBase: knowledgeBaseProtocols,
  });
}

/**
 * Gets a spoken response for the Scribe session wake-word feature.
 */
export const getScribeSpokenResponse = async (
  question: string,
  doctorProfile: DoctorProfile,
  language: string
): Promise<string> => {
  const systemInstruction = `You are Veda, a real-time AI assistant for doctors.
  - The user (a doctor) has just said your wake word "Veda" followed by a question during a patient encounter.
  - Answer the question very concisely and clearly, as if you are speaking.
  - Doctor's profile: ${doctorProfile.qualification}.
  - Language: ${language}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Question: "${question}"`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } // For low latency
      },
    });
    return response.text;
  } catch (error) {
    console.error('Error getting Scribe spoken response:', error);
    return 'Sorry, I encountered an error.';
  }
};

/**
 * Streams clinical insights for the Scribe session based on a transcript.
 */
export async function* streamScribeInsights(
  transcript: string,
  doctorProfile: DoctorProfile,
  language: string
): AsyncGenerator<{ insights?: ScribeInsightBlock[] }> {
  const systemInstruction = `You are Veda, an AI assistant providing real-time clinical insights during a patient consultation.
    - Analyze the following transcript between a Doctor and a Patient.
    - Doctor's profile: ${doctorProfile.qualification}.
    - Language: ${language}.
    - Generate a list of insights categorized into: 'Differential Diagnosis', 'Questions to Ask', 'Labs to Consider', 'General Note'.
    - Provide bullet points for each category.
    - Your response MUST be in JSON format.`;
  
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Transcript:\n${transcript}`,
        config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    insights: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                category: { type: Type.STRING, enum: ['Differential Diagnosis', 'Questions to Ask', 'Labs to Consider', 'General Note'] },
                                points: { type: Type.ARRAY, items: { type: Type.STRING } },
                            },
                            required: ['category', 'points'],
                        },
                    },
                },
                required: ['insights'],
            },
        },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    if (result.insights) {
        yield { insights: result.insights as ScribeInsightBlock[] };
    }
  } catch (error) {
    console.error('Error streaming Scribe insights:', error);
  }
}

/**
 * Generates a clinical SOAP note from a transcript.
 */
export const generateClinicalNote = async (
  transcript: string,
  doctorProfile: DoctorProfile,
  language: string
): Promise<string> => {
  const systemInstruction = `You are an expert Medical Scribe AI named Aivana. 
    Your task is to analyze the transcript of a doctor-patient encounter and generate a professional, highly structured Clinical Note in SOAP format.

    CONTEXT:
    - Doctor's Profile: ${doctorProfile.qualification}.
    - Language for Note: ${language} (Ensure medical terms are standard).

    FORMATTING RULES (Strict Markdown):
    1. Use the following EXACT headings (level 2 Markdown):
       ## Subjective
       ## Objective
       ## Assessment
       ## Plan
    2. Use bullet points (*) for lists.
    3. Use **bold** for key findings or labels (e.g., "**BP:** 120/80").
    4. Keep it concise but clinically complete.
    
    CONTENT GUIDANCE:
    - **Subjective**: Chief Complaint (CC), HPI, PMH, ROS. State "Not discussed" if absent.
    - **Objective**: Vitals, Physical Exam findings, Lab results mentioned. State "Not assessed" if absent.
    - **Assessment**: Primary diagnosis or differential diagnosis with brief rationale.
    - **Plan**: Diagnostics ordered, medications prescribed (dose/freq), lifestyle advice, follow-up.

    DO NOT invent information not present in the transcript.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Transcript:\n---\n${transcript}\n---\n\nGenerate the SOAP note now.`,
      config: {
        systemInstruction,
      },
    });
    return response.text;
  } catch (error) {
    console.error('Error generating clinical note:', error);
    return 'Error: Could not generate the clinical note. Please try again.';
  }
};


/**
 * Determines the speaker ("Doctor" or "Patient") for a transcript chunk using context.
 */
export const diarizeTranscriptChunk = async (
  chunk: string,
  history: string,
  language: string,
  doctorProfile: DoctorProfile
): Promise<{ speaker: 'Doctor' | 'Patient'; text: string }[] | null> => {
  const systemInstruction = `You are an expert Medical Scribe and Diarization AI.
    Your GOAL: Accurately identify if the text is spoken by the DOCTOR or the PATIENT.

    CONTEXT:
    - Doctor Profile: ${doctorProfile.qualification}.
    - Language: ${language}.
    - Setting: Clinical Consultation.

    LINGUISTIC PROFILING (Speaker Identification Rules):
    
    1. **THE DOCTOR**
       - Asks specific clinical questions ("How long?", "Does it hurt here?", "Any fever?").
       - Gives commands or instructions ("Take a deep breath", "Lie down", "Open your mouth").
       - Uses medical terminology to explain or summarize.
       - Validates symptoms ("Okay", "I see").
    
    2. **THE PATIENT**
       - Describes subjective experiences ("It feels like...", "I have a pain...").
       - Answers questions directly ("Yes", "No", "Since yesterday").
       - Expresses concern, fear, or doubt.
       - Uses layperson language.

    INSTRUCTIONS:
    - Analyze the "New Chunk" in the context of the "History".
    - If the history ends with a Doctor's question, the new chunk is likely a Patient's answer.
    - If the text contains dialogue from BOTH (e.g., "Does it hurt?" "Yes"), split it into two entries.
    - Output a JSON array.
  `;

  const prompt = `
    Recent Conversation History:
    ${history || '(Start of session)'}
    
    New Chunk to Diarize:
    "${chunk}"
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING, enum: ['Doctor', 'Patient'] },
              text: { type: Type.STRING },
            },
            required: ['speaker', 'text'],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error during diarization:', error);
    // Fallback: return as is, assume Patient if we can't guess, or leave it to the UI to handle
    return null;
  }
};
