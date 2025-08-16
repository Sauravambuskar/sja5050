import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Loader2, CreditCard, AlertTriangle } from 'lucide-react';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;
if (stripePublishableKey) {
  stripePromise = loadStripe(stripePublishableKey);
} else {
  console.error("Stripe publishable key is not set. Please set VITE_STRIPE_PUBLISHABLE_KEY in your .env file.");
}

const StripeDeposit = () => {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!stripePublishableKey) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Automated Deposit Unavailable</CardTitle>
          <CardDescription>This feature is not configured correctly.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive-foreground">
            <AlertTriangle className="h-6 w-6" />
            <div>
              <p className="font-semibold">Configuration Error</p>
              <p className="text-sm">The payment gateway is not set up. Please contact support.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount < 100) {
      toast.error("Minimum deposit amount is ₹100.");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { amount: numericAmount },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe.js has not loaded yet.");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }
    } catch (error: any) {
      toast.error(`Payment failed: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Automated Deposit</CardTitle>
        <CardDescription>Add funds instantly using your debit/credit card via Stripe.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 5000"
              min="100"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            Proceed to Payment
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default StripeDeposit;