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
  const systemInstruction = `You are an expert medical scribe AI named Aivana. Your task is to analyze the following transcript of a doctor-patient encounter and generate a concise, structured clinical note in the SOAP (Subjective, Objective, Assessment, Plan) format.

    - Doctor's Profile: ${doctorProfile.qualification}.
    - Language for Note: ${language}.
    - The note must be in well-formatted markdown. Use headings for each section (e.g., '## Subjective').
    - If a section has no relevant information in the transcript, state "Not discussed" or "Not assessed". Do not invent information.
    - Extract chief complaints, history of present illness, relevant past medical history, and review of systems for the Subjective section.
    - Extract vitals, physical exam findings, and lab results for the Objective section.
    - Create a differential diagnosis or a primary diagnosis for the Assessment.
    - List diagnostic tests, treatments, patient education, and follow-up instructions for the Plan.`;

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
 * Determines the speaker ("Doctor" or "Patient") for a transcript chunk.
 */
export const diarizeTranscriptChunk = async (
  chunk: string,
  history: string,
  language: string
): Promise<{ speaker: 'Doctor' | 'Patient'; text: string }[] | null> => {
  const systemInstruction = `You are an expert at speech diarization.
    Your task is to analyze a new transcript chunk in the context of the recent conversation history and determine who is speaking: the "Doctor" or the "Patient".
    - The conversation language is ${language}.
    - Output a JSON array where each object has a "speaker" and "text" property.
    - If you cannot determine the speaker, default to "Patient".`;

  const prompt = `
    Recent History (for context):
    ---
    ${history || 'No history yet.'}
    ---
    New Transcript Chunk to Diarize:
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
    return null;
  }
};