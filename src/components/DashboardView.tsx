import React, { useState } from 'react';
import { Domain, Mailbox, User } from '../types';
import { Globe, Users, HardDrive, ShieldCheck, Plus, ArrowRight, CheckCircle2, AlertTriangle, Inbox, Sparkles, X, ExternalLink, Send } from 'lucide-react';

interface DashboardViewProps {
  user: User;
  domains: Domain[];
  mailboxes: Mailbox[];
  onAddDomain: (domainName: string) => Promise<void>;
  onGoToTab: (tab: string) => void;
  onOpenCompose?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  domains,
  mailboxes,
  onAddDomain,
  onGoToTab,
  onOpenCompose
}) => {
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showNotice, setShowNotice] = useState(true);

  const primaryDomain = domains[0]?.domainName || 'giftghor.world';

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainInput.trim()) return;
    setIsAdding(true);
    try {
      await onAddDomain(newDomainInput.trim());
      setNewDomainInput('');
      onGoToTab('domains');
    } catch (err: any) {
      alert(err.message || 'ডোমেইন যোগ করতে সমস্যা হয়েছে');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cloudflare Style Hero Header */}
      <div className="space-y-3 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-mono">
              {primaryDomain}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage custom email routing, DNS verification, and active mailboxes.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenCompose && (
              <button
                onClick={onOpenCompose}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md flex items-center space-x-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>মেইল পাঠান</span>
              </button>
            )}
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hidden sm:inline-block">
              DNS Setup: Full
            </span>
            <button
              onClick={() => onGoToTab('domains')}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs flex items-center space-x-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>DNS রেকর্ড</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cloudflare Style Amber Warning Callout Banner */}
      {showNotice && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-5 shadow-xs relative space-y-2">
          <button
            onClick={() => setShowNotice(false)}
            className="absolute top-4 right-4 text-amber-700 hover:text-amber-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start space-x-3 pr-8">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-900">
                Email Proxying & Route Protection Active
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Ensure your MX and SPF records are set to <strong className="font-semibold text-amber-950">DNS Only / Proxied</strong> in your domain provider table to benefit from DDoS protection, TLS security rules, and instant inbox routing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare Style Recommendation Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-900">Recommendations</h3>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              1
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-start space-x-3">
          <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
          <div className="space-y-1 flex-1">
            <h4 className="text-xs font-bold text-slate-900">
              Block fake emails sent from @{primaryDomain} addresses
            </h4>
            <p className="text-xs text-slate-600">
              Add a DMARC record so email providers can verify authentic messages sent from your domain and stop spoofing.
            </p>
            <button
              onClick={() => onGoToTab('domains')}
              className="text-xs font-bold text-slate-900 underline hover:text-orange-600 inline-block pt-1"
            >
              Add a DMARC record →
            </button>
          </div>
        </div>
      </div>

      {/* Grid Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">কাস্টম ডোমেইন</span>
            <Globe className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{domains.length}</span>
            <span className="text-xs text-emerald-600 font-bold">100% Active</span>
          </div>
          <p className="text-xs text-slate-500">
            প্রাইমারি ডোমেইন: <strong className="text-slate-800 font-mono">{primaryDomain}</strong>
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">সক্রিয় মেলবক্স</span>
            <Users className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">{mailboxes.length}</span>
            <span className="text-xs text-slate-500">টি ইমেইল এড্রেস</span>
          </div>
          <p className="text-xs text-slate-500">
            মূল মেলবক্স: <strong className="text-slate-800 font-mono">{mailboxes[0]?.address || 'contact@giftghor.world'}</strong>
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">স্টোরেজ একসেস</span>
            <HardDrive className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">25 GB</span>
            <span className="text-xs text-emerald-600 font-bold">$0 Free Plan</span>
          </div>
          <p className="text-xs text-slate-500">
            Google Firestore + Disk Sync Active
          </p>
        </div>
      </div>

      {/* Add New Domain Quick Input Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">নতুন ডোমেইন যুক্ত করুন</h3>
        <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={newDomainInput}
            onChange={(e) => setNewDomainInput(e.target.value)}
            placeholder="Search or enter domain name (e.g. brand.com)"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-mono"
          />
          <button
            type="submit"
            disabled={isAdding}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>ডোমেন কানেক্ট করুন</span>
          </button>
        </form>
      </div>

      {/* Active Domain Management Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">সংযুক্ত কাস্টম ডোমেইনসমূহ</h3>
          <button
            onClick={() => onGoToTab('domains')}
            className="text-xs font-semibold text-orange-600 hover:underline flex items-center space-x-1"
          >
            <span>DNS রেকর্ডস দেখুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {domains.map((dom) => (
            <div key={dom.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-900 font-mono text-base">{dom.domainName}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  MX Verified: {dom.mxVerified ? '✓ Verified' : 'Pending'} | SPF Verified: {dom.spfVerified ? '✓ Verified' : 'Pending'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onGoToTab('webmail')}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center space-x-1.5"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>ওয়েবমেইল প্যানেল</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
