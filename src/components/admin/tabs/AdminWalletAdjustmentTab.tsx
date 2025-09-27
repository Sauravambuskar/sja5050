import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { DollarSign } from 'lucide-react';

interface AdminWalletAdjustmentTabProps {
  userId: string;
}

export function AdminWalletAdjustmentTab({ userId }: AdminWalletAdjustmentTabProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const adjustWalletMutation = useMutation({
    mutationFn: async () => {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount)) {
        throw new Error('Please enter a valid amount');
      }
      
      const { data, error } = await supabase
        .rpc('admin_adjust_wallet_balance', {
          p_user_id: userId,
          p_amount: numericAmount,
          p_description: description,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      toast.success(result);
      setAmount('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['userWallet', userId] });
    },
    onError: (error) => {
      toast.error(`Failed to adjust wallet: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustWalletMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjust Wallet Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Positive values add to wallet, negative values deduct
            </p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Reason for adjustment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={adjustWalletMutation.isPending}>
            {adjustWalletMutation.isPending ? 'Adjusting...' : 'Adjust Wallet'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}