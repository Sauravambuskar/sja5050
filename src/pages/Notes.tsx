import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserNote } from "@/types/database";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, StickyNote } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const fetchMyNotes = async (): Promise<UserNote[]> => {
  const { data, error } = await supabase.rpc('get_my_visible_notes');
  if (error) throw new Error(error.message);
  return data;
};

const Notes = () => {
  const { data: notes, isLoading } = useQuery({
    queryKey: ['myVisibleNotes'],
    queryFn: fetchMyNotes,
  });

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold">Notes from Admin</h1>
        <p className="text-muted-foreground">Important communications and notes regarding your account.</p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : notes && notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map(note => (
              <Card key={note.id}>
                <CardContent className="pt-6">
                  <p className="whitespace-pre-wrap">{note.note}</p>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    From: {note.admin_email} • {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </p>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed">
            <StickyNote className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Notes Found</h3>
            <p className="text-muted-foreground">You do not have any visible notes from the admin team.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Notes;