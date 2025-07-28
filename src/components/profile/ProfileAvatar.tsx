import { useState, ChangeEvent } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const uploadAvatar = async ({ userId, file }: { userId: string; file: File }) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  // Upsert to overwrite existing avatar
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw new Error(`Storage Error: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Update user metadata
  const { error: updateUserError } = await supabase.auth.updateUser({
    data: { avatar_url: `${publicUrl}?t=${new Date().getTime()}` }, // Add timestamp to bust cache
  });

  if (updateUserError) {
    throw new Error(`Update User Error: ${updateUserError.message}`);
  }

  return publicUrl;
};

export const ProfileAvatar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      toast.success('Profile picture updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      setSelectedFile(null);
      setPreview(null);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File is too large. Maximum size is 2MB.');
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPG, PNG, or WebP file.');
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = () => {
    if (!user || !selectedFile) return;
    mutation.mutate({ userId: user.id, file: selectedFile });
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const currentAvatarUrl = user?.user_metadata?.avatar_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
        <CardDescription>Upload a new photo for your profile.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
        <Avatar className="h-24 w-24">
          <AvatarImage src={preview || currentAvatarUrl} alt="Profile Avatar" />
          <AvatarFallback className="text-3xl">
            {getInitials(user?.user_metadata?.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-4">
          <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} disabled={mutation.isPending} />
          <Button onClick={handleUpload} disabled={!selectedFile || mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload Photo
          </Button>
          <p className="text-xs text-muted-foreground">
            For best results, upload a square image (JPG, PNG, or WebP) under 2MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};