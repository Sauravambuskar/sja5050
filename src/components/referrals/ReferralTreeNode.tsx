import { ReferralTreeUser } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
    <Collapsible defaultOpen={node.level === 1} className="group">
      <div className="flex items-center space-x-4 py-2 pr-4 pl-2 border-b last:border-b-0">
        <div style={{ paddingLeft: `${(node.level - 1) * 1.5}rem` }} className="flex-grow">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button className="flex items-center text-left w-full">
                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                <Avatar className="h-8 w-8 ml-2 mr-3"><AvatarFallback>{getInitials(node.full_name)}</AvatarFallback></Avatar>
                <span className="font-medium">{node.full_name}</span>
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="flex items-center">
              <span className="w-4 h-4 ml-2 mr-3"></span> {/* Spacer */}
              <Avatar className="h-8 w-8 mr-3"><AvatarFallback>{getInitials(node.full_name)}</AvatarFallback></Avatar>
              <span className="font-medium">{node.full_name}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end items-center space-x-4 flex-shrink-0">
          <Badge variant="secondary" className="w-14 justify-center">Lvl {node.level}</Badge>
          <Badge variant={node.has_invested ? "default" : "outline"} className="w-28 justify-center">
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