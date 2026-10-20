import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, KeyRound, RefreshCw, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 2FA Step State
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleSubmitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMsg(null);
    setNoticeMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'লগইন ব্যর্থ হয়েছে');
      }

      if (data.requires2FA) {
        setIs2FAStep(true);
        setSessionToken(data.sessionToken);
        setMaskedEmail(data.maskedEmail || 'আপনার ইমেইলে');
        setNoticeMsg(data.notice || '৬ ডিজিটের ভেরিফিকেশন কোডটি আপনার ইমেইলে পাঠানো হয়েছে।');
      } else if (data.user) {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'পাসওয়ার্ড বা ইমেইল সঠিক নয়।');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setErrorMsg('৬ ডিজিটের সঠিক ভেরিফিকেশন কোডটি প্রদান করুন।');
      return;
    }

    setIsLoggingIn(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, otpCode: otpCode.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '২-ফ্যাক্টর ভেরিফিকেশন ব্যর্থ হয়েছে');
      }

      if (data.user) {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResend2FA = async () => {
    setIsResending(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken })
      });

      const data = await res.json();
      if (data.notice) {
        setNoticeMsg(data.notice);
      }
    } catch (err: any) {
      setErrorMsg('কোড রিসেন্ড করতে সমস্যা হয়েছে।');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 font-['Hind_Siliguri',sans-serif]">
      <div className="relative z-10 max-w-md w-full space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-600 shadow-md mb-1">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            MailCloud Pro Admin
          </h1>
          <p className="text-xs text-slate-500">
            বিজনেস ইমেইল হোস্টিং & এডমিন প্যানেল সিকিউর লগইন
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
          {!is2FAStep ? (
            /* STEP 1: EMAIL & PASSWORD */
            <form onSubmit={handleSubmitStep1} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  ইমেইল এড্রেস (Email Address)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  পাসওয়ার্ড (Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{isLoggingIn ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: 2FA EMAIL OTP VERIFICATION */
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-1 text-center pb-2 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-1 font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">২-ফ্যাক্টর নিরাপত্তা ভেরিফিকেশন (2FA)</h3>
                <p className="text-xs text-slate-500">
                  <strong className="font-mono text-slate-800">{maskedEmail}</strong> ইমেইলে পাঠানো ৬-ডিজিটের কোডটি লিখুন:
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 text-center">
                  ৬-ডিজিটের নিরাপত্তা কোড (6-digit OTP)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="8 4 9 2 0 1"
                  className="w-full bg-slate-50 border-2 border-orange-500/80 rounded-xl px-4 py-3 text-center text-lg tracking-[0.4em] font-mono font-extrabold text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>

              {noticeMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{noticeMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn || otpCode.length < 6}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{isLoggingIn ? 'ভেরিফাই হচ্ছে...' : 'ভেরিফাই ও প্রবেশ করুন'}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIs2FAStep(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ইমেইল/পাসওয়ার্ড পেজে ফিরুন</span>
                </button>

                <button
                  type="button"
                  onClick={handleResend2FA}
                  disabled={isResending}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center space-x-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>{isResending ? 'পাঠানো হচ্ছে...' : 'পুনরায় কোড পাঠান'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] leading-relaxed">
              ২-ফ্যাক্টর নিরাপত্তা সুরক্ষা সক্রিয়। আপনার ইমেইল ও এডমিন প্যানেল সম্পূর্ণ সুরক্ষিত।
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
