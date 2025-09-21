import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wallet,
  Share2,
  UserCircle,
  LifeBuoy,
  Shield,
  Settings,
  Receipt,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const userNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/investments', icon: Briefcase, label: 'Investments' },
  { href: '/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/referrals', icon: Share2, label: 'My Network' },
  { href: '/profile', icon: UserCircle, label: 'Profile' },
  { href: '/support', icon: LifeBuoy, label: 'Support' },
];

const adminNavItems = [
  { href: '/admin/dashboard', icon: Shield, label: 'Admin Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/deposits', icon: ArrowDownToLine, label: 'Deposits' },
  { href: '/admin/withdrawals', icon: ArrowUpFromLine, label: 'Withdrawals' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <nav className="flex flex-col space-y-1 px-2">
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white',
              isActive && 'bg-gray-900 text-white'
            )
          }
        >
          <item.icon className="mr-3 h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}