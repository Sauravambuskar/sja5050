import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Nominee } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, PlusCircle, Edit, Trash2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

const nomineeSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  relationship: z.string().min(2, "Relationship is required"),
  dob: z.date().optional().nullable(),
  blood_group: z.string().optional().nullable(),
});

type NomineeFormValues = z.infer<typeof nomineeSchema>;

interface NomineeManagerProps {
  userId: string;
}

export const NomineeManager = ({ userId }: NomineeManagerProps) => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNominee, setEditingNominee] = useState<Nominee | null>(null);

  const { data: nominees, isLoading } = useQuery({
    queryKey: ['nominees', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('nominees').select('*').eq('user_id', userId).order('created_at');
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const form = useForm<NomineeFormValues>({
    resolver: zodResolver(nomineeSchema),
  });

  const mutation = useMutation({
    mutationFn: async (values: NomineeFormValues) => {
      const nomineeData = {
        ...values,
        user_id: userId,
        dob: values.dob ? format(values.dob, 'yyyy-MM-dd') : null,
      };

      if (editingNominee) {
        const { error } = await supabase.from('nominees').update(nomineeData).eq('id', editingNominee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('nominees').insert(nomineeData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`Nominee ${editingNominee ? 'updated' : 'added'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['nominees', userId] });
      setIsDialogOpen(false);
      setEditingNominee(null);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (nomineeId: string) => {
      const { error } = await supabase.from('nominees').delete().eq('id', nomineeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nominee deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ['nominees', userId] });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleAddNew = () => {
    setEditingNominee(null);
    form.reset({ full_name: '', relationship: '', dob: null, blood_group: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (nominee: Nominee) => {
    setEditingNominee(nominee);
    form.reset({
      full_name: nominee.full_name,
      relationship: nominee.relationship,
      dob: nominee.dob ? new Date(nominee.dob) : null,
      blood_group: nominee.blood_group || '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: NomineeFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Nominee Details</CardTitle>
        <Button size="sm" onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add Nominee</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nominees && nominees.length > 0 ? (
                  nominees.map((nominee) => (
                    <TableRow key={nominee.id}>
                      <TableCell>{nominee.full_name}</TableCell>
                      <TableCell>{nominee.relationship}</TableCell>
                      <TableCell>{nominee.dob ? format(new Date(nominee.dob), 'PPP') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(nominee)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the nominee. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(nominee.id)} disabled={deleteMutation.isPending}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center">No nominees added yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNominee ? 'Edit' : 'Add'} Nominee</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="full_name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="relationship" render={({ field }) => (<FormItem><FormLabel>Relationship</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Spouse">Spouse</SelectItem><SelectItem value="Child">Child</SelectItem><SelectItem value="Parent">Parent</SelectItem><SelectItem value="Sibling">Sibling</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="dob" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={1900} toYear={new Date().getFullYear()} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="blood_group" render={({ field }) => (<FormItem><FormLabel>Blood Group (Optional)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger></FormControl><SelectContent><SelectItem value="A+">A+</SelectItem><SelectItem value="A-">A-</SelectItem><SelectItem value="B+">B+</SelectItem><SelectItem value="B-">B-</SelectItem><SelectItem value="AB+">AB+</SelectItem><SelectItem value="AB-">AB-</SelectItem><SelectItem value="O+">O+</SelectItem><SelectItem value="O-">O-</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};