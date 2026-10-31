import React, { useState } from 'react';
import { Domain, Mailbox, User, TeamUser, SupportTicket } from '../types';
import { 
  Globe, Users, HardDrive, ShieldCheck, Plus, ArrowRight, 
  CheckCircle2, AlertTriangle, Inbox, Sparkles, X, ExternalLink, 
  Send, ShoppingBag, Settings, Lock, Mail, TrendingUp
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface DashboardViewProps {
  user: User;
  domains: Domain[];
  mailboxes: Mailbox[];
  teamUsers?: TeamUser[];
  tickets?: SupportTicket[];
  onAddDomain: (domainName: string) => Promise<void>;
  onGoToTab: (tab: string) => void;
  onOpenCompose?: () => void;
}

// Sample daily traffic data for visualization
const trafficData = [
  { day: 'শনি', received: 42, sent: 35 },
  { day: 'রবি', received: 58, sent: 49 },
  { day: 'সোম', received: 89, sent: 72 },
  { day: 'মঙ্গল', received: 74, sent: 65 },
  { day: 'বুধ', received: 95, sent: 88 },
  { day: 'বৃহস্পতি', received: 110, sent: 94 },
  { day: 'শুক্র', received: 68, sent: 55 },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  domains,
  mailboxes,
  teamUsers = [],
  tickets = [],
  onAddDomain,
  onGoToTab,
  onOpenCompose
}) => {
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showNotice, setShowNotice] = useState(true);

  const primaryDomain = domains[0]?.domainName || 'giftghor.world';
  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

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
    <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-4 py-4">
      {/* Cloudflare Style Hero Header */}
      <div className="space-y-2 pb-2 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              {primaryDomain} – Control Center
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed mt-0.5">
              Manage mailboxes, webmail inbox, team permissions, API integrations, and e-commerce support tickets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCompose && (
              <button
                onClick={onOpenCompose}
                className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5 text-orange-400" />
                <span>মেইল পাঠান</span>
              </button>
            )}
            <button
              onClick={() => onGoToTab('webmail')}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Inbox className="w-4 h-4 text-slate-500" />
              <span>ওয়েবমেইল খুলুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Navigation Cards Grid (Mailbox, Webmail, Team, Settings, Support) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Webmail & Mailboxes Section Card */}
        <div 
          onClick={() => onGoToTab('mailboxes')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-2xs space-y-3 cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="uppercase tracking-wider">মেলবক্স & ইনবক্স</span>
            <Users className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">{mailboxes.length}</span>
            <span className="text-xs text-slate-500">একটিভ মেলবক্স</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-orange-600">
            <span>মেলবক্স ম্যানেজ করুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 2. E-Commerce Support & Tickets Card */}
        <div 
          onClick={() => onGoToTab('support')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-2xs space-y-3 cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="uppercase tracking-wider">সাপোর্ট & কমপ্লেইন হাব</span>
            <ShoppingBag className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">{openTicketsCount}</span>
            <span className="text-xs text-amber-700 font-semibold">Open Complaints</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-orange-600">
            <span>সাপোর্ট হাব খুলুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* 3. Team Management & Security Card */}
        <div 
          onClick={() => onGoToTab('team')}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 shadow-2xs space-y-3 cursor-pointer group transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="uppercase tracking-wider">টিম & সিকিউরিটি</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">{teamUsers.length || 2}</span>
            <span className="text-xs text-slate-500">টিম মেম্বার</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-orange-600">
            <span>পারমিশন ও রোলস</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Daily Email Traffic Recharts Visualization */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span>দৈনিক ইমেইল ট্রাফিক বিশ্লেষণ (Sent vs Received)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">গত ৭ দিনের ইনকামিং রিসিভড এবং আউটগোয়িং সেন্ড ইমেইলের তুলনামূলক গ্রাফ</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span> রিসিভড (Received)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-900 inline-block"></span> সেন্ড (Sent)
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="received" name="Received" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorReceived)" />
              <Area type="monotone" dataKey="sent" name="Sent" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Quick Sections: Domains & API Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Domain Management Quick Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>কাস্টম ডোমেইন ও ডিএনএস</span>
            </h3>
            <button
              onClick={() => onGoToTab('domains')}
              className="text-xs font-semibold text-orange-600 hover:underline flex items-center gap-1"
            >
              <span>পরিচালনা</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            আপনার ডোমেইন যোগ করুন এবং MX, SPF, DMARC রেকর্ড ভেরিফাই করে ইমেইল আদান-প্রদান নিশ্চিত করুন।
          </p>
          <div className="pt-2">
            <form onSubmit={handleQuickAdd} className="flex gap-2">
              <input
                type="text"
                required
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                placeholder="brand.com"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500 font-mono"
              />
              <button
                type="submit"
                disabled={isAdding}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-2xs shrink-0"
              >
                যোগ করুন
              </button>
            </form>
          </div>
        </div>

        {/* API Settings & Security Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-700" />
              <span>এপিআই সেটিংস & ক্লাউডফ্লেয়ার</span>
            </h3>
            <button
              onClick={() => onGoToTab('integrations')}
              className="text-xs font-semibold text-orange-600 hover:underline flex items-center gap-1"
            >
              <span>কনফিগারেশন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Resend API Key, Cloudflare API Token, SMTP fallback এবং সিকিউরিটি লগ কনফিগারেশন ম্যানেজ করুন।
          </p>
          <div className="pt-2 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-medium">কানেকশন স্ট্যাটাস:</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Secure & Active
            </span>
          </div>
        </div>
      </div>

      {/* Amber Warning Notice */}
      {showNotice && (
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 shadow-2xs relative space-y-1.5">
          <button
            onClick={() => setShowNotice(false)}
            className="absolute top-3 right-3 text-amber-700 hover:text-amber-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start space-x-3 pr-6">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-amber-900">
                Email Proxying & Route Protection Active
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Ensure your MX and SPF records are set to <strong className="font-semibold text-amber-950">DNS Only / Proxied</strong> in your domain provider table to benefit from DDoS protection and instant inbox routing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
