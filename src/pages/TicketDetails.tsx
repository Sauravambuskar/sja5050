import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SupportTicket, SupportMessage } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const replySchema = z.object({
  message: z.string().min(1, "Message cannot be empty."),
});

const fetchTicketDetails = async (ticketId: string) => {
  const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId).single();
  if (error) throw error;
  return data as SupportTicket;
};

const fetchTicketMessages = async (ticketId: string) => {
  const { data, error } = await supabase.from('support_messages').select('*, profiles(full_name, role)').eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (error) throw error;
  return data as SupportMessage[];
};

const addReply = async ({ ticketId, message }: { ticketId: string; message: string }) => {
  const { error } = await supabase.from('support_messages').insert({ ticket_id: ticketId, message });
  if (error) throw error;
  // Also update the ticket's updated_at timestamp
  await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId);
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const TicketDetails = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof replySchema>>({ resolver: zodResolver(replySchema) });

  const { data: ticket, isLoading: isTicketLoading } = useQuery({
    queryKey: ['supportTicket', ticketId],
    queryFn: () => fetchTicketDetails(ticketId!),
    enabled: !!ticketId,
  });

  const { data: messages, isLoading: areMessagesLoading } = useQuery({
    queryKey: ['supportTicketMessages', ticketId],
    queryFn: () => fetchTicketMessages(ticketId!),
    enabled: !!ticketId,
  });

  const mutation = useMutation({
    mutationFn: addReply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTicketMessages', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] }); // To update the 'updated_at' on the list view
      form.reset({ message: '' });
    },
    onError: (error) => {
      toast.error(`Failed to send reply: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof replySchema>) => {
    if (!ticketId) return;
    mutation.mutate({ ticketId, message: values.message });
  };

  if (isTicketLoading || areMessagesLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!ticket) {
    return <div className="text-center">Ticket not found.</div>;
  }

  return (
    <>
      <Button asChild variant="outline" className="mb-4">
        <Link to="/support"><ArrowLeft className="mr-2 h-4 w-4" /> Back to All Tickets</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{ticket.subject}</CardTitle>
              <CardDescription>
                Opened on {format(new Date(ticket.created_at), "PPP")}
              </CardDescription>
            </div>
            <Badge variant={ticket.status === 'Closed' ? 'secondary' : 'default'}>{ticket.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {messages?.map((message) => (
              <div key={message.id} className={cn("flex items-start gap-4", message.sender_id === user?.id ? "justify-end" : "")}>
                {message.sender_id !== user?.id && (
                  <Avatar>
                    <AvatarFallback>{getInitials(message.profiles?.full_name)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-lg rounded-lg p-3", message.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <p className="text-sm">{message.message}</p>
                  <p className={cn("text-xs mt-2", message.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </p>
                </div>
                {message.sender_id === user?.id && (
                  <Avatar>
                    <AvatarFallback>{getInitials(user.user_metadata.full_name)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>

          {ticket.status !== 'Closed' && (
            <div className="mt-8 border-t pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel>Your Reply</FormLabel><FormControl><Textarea {...field} rows={4} placeholder="Type your message here..." /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Reply
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default TicketDetails;