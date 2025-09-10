import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalCount: number; // Fix: Added missing prop
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const PaginationControls = ({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  hasPreviousPage,
  hasNextPage,
}: PaginationControlsProps) => {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
      >
        <ChevronLeft className="h-4 w-4 mr-2" /> Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {Math.ceil(totalCount / pageSize)}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
      >
        Next <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
};