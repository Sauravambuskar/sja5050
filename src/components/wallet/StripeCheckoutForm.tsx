import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface StripeCheckoutFormProps {
  clientSecret: string;
}

export const StripeCheckoutForm = ({ clientSecret }: StripeCheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/wallet`,
      },
      redirect: 'if_required',
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred.");
      }
    } else {
      toast.success("Payment successful! Your balance will be updated shortly.");
      // In a real-world scenario, a webhook would handle the balance update.
      // For this demo, we'll optimistically update the client.
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button disabled={isLoading || !stripe || !elements} className="w-full mt-6">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Pay Now
      </Button>
    </form>
  );
};