"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export default function useLedgerSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("ledger-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payout_log" },
        () => {
          // Refresh ledger and payment history everywhere
          queryClient.invalidateQueries({ queryKey: ["adminLedger"] });
          queryClient.invalidateQueries({ queryKey: ["adminPayoutHistory"] });
          queryClient.invalidateQueries({ queryKey: ["myPayoutHistory"] });
        }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}