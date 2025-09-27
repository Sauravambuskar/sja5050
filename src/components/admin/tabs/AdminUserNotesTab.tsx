import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AdminUserNotesTabProps {
  userId: string;
}

export function AdminUserNotesTab({ userId }: AdminUserNotesTabProps) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const { data: notes, isLoading } = useQuery({
    queryKey: ['userNotes', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_notes_for_admin', { p_user_id: userId });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .rpc('add_user_note', { 
          p_user_id: userId, 
          p_note: noteText, 
          p_is_visible: isVisible 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Note added successfully');
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['userNotes', userId] });
    },
    onError: (error) => {
      toast.error(`Failed to add note: ${error.message}`);
    },
  });

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNoteMutation.mutate();
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Write a note about this user..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="visible"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
            />
            <label htmlFor="visible">Visible to user</label>
          </div>
          <Button onClick={handleAddNote} disabled={addNoteMutation.isPending}>
            {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {!notes || notes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No notes found for this user.</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note: any) => (
                <div key={note.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">{note.admin_email}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm">{note.note}</p>
                  {note.is_visible_to_user && (
                    <Badge variant="outline" className="mt-2">Visible to user</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}