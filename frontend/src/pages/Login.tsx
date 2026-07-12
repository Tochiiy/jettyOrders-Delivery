import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import { FcGoogle } from 'react-icons/fc';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { BiEnvelope, BiLock, BiUser } from "react-icons/bi";
import { useAppData } from '../context/AppContext';
import * as authService from '../services/authService';
import MarketingCarousel from '../components/MarketingCarousel';

const Login = () => {

    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'oauth'|'login'|'signup'|'forgot'>('oauth');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();
    const { setUser, setIsAuth } = useAppData();
    
    const redirectAfterAuth = (userRole?: string | null) => {
        if (!userRole) {
            navigate("/select-role", { replace: true });
        } else {
            navigate("/", { replace: true });
        }
    };

    const responseGoogle = async (credentialResponse: any) => {
        setLoading(true);

        try {
            const result = await authService.loginWithGoogle(credentialResponse.code);

            localStorage.setItem("token", result.data.token);
            toast.success(result.data.message);
            setUser(result.data.user);
            setIsAuth(true);
            redirectAfterAuth(result.data.user?.role);

        } catch (error) {
            toast.error("There was an error logging in. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    const googleLogin = useGoogleLogin({
        onSuccess: responseGoogle,
        onError: () => {
            toast.error("Google sign-in failed");
            setLoading(false);
        },
        flow: "auth-code",
    })

    const handleEmailLogin = async (e?: any) => {
        e?.preventDefault();
        setLoading(true);
        try {
            const res = await authService.login(email, password);
            localStorage.setItem('token', res.data.token);
            toast.success(res.data.message);
            setUser(res.data.user);
            setIsAuth(true);
            redirectAfterAuth(res.data.user?.role);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Login failed');
        } finally { setLoading(false); }
    }

    const handleSignup = async (e?: any) => {
        e?.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            const res = await authService.register(name, email, password);
            localStorage.setItem('token', res.data.token);
            toast.success(res.data.message);
            setUser(res.data.user);
            setIsAuth(true);
            redirectAfterAuth(res.data.user?.role);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Sign up failed');
        } finally { setLoading(false); }
    }

    const handleForgot = async (e?: any) => {
        e?.preventDefault();
        setLoading(true);
        try {
            const res = await authService.forgotPassword(forgotEmail);
            if (res.data.token) {
                toast.success('Reset token generated (dev).');
                console.info('Reset token:', res.data.token);
            } else {
                toast.success(res.data.message || 'If that email exists, a reset link was sent');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Request failed');
        } finally { setLoading(false); }
    }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-white">
      <div className="absolute inset-0">
        <MarketingCarousel height="100vh" autoplay />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-[32px] border border-white/15 bg-white/90 px-8 py-10 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="space-y-5 text-slate-900">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                <span className="text-[#E23744]">jetty</span>
                <span className="text-slate-900">Orders-Delivery</span>
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                Sign in or create your account to manage orders, menus, and delivery workflows.
              </p>
            </div>

            {mode === 'oauth' && (
              <div className="space-y-4">
                <button
                  onClick={googleLogin}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <FcGoogle size={20} />
                  <span>{loading ? 'Signing in... Please wait' : 'Continue with Google'}</span>
                </button>
                <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <button onClick={() => setMode('login')} className="underline">
                    Sign in with email
                  </button>
                  <button onClick={() => setMode('signup')} className="underline">
                    Create account
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="relative">
                  <BiEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    required
                    className="w-full border rounded-3xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div className="relative">
                  <BiLock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full border rounded-3xl pl-12 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-3xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    Sign in
                  </button>
                  <button type="button" onClick={() => setMode('oauth')} className="text-sm text-slate-600">
                    Back
                  </button>
                </div>
                <div className="text-right">
                  <button type="button" onClick={() => setMode('forgot')} className="text-sm text-slate-600 underline">
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="relative">
                  <BiUser className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    required
                    className="w-full border rounded-3xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div className="relative">
                  <BiEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    required
                    className="w-full border rounded-3xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                  />
                </div>
                <div className="relative">
                  <BiLock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="w-full border rounded-3xl pl-12 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="relative">
                  <BiLock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="w-full border rounded-3xl pl-12 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-3xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    Create account
                  </button>
                  <button type="button" onClick={() => setMode('oauth')} className="text-sm text-slate-600">
                    Back
                  </button>
                </div>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <input
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Email for password reset"
                  type="email"
                  required
                  className="w-full border rounded-3xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-3xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    Send reset
                  </button>
                  <button type="button" onClick={() => setMode('login')} className="text-sm text-slate-600">
                    Back
                  </button>
                </div>
              </form>
            )}

            <p className="text-center text-sm text-slate-500">
              By continuing, you agree to our <span className="text-[#E23774]">Terms of Service</span> &{' '}
              <span className="text-[#E23774]">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login
