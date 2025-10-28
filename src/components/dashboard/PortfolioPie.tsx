"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type HistoryItem = {
  plan_name: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  status: "Active" | "Matured" | "Withdrawn";
  profit_earned: number;
  total_payout: number;
};

type SliceData = { name: string; value: number; fill: string };

const fetchHistory = async (): Promise<HistoryItem[]> => {
  const { data, error } = await supabase.rpc("get_my_full_investment_history");
  if (error) throw new Error(error.message);
  return (data ?? []) as HistoryItem[];
};

export default function PortfolioPie() {
  const { data: history, isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["portfolioPieHistory"],
    queryFn: fetchHistory,
    staleTime: 1000 * 60 * 5,
  });

  const counts = {
    Active: 0,
    Matured: 0,
    Withdrawn: 0,
  };

  (history || []).forEach((item) => {
    if (item.status === "Active") counts.Active += 1;
    else if (item.status === "Matured") counts.Matured += 1;
    else if (item.status === "Withdrawn") counts.Withdrawn += 1;
  });

  const data: SliceData[] = [
    { name: "Active", value: counts.Active, fill: "var(--color-active)" },
    { name: "Matured", value: counts.Matured, fill: "var(--color-matured)" },
    { name: "Withdrawn", value: counts.Withdrawn, fill: "var(--color-withdrawn)" },
  ];

  const config = {
    Active: { label: "Active", color: "hsl(221.2 83.2% 53.3%)" },
    Matured: { label: "Matured", color: "hsl(142.1 76.2% 36.3%)" },
    Withdrawn: { label: "Withdrawn", color: "hsl(0 84.2% 60.2%)" },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Overview</CardTitle>
        <CardDescription>Your investments by status</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            active: { label: "Active", color: config.Active.color },
            matured: { label: "Matured", color: config.Matured.color },
            withdrawn: { label: "Withdrawn", color: config.Withdrawn.color },
          }}
          className="w-full h-[260px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-mono font-medium">{(value as number).toLocaleString()}</span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                stroke="var(--border)"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`slice-${index}`}
                    fill={config[entry.name as "Active" | "Matured" | "Withdrawn"].color}
                  />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        {isLoading && (
          <div className="mt-4 text-sm text-muted-foreground">Loading chart...</div>
        )}
        {!isLoading && (counts.Active + counts.Matured + counts.Withdrawn === 0) && (
          <div className="mt-4 text-sm text-muted-foreground">No investments yet.</div>
        )}
      </CardContent>
    </Card>
  );
}