import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Upload, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Profile } from "@/types/database";
import { useEffect, useState, ChangeEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name is too short").max(100, "Name is too long"),
  phone: z.string().max(15, "Phone number is too long").nullable(),
  dob: z.date().nullable(),
  address: z.string().max(255).nullable(),
  city: z.string().max(100).nullable(),
  state: z.string().max(100).nullable(),
  pincode: z.string().max(10).nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const updatePersonalDetails = async (values: ProfileFormValues) => {
  const { error } = await supabase.rpc('update_my_personal_details', {
    p_full_name: values.full_name,
    p_phone: values.phone,
    p_dob: values.dob ? format(values.dob, 'yyyy-MM-dd') : null,
    p_address: values.address,
    p_city: values.city,
    p_state: values.state,
    p_pincode: values.pincode,
  });

  if (error) throw new Error(error.message);
  return values; // Pass values to onSuccess
};

const uploadAvatar = async ({ userId, file }: { userId: string; file: File }) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
  if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const { error: updateUserError } = await supabase.auth.updateUser({ data: { avatar_url: `${publicUrl}?t=${new Date().getTime()}` } });
  if (updateUserError) throw new Error(`Update User Error: ${updateUserError.message}`);
  return publicUrl;
};

const PersonalDetailsForm = ({ profile }: { profile: Profile }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        dob: profile.dob ? new Date(profile.dob) : null,
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
      });
    }
  }, [profile, form]);

  const detailsMutation = useMutation({
    mutationFn: updatePersonalDetails,
    onSuccess: async (data) => {
      toast.success("Profile updated successfully!");
      
      const { error } = await supabase.auth.updateUser({
        data: { full_name: data.full_name }
      });

      if (error) {
        toast.error("Could not update name in header: " + error.message);
      }

      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const avatarMutation = useMutation({
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
    if (!file) { setSelectedFile(null); setPreview(null); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error('File is too large. Maximum size is 2MB.'); return; }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) { toast.error('Invalid file type. Please upload a JPG, PNG, or WebP file.'); return; }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = () => {
    if (!user || !selectedFile) return;
    avatarMutation.mutate({ userId: user.id, file: selectedFile });
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const onSubmit = (values: ProfileFormValues) => {
    detailsMutation.mutate(values);
  };

  const currentAvatarUrl = user?.user_metadata?.avatar_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Details</CardTitle>
        <CardDescription>Update your personal and profile information here.</CardDescription>
      </CardHeader>
      <CardContent>
        {profile.referrer_full_name && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">You were referred by</p>
              <p className="font-semibold">{profile.referrer_full_name}</p>
            </div>
          </div>
        )}
        <div className="grid gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center gap-4 text-center md:col-span-1 md:border-r md:pr-8">
            <Avatar className="h-32 w-32">
              <AvatarImage src={preview || currentAvatarUrl} alt="Profile Avatar" />
              <AvatarFallback className="text-4xl">{getInitials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div className="w-full space-y-2">
              <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} disabled={avatarMutation.isPending} />
              <Button onClick={handleUpload} disabled={!selectedFile || avatarMutation.isPending} className="w-full">
                {avatarMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload Photo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG, or WebP. 2MB max.</p>
          </div>
          <div className="md:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="full_name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="dob" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="state" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="pincode" render={({ field }) => (<FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <Button type="submit" disabled={detailsMutation.isPending}>{detailsMutation.isPending ? "Saving..." : "Save Changes"}</Button>
              </form>
            </Form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalDetailsForm;