import { Navigate } from 'react-router-dom';

// Index redirects to Landing
export default function Index() {
  return <Navigate to="/" replace />;
}
