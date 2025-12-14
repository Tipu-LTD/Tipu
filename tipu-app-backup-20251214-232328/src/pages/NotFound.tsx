import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const getDashboardLink = () => {
    if (!user) return "/";

    const dashboardMap = {
      student: "/dashboard/student",
      tutor: "/dashboard/tutor",
      parent: "/dashboard/parent",
      admin: "/dashboard/admin"
    };

    return dashboardMap[user.role] || "/";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <p className="text-2xl font-semibold">Page Not Found</p>
          <p className="text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or hasn't been implemented yet.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          {user ? (
            <>
              <Button asChild size="lg">
                <Link to={getDashboardLink()}>Go to Dashboard</Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link to="/">Go to Home</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/">Return to Home</Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link to="/login">Login</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
