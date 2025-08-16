import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminSupportTicket } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetchTickets = async (): Promise<AdminSupportTicket[]> => {
  const { data, error } = await supabase.rpc('get_all_support_tickets_admin');
  if (error) throw error;
  return data;
};

const SupportDesk = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['supportTicketsAdmin'],
    queryFn: fetchTickets,
  });

  const filteredTickets = tickets?.filter(ticket => {
    if (statusFilter === 'active') return ticket.status === 'Open' || ticket.status === 'In Progress';
    if (statusFilter === 'closed') return ticket.status === 'Closed';
    return true;
  });

  return (
    <>
      <h1 className="text-3xl font-bold">Support Desk</h1>
      <p className="text-muted-foreground">Manage all user support requests from one place.</p>

      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mt-4">
        <TabsList>
          <TabsTrigger value="active">Active Tickets</TabsTrigger>
          <TabsTrigger value="closed">Closed Tickets</TabsTrigger>
        </TabsList>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
            <CardDescription>Click on a ticket to view details and reply.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filteredTickets && filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/support/ticket/${ticket.id}`)}>
                      <TableCell>
                        <div className="font-medium">{ticket.full_name}</div>
                        <div className="text-sm text-muted-foreground">{ticket.email}</div>
                      </TableCell>
                      <TableCell>{ticket.subject}</TableCell>
                      <TableCell><Badge variant={ticket.status === 'Closed' ? 'secondary' : 'default'}>{ticket.status}</Badge></TableCell>
                      <TableCell>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No {statusFilter} tickets found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
    </>
  );
};

export default SupportDesk;