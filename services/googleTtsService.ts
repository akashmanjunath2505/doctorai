import { postToProxy } from './api';

/**
 * Synthesizes speech from text by sending a request to the backend proxy.
 * @param text The text to synthesize.
 * @param lang The language code (e.g., 'en-US', 'hi-IN').
 * @returns A base64 encoded data URL for the audio, or null on failure.
 */
export const synthesizeSpeech = async (text: string, lang: string): Promise<string | null> => {
  try {
    const response = await postToProxy('/tts/synthesize', {
      input: { text },
      voice: { languageCode: lang },
      audioConfig: { audioEncoding: 'MP3' }, // Kept for compatibility with signature, but backend uses Gemini
    });

    if (response.audioContent) {
      // The updated api.ts returns a WAV file base64 string
      return `data:audio/wav;base64,${response.audioContent}`;
    }
    return null;
  } catch (error) {
    console.error('Failed to synthesize speech via proxy:', error);
    return null;
  }
};