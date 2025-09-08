import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminUserNote } from "@/types/database";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const noteSchema = z.object({
  note: z.string().min(10, "Note must be at least 10 characters."),
  isVisibleToUser: z.boolean().default(false),
});

const fetchUserNotes = async (userId: string): Promise<AdminUserNote[]> => {
  const { data, error } = await supabase.rpc('get_user_notes_for_admin', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data;
};

const addUserNote = async ({ userId, note, isVisible }: { userId: string; note: string; isVisible: boolean }) => {
  const { error } = await supabase.rpc('add_user_note', {
    p_user_id: userId,
    p_note: note,
    p_is_visible: isVisible,
  });
  if (error) throw new Error(error.message);
};

export const AdminUserNotesTab = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof noteSchema>>({ resolver: zodResolver(noteSchema), defaultValues: { note: "", isVisibleToUser: false } });

  const { data: notes, isLoading } = useQuery({
    queryKey: ['userNotes', userId],
    queryFn: () => fetchUserNotes(userId),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: addUserNote,
    onSuccess: () => {
      toast.success("Note added successfully.");
      queryClient.invalidateQueries({ queryKey: ['userNotes', userId] });
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to add note: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof noteSchema>) => {
    mutation.mutate({ userId, note: values.note, isVisible: values.isVisibleToUser });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add New Note</CardTitle>
          <CardDescription>Add an internal or user-visible note to this account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="note" render={({ field }) => (<FormItem><FormLabel>Note</FormLabel><FormControl><Textarea rows={5} placeholder="Enter note details..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="isVisibleToUser" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Visible to User</FormLabel><FormMessage /></div></FormItem>)} />
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Note
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Note History</CardTitle>
          <CardDescription>All notes associated with this user.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          {isLoading ? <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
            : notes && notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map(note => (
                  <div key={note.id} className="p-3 border rounded-lg text-sm">
                    <p className="whitespace-pre-wrap">{note.note}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        By {note.admin_email} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                      <Badge variant={note.is_visible_to_user ? "outline" : "secondary"}>
                        {note.is_visible_to_user ? "User Visible" : "Internal"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <p className="mt-2">No notes found.</p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};