import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, User } from "lucide-react";
import { getNomineePhotoSignedUrl, uploadNomineePhoto } from "@/lib/nomineePhotos";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  nomineeId: string;
  nomineeName: string;
  photoPath?: string | null;
  onUpdated?: () => void;
  layout?: "compact" | "large";
};

export function NomineePhotoUploader({
  userId,
  nomineeId,
  nomineeName,
  photoPath,
  onUpdated,
  layout = "compact",
}: Props) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const canUpload = useMemo(() => Boolean(file), [file]);

  const { data: photoUrl } = useQuery({
    queryKey: ["nomineePhotoUrl", userId, nomineeId, photoPath],
    enabled: !!photoPath,
    queryFn: async () => {
      if (!photoPath) return null;
      return getNomineePhotoSignedUrl({ path: photoPath, expiresIn: 60 * 30 });
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please choose a photo.");
      if (!file.type.startsWith("image/")) throw new Error("Please upload an image file.");
      if (file.size > 2 * 1024 * 1024) throw new Error("Image too large (max 2MB).");

      const path = await uploadNomineePhoto({ userId, nomineeId, file });
      const { error } = await supabase.from("nominees").update({ photo_path: path }).eq("id", nomineeId);
      if (error) throw error;

      return path;
    },
    onSuccess: () => {
      toast.success("Nominee photo updated.");
      setFile(null);
      onUpdated?.();
      // Refresh related queries
      queryClient.invalidateQueries({ queryKey: ["myNominees", userId] });
      queryClient.invalidateQueries({ queryKey: ["nominees", userId] });
      queryClient.invalidateQueries({ queryKey: ["nomineePhotoUrl", userId, nomineeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isLarge = layout === "large";

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        isLarge && "items-start gap-4"
      )}
    >
      <Avatar className={cn("h-10 w-10", isLarge && "h-16 w-16")}
      >
        <AvatarImage src={photoUrl || undefined} alt={`${nomineeName} photo`} className={cn(isLarge && "object-cover")} />
        <AvatarFallback>
          <User className={cn("h-5 w-5", isLarge && "h-7 w-7")} />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className={cn("text-sm font-medium leading-none", isLarge && "text-base")}>{nomineeName}</div>
        <div className={cn("mt-2 flex flex-col gap-2", !isLarge && "sm:flex-row sm:items-center")}
        >
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={cn(isLarge && "max-w-sm")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => mutation.mutate()}
            disabled={!canUpload || mutation.isPending}
            className={cn(isLarge && "w-fit")}
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}