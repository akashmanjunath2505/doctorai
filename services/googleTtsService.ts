
interface SynthesisInput {
  text: string;
}

interface VoiceSelectionParams {
  languageCode: string;
  name?: string;
  ssmlGender?: 'SSML_VOICE_GENDER_UNSPECIFIED' | 'MALE' | 'FEMALE' | 'NEUTRAL';
}

interface AudioConfig {
  audioEncoding: 'MP3';
}

/**
 * Synthesizes speech from text using the Google Cloud Text-to-Speech API.
 * @param text The text to synthesize.
 * @param lang The language code (e.g., 'en-US', 'hi-IN').
 * @returns A base64 encoded data URL for the MP3 audio, or null on failure.
 */
export const synthesizeSpeech = async (text: string, lang: string): Promise<string | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("Google TTS API key is not configured.");
    return null;
  }
  const TTS_API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  try {
    const response = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text } as SynthesisInput,
        voice: { languageCode: lang } as VoiceSelectionParams,
        audioConfig: { audioEncoding: 'MP3' } as AudioConfig,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Google TTS API error:', error.error.message || 'Unknown error');
      return null;
    }

    const data = await response.json();
    if (data.audioContent) {
      return `data:audio/mp3;base64,${data.audioContent}`;
    }
    return null;
  } catch (error) {
    console.error('Failed to synthesize speech:', error);
    return null;
  }
};
