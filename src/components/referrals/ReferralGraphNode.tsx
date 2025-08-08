import { useState } from "react";
import { ReferralTreeUser } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCheck, UserX, PlusCircle, MinusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface ReferralGraphNodeProps {
  node: ReferralTreeUser;
  isRoot?: boolean;
  onNodeClick?: (userId: string) => void;
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export const ReferralGraphNode = ({ node, isRoot = false, onNodeClick }: ReferralGraphNodeProps) => {
  const hasChildren = node.children && node.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);
  const isDummy = node.full_name.includes('(Dummy)');

  const handleNodeClick = () => {
    if (onNodeClick && !isDummy) {
      onNodeClick(node.id);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the node click from firing when expanding/collapsing
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Connecting line from parent, not for root nodes */}
      {!isRoot && <div className="absolute -top-4 h-4 w-px bg-muted-foreground" />}
      
      <div
        className={cn(
          "relative z-10 flex w-48 flex-col items-center rounded-lg border bg-card p-3 shadow-sm",
          onNodeClick && !isDummy && "cursor-pointer transition-colors hover:bg-accent"
        )}
        onClick={handleNodeClick}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-background"
            onClick={handleToggleClick}
          >
            {isExpanded ? <MinusCircle className="h-5 w-5 text-muted-foreground hover:text-foreground" /> : <PlusCircle className="h-5 w-5 text-muted-foreground hover:text-foreground" />}
          </Button>
        )}
        <Avatar className="h-12 w-12 text-lg"><AvatarFallback>{getInitials(node.full_name)}</AvatarFallback></Avatar>
        <p className="mt-2 text-center font-semibold leading-tight">{node.full_name}</p>
        <p className="text-xs text-muted-foreground">Level {node.level}</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant={node.kyc_status === "Approved" ? "default" : "outline"}>
            {node.kyc_status}
          </Badge>
          {!isDummy && (
            <Badge variant={node.has_invested ? "default" : "outline"} className="flex items-center gap-1">
              {node.has_invested ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
              {node.has_invested ? "Invested" : "Not Invested"}
            </Badge>
          )}
        </div>
      </div>

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