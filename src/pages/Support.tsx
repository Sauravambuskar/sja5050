import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { SupportTicket } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MessageSquare, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { InvestmentCancellation } from "@/components/support/InvestmentCancellation";

const ticketSchema = z.object({
  subject: z.string().min(10, "Subject must be at least 10 characters."),
  message: z.string().min(20, "Message must be at least 20 characters."),
});

const fetchTickets = async (): Promise<SupportTicket[]> => {
  const { data, error } = await supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
};

const createTicket = async (values: z.infer<typeof ticketSchema>) => {
  const { data, error } = await supabase.rpc('create_support_ticket', {
    p_subject: values.subject,
    p_message: values.message,
  });
  if (error) throw error;
  return data;
};

const Support = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const form = useForm<z.infer<typeof ticketSchema>>({ resolver: zodResolver(ticketSchema) });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['supportTickets'],
    queryFn: fetchTickets,
  });

  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: (newTicketId) => {
      toast.success("Support ticket created successfully!");
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      setIsCreateDialogOpen(false);
      form.reset();
      navigate(`/support/ticket/${newTicketId}`);
    },
    onError: (error) => {
      toast.error(`Failed to create ticket: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof ticketSchema>) => {
    mutation.mutate(values);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support Center</h1>
          <p className="text-muted-foreground">Create and manage your support requests here.</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Ticket
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>My Support Tickets</CardTitle>
          <CardDescription>A list of all your support requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : tickets && tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/support/ticket/${ticket.id}`)}>
                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                    <TableCell><Badge variant={ticket.status === 'Closed' ? 'secondary' : 'default'}>{ticket.status}</Badge></TableCell>
                    <TableCell>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4">You have no support tickets yet.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-8">
        <InvestmentCancellation />
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Support Ticket</DialogTitle>
            <DialogDescription>Describe your issue below and our team will get back to you shortly.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="subject" render={({ field }) => (<FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} placeholder="e.g., Issue with my recent deposit" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} rows={5} placeholder="Please provide as much detail as possible..." /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Ticket
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Support;