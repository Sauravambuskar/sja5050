import { useState } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripeCheckoutForm } from './StripeCheckoutForm';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error("VITE_STRIPE_PUBLISHABLE_KEY is not set in .env file.");
}

const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export const StripeProvider = () => {
  const [amount, setAmount] = useState(1000);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createPaymentIntent = async () => {
    if (amount < 100) {
      toast.error("Minimum deposit amount is ₹100.");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { amount },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      toast.error(`Failed to initialize payment: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!stripePromise) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Payment System Error</AlertTitle>
        <AlertDescription>
          The payment system is not configured correctly. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'Ideal Sans, system-ui, sans-serif',
        spacingUnit: '2px',
        borderRadius: '4px',
      },
    },
  };

  return (
    <div>
      {!clientSecret ? (
        <div className="space-y-4 max-w-sm mx-auto">
          <div>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="100"
              placeholder="e.g., 1000"
            />
          </div>
          <Button onClick={createPaymentIntent} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Proceed to Payment
          </Button>
        </div>
      ) : (
        <Elements options={options} stripe={stripePromise}>
          <StripeCheckoutForm clientSecret={clientSecret} />
        </Elements>
      )}
    </div>
  );
};