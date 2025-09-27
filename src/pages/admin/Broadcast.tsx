import { BroadcastHistory } from "@/components/admin/BroadcastHistory";

export default function Broadcast() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Broadcast Messages</h1>
      <BroadcastHistory />
    </div>
  );
}