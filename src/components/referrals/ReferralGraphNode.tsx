import { useState } from "react";
import { ReferralTreeUser } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCheck, UserX, PlusCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

const getInitials = (name: string | null | undefined) => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export const ReferralGraphNode = ({ node, isRoot = false, onNodeClick }: { node: ReferralTreeUser; isRoot?: boolean; onNodeClick?: (userId: string) => void; }) => {
  const hasChildren = node.children && node.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);

  const handleNodeClick = () => {
    if (onNodeClick) {
      onNodeClick(node.id);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Connecting line from parent */}
      {!isRoot && <div className="absolute -top-4 h-4 w-px bg-muted-foreground" />}
      
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div
            className={cn("relative z-10", onNodeClick && "cursor-pointer")}
            onClick={handleNodeClick}
          >
            <Avatar className="h-16 w-16 border-2 border-primary">
              <AvatarImage src={node.avatar_url || undefined} alt={node.full_name || 'User'} />
              <AvatarFallback className="text-xl">{getInitials(node.full_name)}</AvatarFallback>
            </Avatar>
            {hasChildren && (
              <button
                className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full bg-background flex items-center justify-center border"
                onClick={handleToggleClick}
              >
                {isExpanded ? <MinusCircle className="h-4 w-4 text-muted-foreground" /> : <PlusCircle className="h-4 w-4 text-muted-foreground" />}
              </button>
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-60">
          <div className="flex flex-col space-y-2">
            <h4 className="text-sm font-semibold">{node.full_name}</h4>
            <p className="text-xs text-muted-foreground">Level {node.level} Referral</p>
            <div className="flex items-center pt-2 gap-2">
              <Badge variant={node.kyc_status === "Approved" ? "default" : "outline"}>
                KYC: {node.kyc_status}
              </Badge>
              <Badge variant={node.has_invested ? "default" : "outline"} className="flex items-center gap-1">
                {node.has_invested ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                {node.has_invested ? "Invested" : "Not Invested"}
              </Badge>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {isExpanded && hasChildren && (
        <>
          {/* Connecting line down to children */}
          <div className="h-4 w-px bg-muted-foreground" />
          <div className="relative flex">
            {/* Horizontal connecting line */}
            <div className="absolute left-0 right-0 top-0 h-px bg-muted-foreground" />
            {node.children.map((child) => (
              <div key={child.id} className="px-4 pt-4">
                <ReferralGraphNode node={child} onNodeClick={onNodeClick} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};