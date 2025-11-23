import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, CreditCard } from 'lucide-react';

const ParentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Children',
      value: '0',
      description: 'Linked children',
      icon: Users,
    },
    {
      title: 'Active Bookings',
      value: '0',
      description: 'Current bookings',
      icon: Calendar,
    },
    {
      title: "This Month's Spend",
      value: '£0.00',
      description: 'Total spent',
      icon: CreditCard,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h1>
          <p className="text-muted-foreground">Manage your children's learning journey</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-4">
          <Button onClick={() => navigate('/children/add')}>Add Child</Button>
          <Button variant="outline" onClick={() => navigate('/tutors')}>Book Lesson</Button>
          <Button variant="outline" onClick={() => navigate('/payments')}>View Payments</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Children</CardTitle>
            <CardDescription>Manage your children's accounts and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No children added yet</p>
              <p className="text-sm text-muted-foreground mb-4">Add your first child to get started</p>
              <Button onClick={() => navigate('/children/add')}>Add Child</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ParentDashboard;
