import { useNavigate } from 'react-router-dom';
import AuthPanel from '../components/AuthPanel.jsx';

function LoginPage() {
  const navigate = useNavigate();

  function handleAuthenticated() {
    navigate('/dashboard');
  }

  return <AuthPanel onAuthenticated={handleAuthenticated} />;
}

export default LoginPage;
