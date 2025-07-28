import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../auth/AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Video, StopCircle, Upload, RefreshCw, Loader2 } from 'lucide-react';

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
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'recorded' | 'uploading'>('idle');
  const [recordedVideo, setRecordedVideo] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const mutation = useMutation({
    mutationFn: uploadVideoKyc,
    onSuccess: () => {
      toast.success('Video KYC uploaded successfully!');
      queryClient.invalidateQueries({ queryKey: ['kycDocuments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profileStatus', user?.id] });
      handleRetake(); // Reset state
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setRecordingStatus('recorded'); // Allow retry
    },
  });

  const startRecording = useCallback(async () => {
    // Reset previous recording if any
    if (videoUrl) {
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
      setRecordingStatus('recording');
    } catch (err) {
      console.error("Error accessing media devices.", err);
      toast.error("Could not access camera/microphone. Please check permissions.");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video KYC</CardTitle>
        <CardDescription>Record a short video of yourself holding your ID for verification.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center relative">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            controls={recordingStatus === 'recorded'}
            muted={recordingStatus !== 'recorded'}
            className="w-full h-full object-cover"
          >
          </video>
          {recordingStatus === 'idle' && (
            <div className="absolute text-center text-white pointer-events-none">
              <Video className="mx-auto h-12 w-12 mb-2" />
              <p>Click "Start Video KYC" to begin</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-center gap-4">
          {recordingStatus === 'idle' && (
            <Button onClick={startRecording}>
              <Video className="mr-2 h-4 w-4" /> Start Video KYC
            </Button>
          )}
          {recordingStatus === 'recording' && (
            <Button onClick={stopRecording} variant="destructive">
              <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
            </Button>
          )}
          {recordingStatus === 'recorded' && (
            <>
              <Button onClick={handleRetake} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Retake
              </Button>
              <Button onClick={handleUpload}>
                <Upload className="mr-2 h-4 w-4" /> Upload Video
              </Button>
            </>
          )}
          {recordingStatus === 'uploading' && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};