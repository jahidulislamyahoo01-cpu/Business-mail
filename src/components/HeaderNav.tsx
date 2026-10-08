import React from 'react';
import { User } from '../types';
import { Mail, LayoutDashboard, Globe, Users, Inbox, Settings, Sparkles, LogOut, ShieldCheck, Send } from 'lucide-react';

interface HeaderNavProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenCompose?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ user, activeTab, setActiveTab, onLogout, onOpenCompose }) => {
  const isSubAdmin = user?.role === 'sub_admin';

  const allNavs = [
    { id: 'dashboard', labelBn: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'domains', labelBn: 'কাস্টম ডোমেইন', icon: Globe },
    { id: 'mailboxes', labelBn: 'মেলবক্স', icon: Users },
    { id: 'webmail', labelBn: 'ওয়েবমেইল', icon: Inbox, badge: 'Live' },
    { id: 'team', labelBn: 'টিম & পারমিশন', icon: ShieldCheck, isSuperOnly: true },
    { id: 'integrations', labelBn: 'এপিআই সেটিংস', icon: Settings, isSuperOnly: true },
    { id: 'ai-assistant', labelBn: 'এআই হেল্পার', icon: Sparkles }
  ];

  const navs = isSubAdmin 
    ? allNavs.filter((n) => !n.isSuperOnly)
    : allNavs;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center shadow-sm text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  MailCloud Pro
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1 lg:space-x-1.5">
            {navs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
                  <span>{item.labelBn}</span>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                      isActive ? 'bg-orange-500 text-white' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action & User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {onOpenCompose && (
              <button
                onClick={onOpenCompose}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-bold text-xs px-3 sm:px-4 py-2 rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
                title="সরাসরি নতুন ইমেইল পাঠান"
              >
                <Send className="w-3.5 h-3.5" />
                <span>মেইল পাঠান</span>
              </button>
            )}

            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900">{user?.name || 'Jahidul Islam'}</span>
              <span className="text-[10px] text-slate-500 font-mono">{user?.email || 'jahidulislammozumder@outlook.com'}</span>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Logout / Lock Admin Panel"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Nav Scroll Bar */}
        <div className="md:hidden flex space-x-1.5 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          {navs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.labelBn}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
