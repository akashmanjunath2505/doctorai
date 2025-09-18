import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async (
        options: { onChunk?: (blob: Blob) => void; timeslice?: number } = {}
    ) => {
        setError(null);
        if (mediaRecorderRef.current || isRecording) return;
        const { onChunk, timeslice } = options;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaOptions = { mimeType: 'audio/webm;codecs=opus' };
            const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mediaOptions.mimeType) ? mediaOptions : undefined);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    if (onChunk) {
                        onChunk(event.data);
                    }
                }
            };

            recorder.start(onChunk ? timeslice || 2500 : undefined);
            setIsRecording(true);
            setIsPaused(false);
        } catch (err) {
            console.error('Microphone access error:', err);
            setError('Microphone access denied. Please allow microphone access in your browser settings.');
            setIsRecording(false);
        }
    }, [isRecording]);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) {
                resolve(null);
                return;
            }
            
            const recorder = mediaRecorderRef.current;

            const cleanupAndResolve = () => {
                const mimeType = recorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

                if (recorder.stream) {
                    recorder.stream.getTracks().forEach(track => track.stop());
                }

                mediaRecorderRef.current = null;
                audioChunksRef.current = [];
                setIsRecording(false);
                setIsPaused(false);

                resolve(audioBlob.size > 0 ? audioBlob : null);
            };

            recorder.onstop = cleanupAndResolve;

            if (recorder.state !== 'inactive') {
                recorder.stop();
            } else {
                // If recorder is already stopped, onstop won't fire. Manually clean up.
                cleanupAndResolve();
            }
        });
    }, []);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
        }
    }, []);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
        }
    }, []);

    return { isRecording, isPaused, startRecording, stopRecording, pauseRecording, resumeRecording, error };
};