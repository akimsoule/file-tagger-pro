import { Navigate } from 'react-router-dom';
import { useUser } from '@/hooks/useUser';

interface Props { children: JSX.Element }
export function ProtectedRoute({ children }: Props) {
  const { session } = useUser();
  if (session.isLoading) return null;
  if (!session.isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
