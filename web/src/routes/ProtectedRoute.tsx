import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, hasRole } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
  minRole?: string;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<Props> = ({ children, minRole, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/not-authorized" replace />;
  }

  if (minRole && !hasRole(user.role, minRole)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
};
