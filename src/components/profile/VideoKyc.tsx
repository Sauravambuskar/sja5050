import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '../auth/AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Video, StopCircle, Upload, RefreshCw, Loader2, VideoOff } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Skeleton } from '@/components/ui/skeleton';

const uploadVideoKyc = async ({ userId, file }: { userId: string; file: File }) => {
  console.log("Attempting to upload video KYC for user:", userId);
  const fileName = `${userId}/video-kyc-${Date.now()}.webm`;
  
  const { error: uploadError } = await supabase.storage
    .from('kyc_documents')
    .upload(fileName, file);

  if (uploadError) {
    console.error("Supabase Storage Upload Error:", uploadError);
    throw new Error(`Storage Error: ${uploadError.message}`);
  }
  console.log("Video uploaded to storage:", fileName);

  const { error: dbError } = await supabase.from('kyc_documents').insert({
    user_id: userId,
    document_type: 'Video KYC',
    file_path: fileName,
    status: 'Pending',
  });

  if (dbError) {
    console.error("Supabase DB Insert Error:", dbError);
    throw new Error(`Database Error: ${dbError.message}`);
  }
  console.log("Video KYC entry added to database.");
  
  const { error: profileError } = await supabase.from('profiles').update({ kyc_status: 'Pending Review' }).eq('id', userId);
  if (profileError) {
    console.error("Supabase Profile Update Error:", profileError);
    throw new Error(`Profile Update Error: ${profileError.message}`);
  }
  console.log("User profile KYC status updated to 'Pending Review'.");

  return { filePath: fileName };
};

export const VideoKyc = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings, isLoading: isLoadingSettings } = useSystemSettings();
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
    console.log("Browser video recording support:", supported);
    // Remove the problematic line that was causing TS2774 error
    // The toast.warning function is always defined, so no need to check if it exists

    // Cleanup stream and videoUrl on unmount
    return () => {
      if (streamRef.current) {
        console.log("Stopping media stream on unmount.");
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoUrl) {
        console.log("Revoking object URL on unmount.");
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
      console.log("Video KYC mutation successful.");
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setRecordingStatus('recorded'); // Allow retry
      console.error("Video KYC mutation failed:", error);
    },
  });

  const startRecording = useCallback(async () => {
    console.log("Attempting to start recording.");
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
      console.log("Revoked previous video object URL.");
    }

    try {
      console.log("Requesting media devices (camera/microphone).");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log("Camera stream attached to video element.");
      }

      const options = {
        mimeType: 'video/webm; codecs=vp9',
        videoBitsPerSecond: 1000000, // 1 Mbps for compression
      };
      console.log("MediaRecorder options:", options);
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log("Data available from MediaRecorder, chunk size:", event.data.size);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("MediaRecorder stopped. Total chunks:", chunks.length);
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], 'video-kyc.webm', { type: 'video/webm' });
        setRecordedVideo(file);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setRecordingStatus('recorded');
        console.log("Recorded video blob created, object URL:", url);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
          videoRef.current.load(); // Ensure video reloads with new src
          console.log("Recorded video set as source for playback.");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus('recording');
      console.log("MediaRecorder started.");
    } catch (err) {
      console.error("Error accessing media devices:", err);
      toast.error("Could not access camera/microphone. Please check permissions and ensure no other application is using them.");
      setError("Could not access camera/microphone. Please check permissions.");
    }
  }, [videoUrl]);

  const stopRecording = useCallback(() => {
    console.log("Attempting to stop recording.");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log("MediaRecorder stop method called.");
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      console.log("Media stream tracks stopped.");
    }
    setIsRecording(false);
  }, []);

  const handleUpload = () => {
    if (!user || !recordedVideo) {
      console.warn("Upload attempted without user or recorded video.");
      return;
    }
    console.log("Initiating video upload.");
    setRecordingStatus('uploading');
    mutation.mutate({ userId: user.id, file: recordedVideo });
  };

  const handleRetake = () => {
    console.log("Retake initiated.");
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

  if (isLoadingSettings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Video KYC</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="w-full aspect-video" />
            <Skeleton className="h-10 w-full" />
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
        ) : recordingStatus === 'recorded' || recordingStatus === 'uploading' ? (
          <div className="space-y-4">
            <video src={videoUrl || undefined} controls className="w-full rounded-md" />
            <div className="flex gap-2">
              <Button onClick={handleRetake} variant="outline" disabled={recordingStatus === 'uploading'}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retake
              </Button>
              <Button onClick={handleUpload} disabled={!recordedVideo || recordingStatus === 'uploading'} className="w-full">
                {recordingStatus === 'uploading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Upload Video
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
              {isRecording && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <p className="text-white text-center text-lg md:text-xl font-semibold leading-relaxed whitespace-pre-wrap">
                      {settings?.video_kyc_prompt || "Please state your full name and today's date clearly i am investing my amount in real estate plan with my all consent i know all the terms and conditions and i am ready to invest my amount with SJA Foundation."}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
                </>
              )}
            </div>
            <div className="flex gap-2">
              {isRecording ? (
                <Button onClick={stopRecording} className="w-full">
                  <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
                </Button>
              ) : (
                <Button onClick={startRecording} className="w-full" disabled={!isSupported}>
                  <Video className="mr-2 h-4 w-4" /> Start Recording
                </Button>
              )}
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};