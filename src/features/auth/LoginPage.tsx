import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, login, error, clearError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && profile) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, profile, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!email || !password) {
      setValidationError('Please fill in all credentials.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      // Errors are already stored in Context error and displayed, but we catch to stop loading
      console.error('Login action failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-canvas via-canvas-parchment to-canvas flex flex-col justify-center py-section px-lg relative overflow-hidden select-none font-text text-ink safe-top safe-bottom safe-left safe-right">
      
      {/* Background ambient lighting effects */}
      <div className="absolute w-[360px] h-[360px] rounded-full bg-primary/5 blur-3xl -top-[120px] -right-[120px]"></div>
      <div className="absolute w-[440px] h-[440px] rounded-full bg-primary/5 blur-3xl -bottom-[200px] -left-[200px]"></div>

      <div className="max-w-[400px] w-full mx-auto space-y-lg z-10 animate-fade-in">
        
        {/* Logo and Tagline */}
        <div className="text-center space-y-xs">
          <div className="inline-flex w-[48px] h-[48px] rounded-full bg-ink-muted8 text-primary items-center justify-center border border-hairline">
            <Shield className="w-[20px] h-[20px]" />
          </div>
          <div className="space-y-xxs">
            <h1 className="text-display-sm font-semibold tracking-tight">NEXUS Network</h1>
            <p className="text-caption-spec text-ink-muted48">Authorized Operations CRM Portal</p>
          </div>
        </div>

        {/* Login Glass Card */}
        <div className="bg-canvas/60 backdrop-blur-md border border-hairline rounded-lg shadow-product-surface p-lg space-y-md">
          <form onSubmit={handleSubmit} className="space-y-sm">
            
            {/* Email Field */}
            <div className="space-y-xxs">
              <label className="text-caption-strong text-ink font-semibold" htmlFor="email">
                Session Email
              </label>
              <div className="relative">
                <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-ink-muted32">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={isSubmitting}
                  className="w-full bg-canvas border border-hairline rounded-md pl-[36px] pr-sm py-[8px] text-[13px] text-ink placeholder-ink-muted32 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition duration-150"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-xxs">
              <label className="text-caption-strong text-ink font-semibold" htmlFor="password">
                Security Password
              </label>
              <div className="relative">
                <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-ink-muted32">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full bg-canvas border border-hairline rounded-md pl-[36px] pr-[40px] py-[8px] text-[13px] text-ink placeholder-ink-muted32 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 text-ink-muted48 hover:text-ink transition p-[4px] rounded focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error notifications */}
            {(validationError || error) && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/25 rounded-md p-sm text-micro-legal text-red-600 dark:text-red-400 flex items-start gap-xs animate-shake">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="leading-tight">
                  <p className="font-semibold">Verification Alert</p>
                  <p>{validationError || error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full apple-btn-primary flex items-center justify-center py-[10px] select-none active:scale-[0.98] transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-xs" />
                  Verifying Identity...
                </>
              ) : (
                'Enter Dashboard'
              )}
            </button>

          </form>
        </div>

        {/* Footer legal note */}
        <p className="text-[11px] text-ink-muted32 text-center max-w-[280px] mx-auto leading-relaxed">
          Access is limited to authorized administrators. Login actions are cryptographically verified and audited server-side.
        </p>

      </div>
    </div>
  );
};
