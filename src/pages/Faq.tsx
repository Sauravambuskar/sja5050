import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Faq as FaqType } from "@/types/database";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, HelpCircle } from "lucide-react";
import { useMemo } from "react";

const fetchFaqs = async (): Promise<FaqType[]> => {
  const { data, error } = await supabase.from('faqs').select('*').eq('is_published', true).order('category').order('created_at');
  if (error) throw error;
  return data;
};

const Faq = () => {
  const { data: faqs, isLoading } = useQuery({
    queryKey: ['faqsPublic'],
    queryFn: fetchFaqs,
  });

  const groupedFaqs = useMemo(() => {
    if (!faqs) return {};
    return faqs.reduce((acc, faq) => {
      (acc[faq.category] = acc[faq.category] || []).push(faq);
      return acc;
    }, {} as Record<string, FaqType[]>);
  }, [faqs]);

  return (
    <>
      <div className="text-center">
        <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Find answers to common questions about our platform and services.
        </p>
      </div>

      <div className="mt-10 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : Object.keys(groupedFaqs).length > 0 ? (
          Object.entries(groupedFaqs).map(([category, items]) => (
            <div key={category} className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 border-b pb-2">{category}</h2>
              <Accordion type="single" collapsible className="w-full">
                {items.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="prose prose-sm dark:prose-invert max-w-none">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border rounded-lg">
            <HelpCircle className="h-16 w-16 mb-4" />
            <h3 className="text-xl font-semibold">No FAQs Available</h3>
            <p>We're working on compiling answers to common questions. Please check back later.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Faq;