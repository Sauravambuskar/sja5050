import { ReferralTreeUser } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, UserCheck, UserX } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ReferralTreeNodeProps {
  node: ReferralTreeUser;
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export const ReferralTreeNode = ({ node }: ReferralTreeNodeProps) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <Collapsible defaultOpen={node.level < 3} className="group">
      <div className={cn(
        "flex items-center space-x-4 py-3 pr-4 transition-colors hover:bg-accent/50",
        node.level > 1 && "border-t"
      )} style={{ paddingLeft: `${(node.level - 1) * 1.5}rem` }}>
        
        <div className="flex flex-grow items-center">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button className="flex items-center text-left w-full group/trigger">
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                <Avatar className="h-9 w-9 ml-2 mr-3"><AvatarFallback>{getInitials(node.full_name)}</AvatarFallback></Avatar>
                <div className="flex-grow text-left">
                  <p className="font-medium leading-tight">{node.full_name}</p>
                  <p className="text-xs text-muted-foreground">Level {node.level}</p>
                </div>
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="flex items-center w-full">
              <span className="w-4 h-4 shrink-0 ml-2 mr-3"></span> {/* Spacer */}
              <Avatar className="h-9 w-9 mr-3"><AvatarFallback>{getInitials(node.full_name)}</AvatarFallback></Avatar>
              <div className="flex-grow">
                <p className="font-medium leading-tight">{node.full_name}</p>
                <p className="text-xs text-muted-foreground">Level {node.level}</p>
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-shrink-0 items-center justify-end space-x-4">
          <Badge variant={node.kyc_status === "Approved" ? "default" : "outline"} className="w-24 justify-center">
            {node.kyc_status}
          </Badge>
          <Badge variant={node.has_invested ? "default" : "outline"} className="w-28 justify-center flex items-center gap-1.5">
            {node.has_invested ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
            {node.has_invested ? "Invested" : "Not Invested"}
          </Badge>
        </div>
      </div>
      {hasChildren && (
        <CollapsibleContent>
          {node.children.map((child) => (
            <ReferralTreeNode key={child.id} node={child} />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};