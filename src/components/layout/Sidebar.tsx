import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Home,
  Package2,
  Users,
  LineChart,
  HandCoins,
  Wallet,
  Landmark,
  LifeBuoy,
  ShieldCheck,
  FileText,
  Settings,
  FileDown,
  MessageSquareQuote,
  UserCog,
  History,
  Network,
  GanttChartSquare,
  UserPlus,
  FilePieChart,
  LogOut,
  User,
  Building,
  FileKey2,
  Newspaper,
  ShieldQuestion,
  CreditCard,
  FileSliders,
  FileClock,
  FileBarChart,
  FileCheck2,
  FileX2,
  FileQuestion,
  FileSearch,
  FileCog,
  FileDiff,
  FileJson,
  FileTerminal,
  FileBox,
  FileArchive,
  FileBadge,
  FileKey,
  FileLock,
  FilePlus,
  FileMinus,
  FileUp,
  FileDown as FileDownIcon,
  FileText as FileTextIcon,
  FileCode,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileArchive as FileArchiveIcon,
  File as FileIcon,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderMinus,
  FolderCog,
  FolderSearch,
  FolderLock,
  FolderKey,
  FolderSymlink,
  FolderGit2,
  FolderGit,
  FolderInput,
  FolderOutput,
  FolderDown,
  FolderUp,
  FolderClock,
  FolderCheck,
  FolderX,
  FileQuestion as FolderQuestion, // Corrected import
  FolderHeart,
  FolderKanban,
  FolderSync,
  FolderTree,
  FolderDot,
  FolderClosed,
  FolderArchive,
  FolderGit as FolderGitIcon,
  FolderGit2 as FolderGit2Icon,
  FolderSymlink as FolderSymlinkIcon,
  FolderKey as FolderKeyIcon,
  FolderLock as FolderLockIcon,
  FolderSearch as FolderSearchIcon,
  FolderCog as FolderCogIcon,
  FolderMinus as FolderMinusIcon,
  FolderPlus as FolderPlusIcon,
  FolderOpen as FolderOpenIcon,
  Folder as FolderIcon,
  File as FileIcon2,
  FileArchive as FileArchiveIcon2,
  FileSpreadsheet as FileSpreadsheetIcon,
  FileAudio as FileAudioIcon,
  FileVideo as FileVideoIcon,
  FileImage as FileImageIcon,
  FileCode as FileCodeIcon,
  FileTextIcon as FileTextIcon2,
  FileDown as FileDownIcon2,
  FileUp as FileUpIcon,
  FileMinus as FileMinusIcon,
  FilePlus as FilePlusIcon,
  FileLock as FileLockIcon,
  FileKey as FileKeyIcon,
  FileBadge as FileBadgeIcon,
  FileArchive as FileArchiveIcon3,
  FileBox as FileBoxIcon,
  FileTerminal as FileTerminalIcon,
  FileJson as FileJsonIcon,
  FileDiff as FileDiffIcon,
  FileCog as FileCogIcon,
  FileSearch as FileSearchIcon,
  FileQuestion as FileQuestionIcon,
  FileX2 as FileX2Icon,
  FileCheck2 as FileCheck2Icon,
  FileBarChart as FileBarChartIcon,
  FileClock as FileClockIcon,
  FileSliders as FileSlidersIcon,
  CreditCard as IdIcon, // Corrected import
  ShieldQuestion as ShieldQuestionIcon,
  Newspaper as NewspaperIcon,
  FileKey2 as FileKey2Icon,
  Building as BuildingIcon,
  User as UserIcon,
  LogOut as LogOutIcon,
  FilePieChart as FilePieChartIcon,
  UserPlus as UserPlusIcon,
  GanttChartSquare as GanttChartSquareIcon,
  Network as NetworkIcon,
  History as HistoryIcon,
  UserCog as UserCogIcon,
  MessageSquareQuote as MessageSquareQuoteIcon,
  FileDown as FileDownIcon3,
  Settings as SettingsIcon,
  FileText as FileTextIcon3,
  ShieldCheck as ShieldCheckIcon,
  LifeBuoy as LifeBuoyIcon,
  Landmark as LandmarkIcon,
  Wallet as WalletIcon,
  HandCoins as HandCoinsIcon,
  LineChart as LineChartIcon,
  Users as UsersIcon,
  Home as HomeIcon,
  Bell as BellIcon,
  Package2 as Package2Icon,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useAdminActionCounts } from "@/hooks/useAdminActionCounts";
import { cn } from "@/lib/utils";

const NavLink = ({ to, icon: Icon, children, badgeCount }: { to: string; icon: React.ElementType; children: React.ReactNode; badgeCount?: number }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
        isActive && "bg-muted text-primary"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
          {badgeCount}
        </span>
      )}
    </Link>
  );
};

export const Sidebar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const counts = useAdminActionCounts();

  const totalPendingRequests = (counts?.pendingDepositsCount ?? 0) + (counts?.pendingWithdrawalsCount ?? 0) + (counts?.pendingKycCount ?? 0) + (counts?.pendingInvestmentWithdrawalsCount ?? 0);

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/logo.png" alt="SJA Logo" className="h-10 w-auto" />
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {isAdmin ? (
              <>
                <NavLink to="/admin/dashboard" icon={HomeIcon}>Dashboard</NavLink>
                <NavLink to="/admin/users" icon={UsersIcon}>Users</NavLink>
                <NavLink to="/admin/investments" icon={LandmarkIcon}>Investments</NavLink>
                <NavLink to="/admin/requests" icon={FileClock} badgeCount={totalPendingRequests}>Requests</NavLink>
                <NavLink to="/admin/reports" icon={FilePieChartIcon}>Reports</NavLink>
                <NavLink to="/admin/support" icon={LifeBuoyIcon} badgeCount={counts?.openTicketsCount}>Support</NavLink>
                <NavLink to="/admin/settings" icon={SettingsIcon}>System</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" icon={HomeIcon}>Dashboard</NavLink>
                <NavLink to="/investments" icon={LandmarkIcon}>Investments</NavLink>
                <NavLink to="/wallet" icon={WalletIcon}>Wallet</NavLink>
                <NavLink to="/withdrawals" icon={HandCoinsIcon}>Withdrawals</NavLink>
                <NavLink to="/referrals" icon={UsersIcon}>Referrals</NavLink>
                <NavLink to="/income" icon={LineChartIcon}>Income</NavLink>
                <NavLink to="/support" icon={LifeBuoyIcon}>Support</NavLink>
              </>
            )}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-8 w-8 rounded-full bg-muted p-1" />
            <div>
              <p className="text-sm font-semibold leading-none">{user?.email}</p>
              <p className="text-xs text-muted-foreground">{isAdmin ? 'Administrator' : 'Member'}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};