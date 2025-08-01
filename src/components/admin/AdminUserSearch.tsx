import * as React from "react"
import { Search, User } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { AdminUserView } from "@/types/database"
import { useDebounce } from "@/hooks/useDebounce"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "../ui/button"

interface AdminUserSearchProps {
  onUserSelect: (userId: string) => void;
}

const fetchUsers = async (searchTerm: string): Promise<AdminUserView[]> => {
  if (!searchTerm) return [];
  const { data, error } = await supabase.rpc('get_all_users_details', {
    search_text: searchTerm,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const AdminUserSearch = ({ onUserSelect }: AdminUserSearchProps) => {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const debouncedSearch = useDebounce(search, 300)

  const { data: users, isLoading } = useQuery<AdminUserView[]>({
    queryKey: ['adminUserSearch', debouncedSearch],
    queryFn: () => fetchUsers(debouncedSearch),
    enabled: !!debouncedSearch,
  });

  const handleSelect = (userId: string) => {
    onUserSelect(userId);
    setOpen(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-muted-foreground sm:w-64">
          <Search className="mr-2 h-4 w-4" />
          <span>Search user by name, email, ID...</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, email, or ID..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!debouncedSearch && <CommandEmpty>Type to start searching.</CommandEmpty>}
            {isLoading && debouncedSearch && <div className="py-6 text-center text-sm">Searching...</div>}
            <CommandGroup>
              {users?.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => handleSelect(user.id)}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p>{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <User className="h-4 w-4" />
                </CommandItem>
              ))}
            </CommandGroup>
            {debouncedSearch && !isLoading && users?.length === 0 && (
              <CommandEmpty>No users found.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};