import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Faq } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FaqDialog } from "@/components/admin/FaqDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const fetchFaqs = async (): Promise<Faq[]> => {
  const { data, error } = await supabase.from('faqs').select('*').order('category').order('created_at');
  if (error) throw error;
  return data;
};

const deleteFaq = async (id: string) => {
  const { error } = await supabase.from('faqs').delete().eq('id', id);
  if (error) throw error;
};

const FaqManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<Faq | null>(null);
  const [faqToDelete, setFaqToDelete] = useState<Faq | null>(null);

  const { data: faqs, isLoading } = useQuery({
    queryKey: ['faqsAdmin'],
    queryFn: fetchFaqs,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFaq,
    onSuccess: () => {
      toast.success("FAQ deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ['faqsAdmin'] });
    },
    onError: (error) => { toast.error(`Deletion failed: ${error.message}`); },
    onSettled: () => setFaqToDelete(null),
  });

  const handleAdd = () => { setSelectedFaq(null); setIsDialogOpen(true); };
  const handleEdit = (faq: Faq) => { setSelectedFaq(faq); setIsDialogOpen(true); };
  const handleDelete = (faq: Faq) => { setFaqToDelete(faq); };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>FAQ Management</CardTitle>
              <CardDescription>Create, edit, and manage questions for the public FAQ page.</CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={handleAdd}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add FAQ</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Question</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? ([...Array(3)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-full" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell><Skeleton className="h-8 w-8" /></TableCell></TableRow>))) : (
                faqs?.map((faq) => (
                  <TableRow key={faq.id}>
                    <TableCell><Badge variant="outline">{faq.category}</Badge></TableCell>
                    <TableCell className="font-medium">{faq.question}</TableCell>
                    <TableCell><Badge variant={faq.is_published ? "default" : "secondary"}>{faq.is_published ? "Published" : "Draft"}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(faq)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(faq)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <FaqDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} faq={selectedFaq} />
      <AlertDialog open={!!faqToDelete} onOpenChange={() => setFaqToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the FAQ entry.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(faqToDelete!.id)} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FaqManagement;