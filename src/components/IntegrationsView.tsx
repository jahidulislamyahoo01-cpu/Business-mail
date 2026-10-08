import React, { useState } from 'react';
import { HostingPlan, IntegrationSettings } from '../types';
import { Settings, Save, Server, Globe, Key, CheckCircle2, Shield, DollarSign, Check, Upload, Image as ImageIcon, Search, FileText, ExternalLink } from 'lucide-react';
import { BimiValidator } from './BimiValidator';

interface IntegrationsViewProps {
  plans: HostingPlan[];
  settings: IntegrationSettings;
  onSaveSettings: (settings: Partial<IntegrationSettings>) => Promise<void>;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  plans,
  settings,
  onSaveSettings
}) => {
  const [cfToken, setCfToken] = useState(settings.cloudflareApiToken || '');
  const [cfZone, setCfZone] = useState(settings.cloudflareZoneId || '');
  const [cpanelHost, setCpanelHost] = useState(settings.cpanelHost || '');
  const [cpanelUser, setCpanelUser] = useState(settings.cpanelUsername || '');
  const [cpanelToken, setCpanelToken] = useState(settings.cpanelApiToken || '');
  const [resendKey, setResendKey] = useState(settings.resendApiKey || '');
  const [resendKey2, setResendKey2] = useState(settings.resendApiKey2 || '');
  const [smtp2goKey, setSmtp2goKey] = useState(settings.smtp2goApiKey || '');
  const [brevoKey, setBrevoKey] = useState(settings.brevoApiKey || '');
  const [gmailUser, setGmailUser] = useState(settings.gmailUser || '');
  const [gmailPass, setGmailPass] = useState(settings.gmailAppPassword || '');
  const [defaultLogoUrl, setDefaultLogoUrl] = useState(settings.defaultLogoUrl || '');
  const [googleVerification, setGoogleVerification] = useState(settings.googleSiteVerification || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleGlobalLogoUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে ছবি (PNG, JPG, JPEG, WEBP, SVG) ফাইল নির্বাচন করুন।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      if (file.type === 'image/svg+xml' || file.size < 40000) {
        setDefaultLogoUrl(result);
        onSaveSettings({ defaultLogoUrl: result });
      } else {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 320;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/png', 0.9);
            setDefaultLogoUrl(compressed);
            onSaveSettings({ defaultLogoUrl: compressed });
          } else {
            setDefaultLogoUrl(result);
            onSaveSettings({ defaultLogoUrl: result });
          }
        };
        img.onerror = () => {
          setDefaultLogoUrl(result);
          onSaveSettings({ defaultLogoUrl: result });
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };
  const [saveSuccess, setSaveSavingSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      await onSaveSettings({
        cloudflareApiToken: cfToken,
        cloudflareZoneId: cfZone,
        cpanelHost,
        cpanelUsername: cpanelUser,
        cpanelApiToken: cpanelToken,
        resendApiKey: resendKey,
        resendApiKey2: resendKey2,
        smtp2goApiKey: smtp2goKey,
        brevoApiKey: brevoKey,
        gmailUser: gmailUser.trim(),
        gmailAppPassword: gmailPass.trim(),
        defaultLogoUrl: defaultLogoUrl.trim(),
        googleSiteVerification: googleVerification.trim()
      });

      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setTestResult(data.result || 'এপিআই কানেকশন ভ্যালিডেশন সম্পন্ন হয়েছে।');
    } catch (err: any) {
      setTestResult('টেস্ট ব্যর্থ হয়েছে: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  // 2FA Toggle State
  const [is2FA, setIs2FA] = useState(settings.is2FAEnabled === true);

  const handleToggle2FA = async (enabled: boolean) => {
    setIs2FA(enabled);
    await onSaveSettings({ is2FAEnabled: enabled });
  };

  // Change Password State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passNotice, setPassNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResetDefaultPass = async () => {
    setIsChangingPass(true);
    setPassNotice(null);
    try {
      const res = await fetch('/api/auth/reset-password-to-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: 'Admin#2026!Secret' })
      });
      const data = await res.json();
      setPassNotice({ type: 'success', text: 'পাসওয়ার্ড সফলভাবে ডিফল্ট (Admin#2026!Secret) এ রিসেট করা হয়েছে এবং ক্লাউড ডাটাবেসে সেভ হয়েছে!' });
    } catch (err: any) {
      setPassNotice({ type: 'error', text: 'রিসেট করতে ব্যর্থ হয়েছে: ' + err.message });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setPassNotice({ type: 'error', text: 'নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।' });
      return;
    }
    setIsChangingPass(true);
    setPassNotice(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
      }

      setPassNotice({ type: 'success', text: data.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err: any) {
      setPassNotice({ type: 'error', text: err.message });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({
        cloudflareApiToken: cfToken,
        cloudflareZoneId: cfZone,
        cpanelHost,
        cpanelUsername: cpanelUser,
        cpanelApiToken: cpanelToken,
        resendApiKey: resendKey,
        resendApiKey2: resendKey2,
        smtp2goApiKey: smtp2goKey,
        brevoApiKey: brevoKey,
        gmailUser: gmailUser.trim(),
        gmailAppPassword: gmailPass.trim(),
        defaultLogoUrl: defaultLogoUrl.trim(),
        googleSiteVerification: googleVerification.trim()
      });
      setSaveSavingSuccess(true);
      setTimeout(() => setSaveSavingSuccess(false), 3000);
    } catch (err) {
      alert('সেটিংস সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBimiLogo = async (logoUrl: string, svgContent: string) => {
    await onSaveSettings({
      bimiLogoUrl: logoUrl,
      bimiSvgContent: svgContent
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-2 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-orange-600" />
          <span>এপিআই ইন্টিগ্রেশন & ব্র্যান্ডিং কনফিগারেশন</span>
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm">
          Cloudflare API, Resend SMTP, এবং BIMI SVG Logo ভ্যালিডেশন কনফিগার করে আপনার বিজনেস ইমেইল শক্তিশালী করুন।
        </p>
      </div>

      {/* Admin Password Security Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">অ্যাডমিন পাসওয়ার্ড নিরাপত্তা (Admin Password Management)</h3>
            <p className="text-xs text-slate-500">আপনার অ্যাডমিন প্যানেলে লগইন করার পাসওয়ার্ড পরিবর্তন করে ক্লাউড ডাটাবেসে সেভ করুন</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                বর্তমান পাসওয়ার্ড (Current)
              </label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                নতুন পাসওয়ার্ড (New)
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="নতুন পাসওয়ার্ড (Min 6 chars)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                কনফার্ম পাসওয়ার্ড (Confirm)
              </label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="পাসওয়ার্ড পুনরায় টাইপ করুন"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {passNotice && (
            <div className={`p-3 rounded-xl border text-xs font-semibold ${
              passNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {passNotice.text}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500">বর্তমান সেট করা পাসওয়ার্ড:</span>
              <span className="font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                {settings.adminPassword || 'Admin#2026!Secret'}
              </span>
              <button
                type="button"
                onClick={handleResetDefaultPass}
                disabled={isChangingPass}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 underline ml-2"
              >
                ডিফল্ট (Admin#2026!Secret) এ রিসেট
              </button>
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs flex items-center space-x-2 disabled:opacity-50"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isChangingPass ? 'পরিবর্তন হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Two-Factor Authentication (2FA) Security Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">২-ফ্যাক্টর ইমেইল সিকিউরিটি (Two-Factor Email OTP 2FA)</h3>
              <p className="text-xs text-slate-500">প্রতিবার এডমিন লগইনে আপনার ইমেইলে ৬ ডিজিটের ওটিপি ভেরিফিকেশন কোড পাঠানোর নিয়ম</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              is2FA ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {is2FA ? '✓ 2FA Active (সুরক্ষিত)' : 'OFF (বন্ধ)'}
            </span>
            <button
              type="button"
              onClick={() => handleToggle2FA(!is2FA)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                is2FA
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {is2FA ? '2FA বন্ধ করুন' : '2FA চালু করুন'}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          ২-ফ্যাক্টর নিরাপত্তা চালু থাকলে প্রতিবার লগইনে আপনার ভেরিফায়েড ইমেইলে (<strong className="font-mono text-slate-900">jahidulislamyahoo01@gmail.com</strong>) ৬ ডিজিটের নিরাপত্তা ওটিপি পাঠানো হবে।
        </p>
      </div>

      {/* Global Email Logo Branding Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">ডিফল্ট ব্র্যান্ড লোগো ফটো (Global Email Logo Settings)</h3>
            <p className="text-xs text-slate-500">আপনার ইমেইলে ব্যবহারের জন্য সরাসরি ফটো (PNG, JPG, WEBP) সিলেক্ট করে সেভ করুন</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              ১. সরাসরি লোগো ফটো ফাইল আপলোড করুন (Direct Image Upload):
            </label>
            <div className="flex items-center space-x-3">
              <label className="cursor-pointer px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center space-x-2 shadow-xs">
                <ImageIcon className="w-4 h-4" />
                <span>গ্যালারি/পিসি থেকে ফটো সিলেক্ট করুন</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleGlobalLogoUpload(file);
                  }}
                />
              </label>

              {defaultLogoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setDefaultLogoUrl('');
                    onSaveSettings({ defaultLogoUrl: '' });
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 bg-rose-50 border border-rose-200 rounded-xl"
                >
                  লোগো মুছে ফেলুন
                </button>
              )}
            </div>
          </div>

          {defaultLogoUrl && (
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex items-center space-x-3">
              <div className="w-12 h-12 bg-slate-950 rounded-lg border border-amber-500/40 p-1 flex items-center justify-center shrink-0">
                <img
                  src={defaultLogoUrl}
                  alt="Logo Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <span className="text-emerald-400 font-bold block flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ডিফল্ট লোগো ফাইল প্রস্তুত ও সেভ করা রয়েছে</span>
                </span>
                <span className="text-slate-400 text-[10px] truncate block font-mono">
                  {defaultLogoUrl.startsWith('data:') ? '✓ ফটো ফাইল সরাসরি যুক্ত হয়েছে (Direct Data Image)' : defaultLogoUrl}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              অথবা অনলাইন লোগো ছবির লিঙ্ক (Image URL):
            </label>
            <input
              type="url"
              value={defaultLogoUrl}
              onChange={(e) => setDefaultLogoUrl(e.target.value)}
              placeholder="https://giftghor.world/images/logo.png"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* BIMI Logo Uploader & SVG Tiny PS Validator */}
      <BimiValidator
        currentLogoUrl={settings.bimiLogoUrl}
        onSaveLogo={handleSaveBimiLogo}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cloudflare API Integration Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cloudflare API Connector</h3>
              <p className="text-xs text-slate-500">অটোমেটিক DNS MX/SPF/BIMI রেকর্ড সিঙ্ক করার জন্য</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cloudflare API Token
              </label>
              <input
                type="password"
                value={cfToken}
                onChange={(e) => setCfToken(e.target.value)}
                placeholder="v1.0-xxxx-xxxx-xxxx"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cloudflare Zone ID
              </label>
              <input
                type="text"
                value={cfZone}
                onChange={(e) => setCfZone(e.target.value)}
                placeholder="023e105f4ecef2280f2d2426e477c77f"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Resend Real Email SMTP Integration Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Resend.com Transactional Email API Keys (মাল্টি-ডোমেইন সাপোর্ট)</h3>
              <p className="text-xs text-slate-500">আপনার প্রতিটি কাস্টম ডোমেইনের নিজস্ব Resend API Key যুক্ত করুন। সিস্টেম ডোমেইন অনুযায়ী স্বয়ংক্রিয়ভাবে সঠিক কি (Key) বেছে নেবে।</p>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
            <div className="font-semibold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Render Environment Variable ইন্টিগ্রেশন সক্রিয়:</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed font-mono">
              • ১ম ডোমেইন (<span className="font-bold">giftghor.world</span>): <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">RESEND_API_KEY</span><br/>
              • ২য় ডোমেইন (<span className="font-bold">giftghorbd.com</span>): <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">RESEND_API_KEY_2</span>
            </p>
            <p className="text-[11px] text-slate-600 pt-1">
              * নোট: প্রতি ডোমেইনের ইমেইল পাঠাতে এখন সরাসরি সংশ্লিষ্ট ডোমেইনের ভেরিফাইড কী ব্যবহৃত হবে। কখনো resend.dev এ ভুলবশত যাবে না।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                ১ম ডোমেইন Resend Key (Primary - giftghor.world)
              </label>
              <input
                type="password"
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                placeholder="re_123456789_abcdef... (বা Render: RESEND_API_KEY)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Render env: RESEND_API_KEY</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                ২য় ডোমেইন Resend Key (Secondary - giftghorbd.com)
              </label>
              <input
                type="password"
                value={resendKey2}
                onChange={(e) => setResendKey2(e.target.value)}
                placeholder="re_987654321_fedcba... (বা Render: RESEND_API_KEY_2)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Render env: RESEND_API_KEY_2</span>
            </div>
          </div>
        </div>

        {/* SMTP2GO API Key Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">SMTP2GO API Key (মাসে ১,০০০টি ফ্রি ইমেইল)</h3>
              <p className="text-xs text-slate-500">ইনস্ট্যান্ট হাই-স্পিড ইমেইল ডেলিভারি ও অটোমেটিক ব্যাকআপের জন্য</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              SMTP2GO API Key (api-...)
            </label>
            <input
              type="password"
              value={smtp2goKey}
              onChange={(e) => setSmtp2goKey(e.target.value)}
              placeholder="api-1234567890abcdef..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {/* Brevo (Sendinblue) API Key Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Brevo (Sendinblue) API Key (মাসে ৯,০০০টি ফ্রি ইমেইল)</h3>
              <p className="text-xs text-slate-500">Resend এর সাথে ব্যাকআপ ও লোড-ব্যালেন্স হিসেবে ব্যবহারের জন্য</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Brevo API Key (xkeysib-...)
            </label>
            <input
              type="password"
              value={brevoKey}
              onChange={(e) => setBrevoKey(e.target.value)}
              placeholder="xkeysib-1234567890abcdef..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {/* Gmail App Password SMTP Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gmail App Password SMTP (মাসে ১৫,০০০টি ফ্রি ইমেইল)</h3>
              <p className="text-xs text-slate-500">জিমেইল সিকিউরিটির ১৬-অক্ষরের অ্যাপ পাসওয়ার্ড দিয়ে বিনামূল্যে ইমেইল সেন্ড করুন</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                আপনার Gmail Address
              </label>
              <input
                type="email"
                value={gmailUser}
                onChange={(e) => setGmailUser(e.target.value)}
                placeholder="mycompany@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Gmail App Password (16-digit Passcode)
              </label>
              <input
                type="password"
                value={gmailPass}
                onChange={(e) => setGmailPass(e.target.value)}
                placeholder="abcd efgh ijkl mnop"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            💡 Google Security → 2-Step Verification ON → App Passwords সেকশন থেকে ১৬-ডিজিটের অ্যাপ পাসওয়ার্ড জেনারেট করে এখানে সেভ করুন।
          </p>
        </div>

        {/* cPanel UAPI Integration Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">cPanel UAPI Connector</h3>
              <p className="text-xs text-slate-500">cPanel ওয়েব সার্ভারের সাথে ইমেইল ও ডোমেন অ্যাকাউন্ট কানেক্ট করতে</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                cPanel Host URL
              </label>
              <input
                type="text"
                value={cpanelHost}
                onChange={(e) => setCpanelHost(e.target.value)}
                placeholder="https://cpanel.yourdomain.com:2083"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                cPanel Username
              </label>
              <input
                type="text"
                value={cpanelUser}
                onChange={(e) => setCpanelUser(e.target.value)}
                placeholder="root / myusername"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                cPanel API Token
              </label>
              <input
                type="password"
                value={cpanelToken}
                onChange={(e) => setCpanelToken(e.target.value)}
                placeholder="token_key..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Google Search Console & SEO Search Engine Optimization Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">গুগল সার্চ ইঞ্জিন ইন্ডেক্সিং &amp; SEO সেটিংস</h3>
                <p className="text-xs text-slate-500">Google Search-এ আপনার সাইট (giftghor.world / giftghorbd.com) র‍্যাংক ও সার্চে যুক্ত করার জন্য</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              SEO Enabled
            </span>
          </div>

          {/* Active SEO Infrastructure Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>robots.txt</span>
                <span className="text-emerald-600 font-extrabold">✓ Active</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">/robots.txt (Allow Googlebot)</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>sitemap.xml</span>
                <span className="text-emerald-600 font-extrabold">✓ Live</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">/sitemap.xml (XML Map)</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Schema.org Data</span>
                <span className="text-emerald-600 font-extrabold">✓ Injected</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">JSON-LD Structured Schema</p>
            </div>
          </div>

          {/* Google Verification Meta Tag Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Google Search Console Verification Code / Tag</span>
              <span className="text-[11px] text-blue-600 font-sans font-medium">google-site-verification</span>
            </label>
            <input
              type="text"
              value={googleVerification}
              onChange={(e) => setGoogleVerification(e.target.value)}
              placeholder='যেমন: google-site-verification=XYZ... অথবা মেটা ট্যাগ'
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              গুগল সার্চ কনসোল থেকে দেওয়া HTML Tag বা Verification Code দিয়ে নিচে "সেটিংস সেভ করুন" এ চাপ দিন।
            </span>
          </div>

          {/* How to add to Google Search Console Instructions */}
          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2 text-xs text-blue-950">
            <h4 className="font-bold flex items-center space-x-1.5 text-blue-900">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>গুগল সার্চে আপনার সাইট যুক্ত করার ৫টি ধাপ:</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 leading-relaxed font-sans pl-1">
              <li>গুগলের ওয়েবসাইট <strong><a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-blue-700 underline font-bold">Google Search Console</a></strong> এ যান।</li>
              <li>আপনার কাস্টম ডোমেইন (যেমন: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-blue-900">https://giftghor.world</code>) ইউআরএল প্রেফিক্সে দিন।</li>
              <li>HTML Tag ভেরিফিকেশন কোডটি কপি করে উপরে বসিয়ে নিচে <strong>"সেটিংস সেভ করুন"</strong> বাটনে চাপ দিন (অথবা Cloudflare DNS-এ TXT রেকর্ড বসান)।</li>
              <li>Search Console-এ <strong>Sitemaps</strong> সেকশনে আপনার সাইটম্যাপ দিন: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-blue-900">https://giftghor.world/sitemap.xml</code></li>
              <li>সবশেষে <strong>URL Inspection</strong> বাটনে আপনার ডোমেইন দিয়ে <strong>"Request Indexing"</strong> এ চাপ দিন। ২৪-৪৮ ঘণ্টার মধ্যে গুগল আপনার সাইট ইন্ডেক্স করে সার্চে দেখাবে!</li>
            </ol>
          </div>
        </div>

        {testResult && (
          <div className="p-4 rounded-xl bg-slate-900 text-white text-xs space-y-1 shadow-sm font-mono border border-slate-800">
            <div className="flex items-center space-x-2 font-bold text-orange-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>এপিআই কানেকশন টেস্ট রেজাল্ট:</span>
            </div>
            <p className="text-slate-200 leading-relaxed">{testResult}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {saveSuccess ? (
            <div className="text-xs text-emerald-700 font-bold flex items-center space-x-1">
              <Check className="w-4 h-4" />
              <span>ইন্টিগ্রেশন সেটিংস সফলভাবে সেভ করা হয়েছে!</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">সেটিংস সেভ করার সাথে সাথে সার্ভারে অ্যাপ্লাই হবে</span>
          )}

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Server className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'টেস্ট হচ্ছে...' : '⚡ Test API Connection'}</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'সেভ হচ্ছে...' : 'সেটিংস সেভ করুন'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
