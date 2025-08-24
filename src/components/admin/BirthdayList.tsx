import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { BirthdayUser } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Cake, User } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "../ui/avatar";

const fetchBirthdays = async (): Promise<BirthdayUser[]> => {
  const { data, error } = await supabase.rpc('get_birthdays_this_month');
  if (error) throw new Error(error.message);
  return data;
};

export const BirthdayList = () => {
  const { data: users, isLoading } = useQuery<BirthdayUser[]>({
    queryKey: ['birthdaysThisMonth'],
    queryFn: fetchBirthdays,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cake className="h-5 w-5" />
          <CardTitle>This Month's Birthdays</CardTitle>
        </div>
        <CardDescription>Users celebrating their birthday this month.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </div>
            ))
          ) : users && users.length > 0 ? (
            users.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <Link to={`/admin/users?search=${user.id}`} className="flex items-center gap-4 group">
                  <Avatar>
                    <AvatarFallback>
                      <User />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium group-hover:underline">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(user.dob), "MMMM do")}</p>
                  </div>
                </Link>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No birthdays this month.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};