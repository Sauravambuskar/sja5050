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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type SupportMessageWithProfile = SupportMessage & {
  profiles?: { full_name: string | null; role: string; };
};

const replySchema = z.object({
  message: z.string().min(1, "Message cannot be empty."),
});

const fetchTicketDetails = async (ticketId: string) => {
  const { data, error } = await supabase.from('support_tickets').select('*, profiles(full_name)').eq('id', ticketId).single();
  if (error) throw error;
  return data as SupportTicket & { profiles: { full_name: string } };
};

const fetchTicketMessages = async (ticketId: string) => {
  const { data, error } = await supabase.from('support_messages').select('*, profiles(full_name, role)').eq('ticket_id', ticketId).order('created_at', { ascending: true });
  if (error) throw error;
  return data as SupportMessageWithProfile[];
};

const addReply = async ({ ticketId, message }: { ticketId: string; message: string }) => {
  const { error } = await supabase.rpc('add_admin_reply_to_ticket', { p_ticket_id: ticketId, p_message: message });
  if (error) throw error;
};

const updateStatus = async ({ ticketId, status }: { ticketId: string; status: string }) => {
  const { error } = await supabase.rpc('update_ticket_status_admin', { p_ticket_id: ticketId, p_new_status: status });
  if (error) throw error;
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const AdminTicketDetails = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof replySchema>>({ resolver: zodResolver(replySchema) });

  const { data: ticket, isLoading: isTicketLoading } = useQuery({
    queryKey: ['supportTicketAdmin', ticketId],
    queryFn: () => fetchTicketDetails(ticketId!),
    enabled: !!ticketId,
  });

  const { data: messages, isLoading: areMessagesLoading } = useQuery({
    queryKey: ['supportTicketMessagesAdmin', ticketId],
    queryFn: () => fetchTicketMessages(ticketId!),
    enabled: !!ticketId,
  });

  const replyMutation = useMutation({
    mutationFn: addReply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTicketMessagesAdmin', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['supportTicketsAdmin'] });
      form.reset({ message: '' });
    },
    onError: (error) => toast.error(`Failed to send reply: ${error.message}`),
  });

  const statusMutation = useMutation({
    mutationFn: updateStatus,
    onSuccess: () => {
      toast.success("Ticket status updated.");
      queryClient.invalidateQueries({ queryKey: ['supportTicketAdmin', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['supportTicketsAdmin'] });
    },
    onError: (error) => toast.error(`Failed to update status: ${error.message}`),
  });

  const onSubmit = (values: z.infer<typeof replySchema>) => {
    if (!ticketId) return;
    replyMutation.mutate({ ticketId, message: values.message });
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
        <Link to="/admin/support"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Support Desk</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{ticket.subject}</CardTitle>
              <CardDescription>Conversation with {ticket.profiles.full_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {messages?.map((message) => (
                  <div key={message.id} className={cn("flex items-start gap-4", message.profiles?.role === 'admin' ? "justify-end" : "")}>
                    {message.profiles?.role !== 'admin' && (
                      <Avatar><AvatarFallback>{getInitials(message.profiles?.full_name)}</AvatarFallback></Avatar>
                    )}
                    <div className={cn("max-w-lg rounded-lg p-3", message.profiles?.role === 'admin' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      <p className="text-sm">{message.message}</p>
                      <p className={cn("text-xs mt-2", message.profiles?.role === 'admin' ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {message.profiles?.role === 'admin' && (
                      <Avatar><AvatarFallback>{getInitials(message.profiles?.full_name)}</AvatarFallback></Avatar>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle>Ticket Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant={ticket.status === 'Closed' ? 'secondary' : 'default'}>{ticket.status}</Badge></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Client</span><span>{ticket.profiles.full_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Opened</span><span>{format(new Date(ticket.created_at), "PPP")}</span></div>
              <div className="space-y-2">
                <Label>Change Status</Label>
                <Select defaultValue={ticket.status} onValueChange={(value) => statusMutation.mutate({ ticketId: ticket.id, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Add Reply</CardTitle></CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormControl><Textarea {...field} rows={5} placeholder="Type your reply..." /></FormControl><FormMessage /></FormItem>)} />
                  <Button type="submit" disabled={replyMutation.isPending} className="w-full">
                    {replyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Reply
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default AdminTicketDetails;