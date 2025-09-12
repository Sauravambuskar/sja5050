import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '../auth/AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Video, StopCircle, Upload, RefreshCw, Loader2, VideoOff } from 'lucide-react';

const uploadVideoKyc = async ({ userId, file }: { userId: string; file: File }) => {
  const fileName = `${userId}/video-kyc-${Date.now()}.webm`;
  
  const { error: uploadError } = await supabase.storage
    .from('kyc_documents')
    .upload(fileName, file);

  if (uploadError) {
    throw new Error(`Storage Error: ${uploadError.message}`);
  }

  const { error: dbError } = await supabase.from('kyc_documents').insert({
    user_id: userId,
    document_type: 'Video KYC',
    file_path: fileName,
    status: 'Pending',
  });

  if (dbError) {
    throw new Error(`Database Error: ${dbError.message}`);
  }
  
  const { error: profileError } = await supabase.from('profiles').update({ kyc_status: 'Pending Review' }).eq('id', userId);
  if (profileError) throw new Error(`Profile Update Error: ${profileError.message}`);

  return { filePath: fileName };
};

export const VideoKyc = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSupported, setIsSupported] = useState(true);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'recorded' | 'uploading'>('idle');
  const [recordedVideo, setRecordedVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const supported = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
    setIsSupported(supported);
    if (!supported) {
      toast.warning("Your browser does not support video recording. Please try a different browser like Chrome or Firefox.");
    }

    // Cleanup stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    // Cleanup object URL when component unmounts or URL changes
    return () => {
      if (videoUrl !== null) { // Changed from if (videoUrl) to if (videoUrl !== null)
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const mutation = useMutation({
    mutationFn: uploadVideoKyc,
    onSuccess: () => {
      toast.success('Video KYC uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['kycDocuments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profileStatus', user?.id] });
      setRecordingStatus('idle');
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setRecordingStatus('recorded'); // Allow retry
    },
  });

  const startRecording = useCallback(async () => {
    if (typeof videoUrl === 'string') {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const options = {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 1000000, // 1 Mbps for compression
      };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], 'video-kyc.webm', { type: 'video/webm' });
        setRecordedVideo(file);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setRecordingStatus('recorded');
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus('recording');
    } catch (err) {
      console.error("Error accessing media devices.", err);
      toast.error("Could not access camera/microphone. Please check permissions.");
      setError("Could not access camera/microphone. Please check permissions.");
    }
  }, [videoUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleUpload = () => {
    if (!user || !recordedVideo) return;
    setRecordingStatus('uploading');
    mutation.mutate({ userId: user.id, file: recordedVideo });
  };

  const handleRetake = () => {
    setRecordedVideo(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.srcObject = null;
    }
    setRecordingStatus('idle');
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Video KYC</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border rounded-md">
            <VideoOff className="h-12 w-12 mb-4" />
            <p className="font-semibold">Video Recording Not Supported</p>
            <p className="text-sm">To complete Video KYC, please use a modern browser like Chrome or Firefox.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video KYC</CardTitle>
      </CardHeader>
      <CardContent>
        {!isSupported ? (
          <Alert variant="destructive">
            <AlertTitle>Unsupported Browser</AlertTitle>
            <AlertDescription>
              Your browser does not support the required features for video recording. Please try a different browser like Chrome or Firefox.
            </AlertDescription>
          </Alert>
        ) : videoUrl ? (
          <div className="space-y-4">
            <p>Your Video KYC has been submitted.</p>
            <video src={videoUrl} controls className="w-full rounded-md" />
            <Button onClick={() => setVideoUrl(null)}>Record Again</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
              {isRecording && <div className="absolute top-2 right-2 h-4 w-4 bg-red-500 rounded-full animate-pulse" />}
            </div>
            <div className="flex gap-2">
              {isRecording ? (
                <Button onClick={stopRecording} className="w-full">Stop Recording</Button>
              ) : (
                <Button onClick={startRecording} className="w-full" disabled={!streamRef.current}>Start Recording</Button>
              )}
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};