import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Faq } from "@/types/database";
import { useEffect } from "react";

const faqSchema = z.object({
  category: z.string().min(2, "Category is required."),
  question: z.string().min(10, "Question is required."),
  answer: z.string().min(10, "Answer is required."),
  is_published: z.boolean(),
});

type FaqFormValues = z.infer<typeof faqSchema>;

interface FaqDialogProps {
  faq: Faq | null;
  isOpen: boolean;
  onClose: () => void;
}

const upsertFaq = async (values: FaqFormValues & { id?: string }) => {
  const { id, ...faqData } = values;
  const dataToUpsert = {
    ...faqData,
    id: id || undefined,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('faqs').upsert(dataToUpsert);
  if (error) throw new Error(error.message);
};

export const FaqDialog = ({ faq, isOpen, onClose }: FaqDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqSchema),
  });

  useEffect(() => {
    if (faq) {
      form.reset(faq);
    } else {
      form.reset({
        category: "General",
        question: "",
        answer: "",
        is_published: false,
      });
    }
  }, [faq, form, isOpen]);

  const mutation = useMutation({
    mutationFn: upsertFaq,
    onSuccess: () => {
      toast.success("FAQ saved successfully!");
      queryClient.invalidateQueries({ queryKey: ['faqsAdmin'] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Save failed: ${error.message}`);
    },
  });

  const onSubmit = (values: FaqFormValues) => {
    mutation.mutate({ ...values, id: faq?.id });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{faq ? 'Edit' : 'Create'} FAQ</DialogTitle>
          <DialogDescription>
            Add or update an entry for the public FAQ page.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="question" render={({ field }) => (<FormItem><FormLabel>Question</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="answer" render={({ field }) => (<FormItem><FormLabel>Answer</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="is_published" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Published</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save FAQ"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};