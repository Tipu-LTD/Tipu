import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  Calendar,
  MessageSquare,
  BookOpen,
  Bell,
  DollarSign,
  CreditCard,
  Building,
  BarChart,
} from 'lucide-react';
import { UserRole } from '@/types/user';
import { isAdult } from '@/utils/age';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const staticNavigationByRole: Record<Exclude<UserRole, 'student'>, NavItem[]> = {
  tutor: [
    { to: '/dashboard/tutor', icon: Home, label: 'Dashboard' },
    { to: '/bookings/requests', icon: Bell, label: 'Booking Requests' },
    { to: '/bookings/schedule', icon: Calendar, label: 'My Schedule' },
    { to: '/dashboard/students', icon: Users, label: 'My Students' },
    // TODO: Implement chat system
    // { to: '/chat', icon: MessageSquare, label: 'Messages' },
    // TODO: Implement resources library
    // { to: '/resources', icon: BookOpen, label: 'Resources' },
    // TODO: Implement earnings/payment history page
    // { to: '/earnings', icon: DollarSign, label: 'Earnings' },
  ],
  parent: [
    { to: '/dashboard/parent', icon: Home, label: 'Dashboard' },
    { to: '/bookings', icon: Calendar, label: 'Bookings' },
    // TODO: Implement chat system
    // { to: '/chat', icon: MessageSquare, label: 'Messages' },
    // TODO: Implement payment history page
    // { to: '/payments', icon: CreditCard, label: 'Payment History' },
  ],
  admin: [
    { to: '/dashboard/admin', icon: Home, label: 'Dashboard' },
    // TODO: Implement admin user management page
    // { to: '/admin/users', icon: Users, label: 'Users' },
    // TODO: Implement admin bookings overview page
    // { to: '/admin/bookings', icon: Calendar, label: 'Bookings' },
    // TODO: Implement admin resources management page
    // { to: '/admin/resources', icon: BookOpen, label: 'Resources' },
    // TODO: Implement school management page
    // { to: '/admin/schools', icon: Building, label: 'Schools' },
    // TODO: Implement analytics dashboard
    // { to: '/admin/analytics', icon: BarChart, label: 'Analytics' },
  ],
};

export function DashboardSidebar() {
  const { user } = useAuth();

  // Dynamic student navigation based on age
  const studentNavItems = useMemo((): NavItem[] => {
    if (!user || user.role !== 'student') return [];

    const userIsAdult = user.dateOfBirth ? isAdult(user.dateOfBirth) : false;

    const baseLinks: NavItem[] = [
      { to: '/dashboard/student', icon: Home, label: 'Dashboard' },
      { to: '/lessons', icon: BookOpen, label: 'Lessons' }
    ];

    // Only adults get booking management & tutor browsing
    if (userIsAdult) {
      baseLinks.push(
        { to: '/tutors', icon: Users, label: 'Browse Tutors' },
        { to: '/bookings', icon: Calendar, label: 'My Bookings' }
      );
    }

    // TODO: Implement chat system
    // if (userIsAdult) {
    //   baseLinks.push({ to: '/chat', icon: MessageSquare, label: 'Messages' });
    // }

    return baseLinks;
  }, [user]);

  if (!user) return null;

  const navItems = user.role === 'student'
    ? studentNavItems
    : staticNavigationByRole[user.role] || [];

  return (
    <aside className="w-64 border-r bg-card min-h-[calc(100vh-57px)]">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/bookings'}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-4 py-2 rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )
            }
          >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
