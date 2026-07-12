import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import * as authService from '../services/authService';
import { BiLock } from "react-icons/bi";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !email) {
    }
  }, [token, email]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be >= 6 chars');
    if (password !== confirm) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await authService.resetPassword(token, email, password);
      toast.success('Password reset. You can now log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">Reset password</h2>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600">Resetting password for <strong>{email || 'your account'}</strong></p>
          <div className="relative">
            <BiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="New password" required className="w-full border rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200" />
          </div>
          <div className="relative">
            <BiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" placeholder="Confirm password" required className="w-full border rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200" />
          </div>
          <div className="flex justify-between items-center">
            <button type="submit" disabled={loading} className="bg-red-500 text-white px-4 py-2 rounded-lg">Reset password</button>
            <button type="button" onClick={() => navigate('/login')} className="text-sm text-gray-500">Back to login</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
