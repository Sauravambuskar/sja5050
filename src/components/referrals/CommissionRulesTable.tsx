import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CommissionRule } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const fetchCommissionRules = async (): Promise<CommissionRule[]> => {
  const { data, error } = await supabase.rpc('get_commission_rules');
  if (error) throw new Error(error.message);
  // Filter for active rules only for the user view
  return data.filter((rule: CommissionRule) => rule.is_active);
};

const CommissionRulesTable = () => {
  const { data: rules, isLoading } = useQuery<CommissionRule[]>({
    queryKey: ['publicCommissionRules'],
    queryFn: fetchCommissionRules,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Structure</CardTitle>
        <CardDescription>
          Here are the commission rates you'll earn from investments made by your referrals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Referral Level</TableHead>
                <TableHead className="text-right">Commission Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : rules && rules.length > 0 ? (
                rules.map((rule) => (
                  <TableRow key={rule.level}>
                    <TableCell className="font-medium">Level {rule.level}</TableCell>
                    <TableCell className="text-right font-semibold">{rule.rate}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    Commission rules are not configured yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionRulesTable;