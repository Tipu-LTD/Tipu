import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';

const dashboardMap: Record<UserRole, string> = {
  student: '/dashboard/student',
  tutor: '/dashboard/tutor',
  parent: '/dashboard/parent',
  admin: '/dashboard/admin'
};

const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={dashboardMap[user.role]} replace />;
};

export default DashboardRouter;
