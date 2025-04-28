import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertCircle } from 'lucide-react';
import ThreeBackground from '../components/three/ThreeBackground';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDummyCredentials, setShowDummyCredentials] = useState(false);
  const { signIn, loading, error } = useAuth();
  // const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const handleDemoLogin = async () => {
    const demoEmail = 'demo@example.com';
    const demoPassword = 'password123';
    
    setEmail(demoEmail);
    setPassword(demoPassword);
    await signIn(demoEmail, demoPassword);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-900">
      <ThreeBackground />
      
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl dark:bg-gray-800/30">
          <div className="p-8">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white">
                <Shield size={32} />
              </div>
            </div>
            
            <h2 className="mb-2 text-center text-3xl font-bold text-white">Linux Log Guardian</h2>
            <p className="mb-8 text-center text-gray-300">
              Sign in to access your system logs
            </p>
            
            {error && (
              <div className="mb-4 rounded-md bg-red-500/20 p-3 text-sm text-red-200">
                <div className="flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  {error}
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-600 bg-gray-700/50 p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-600 bg-gray-700/50 p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Enter your password"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white shadow-lg transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <div className="mt-6">
              <button
                onClick={() => setShowDummyCredentials(!showDummyCredentials)}
                className="mb-2 w-full text-center text-sm text-gray-400 hover:text-white"
              >
                {showDummyCredentials ? 'Hide' : 'Show'} Demo Credentials
              </button>
              
              {showDummyCredentials && (
                <div className="mb-4 rounded-md bg-gray-700/50 p-3 text-sm text-gray-300">
                  <p><strong>Email:</strong> demo@example.com</p>
                  <p><strong>Password:</strong> password123</p>
                </div>
              )}
              
              <button
                onClick={handleDemoLogin}
                className="w-full rounded-lg border border-gray-600 bg-gray-700/30 px-4 py-2 text-center text-sm font-medium text-gray-300 transition-all hover:bg-gray-600"
              >
                Login with Demo Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;