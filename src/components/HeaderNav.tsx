import React, { useState, useEffect } from 'react';
import { User, GeminiApiStatus } from '../types';
import { 
  Mail, LayoutDashboard, Globe, Users, Inbox, Settings, Sparkles, LogOut, 
  ShieldCheck, Send, ShoppingBag, Activity, AlertTriangle, CheckCircle2, 
  X, RefreshCw, Cpu
} from 'lucide-react';

interface HeaderNavProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenCompose?: () => void;
  geminiStatus?: GeminiApiStatus | null;
  onRefreshGeminiStatus?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  onOpenCompose,
  geminiStatus: initialGeminiStatus,
  onRefreshGeminiStatus
}) => {
  const [geminiStatus, setGeminiStatus] = useState<GeminiApiStatus | null>(initialGeminiStatus || null);
  const [isMonitorModalOpen, setIsMonitorModalOpen] = useState(false);
  const [hasAlertTriggered, setHasAlertTriggered] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isSubAdmin = user?.role === 'sub_admin';

  // Fetch real-time Gemini API status
  const fetchGeminiStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/gemini/status');
      if (res.ok) {
        const data: GeminiApiStatus = await res.json();
        setGeminiStatus(data);

        // Check if usage exceeds 90% and trigger alert if not already notified
        if (data.usagePercentage >= 90 && !hasAlertTriggered) {
          setHasAlertTriggered(true);
          // Automatic browser alert notification for critical quota
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('⚠️ Gemini API Quota Alert (>90%)', {
              body: `Current API usage is at ${data.usagePercentage}%. Auto multi-model fallback is active.`
            });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Gemini status:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGeminiStatus();
    // Poll every 45 seconds for real-time monitoring
    const interval = setInterval(fetchGeminiStatus, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialGeminiStatus) {
      setGeminiStatus(initialGeminiStatus);
    }
  }, [initialGeminiStatus]);

  const allNavs = [
    { id: 'dashboard', labelBn: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'domains', labelBn: 'কাস্টম ডোমেইন', icon: Globe },
    { id: 'mailboxes', labelBn: 'মেলবক্স', icon: Users },
    { id: 'webmail', labelBn: 'ওয়েবমেইল', icon: Inbox, badge: 'Live' },
    { id: 'support', labelBn: 'ই-কমার্স সাপোর্ট', icon: ShoppingBag, badge: 'Tickets' },
    { id: 'team', labelBn: 'টিম & পারমিশন', icon: ShieldCheck, isSuperOnly: true },
    { id: 'integrations', labelBn: 'এপিআই সেটিংস', icon: Settings, isSuperOnly: true },
    { id: 'ai-assistant', labelBn: 'এআই হেল্পার', icon: Sparkles }
  ];

  const navs = isSubAdmin 
    ? allNavs.filter((n) => !n.isSuperOnly)
    : allNavs;

  // Determine indicator colors & badge styles based on quota usage
  const getStatusBadgeStyles = () => {
    if (!geminiStatus) {
      return {
        bgColor: 'bg-slate-100 border-slate-200 text-slate-700',
        dotColor: 'bg-slate-400',
        text: 'Gemini API: Monitoring',
        isWarning: false
      };
    }

    const { usagePercentage, status } = geminiStatus;

    if (usagePercentage >= 90 || status === 'critical' || status === 'exhausted') {
      return {
        bgColor: 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs font-semibold',
        dotColor: 'bg-rose-600 animate-ping',
        text: `⚠️ Gemini Quota: ${usagePercentage}% (Critical)`,
        isWarning: true
      };
    }

    if (usagePercentage >= 70 || status === 'warning') {
      return {
        bgColor: 'bg-amber-50 border-amber-300 text-amber-800 font-medium',
        dotColor: 'bg-amber-500 animate-pulse',
        text: `Gemini AI: ${usagePercentage}% Used`,
        isWarning: false
      };
    }

    return {
      bgColor: 'bg-emerald-50 border-emerald-200/80 text-emerald-800 font-medium',
      dotColor: 'bg-emerald-500 animate-pulse',
      text: `Gemini AI: ${usagePercentage}% (Healthy)`,
      isWarning: false
    };
  };

  const badgeStyle = getStatusBadgeStyles();

  return (
    <>
      {/* Top Banner Alert if Gemini API exceeds 90% */}
      {geminiStatus && geminiStatus.usagePercentage >= 90 && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2 font-medium flex items-center justify-between border-b border-rose-700 shadow-2xs animate-fade-in">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 px-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
              <span>
                <strong>Gemini API Quota Alert ({geminiStatus.usagePercentage}% Used):</strong> Daily limit threshold reached ({geminiStatus.requestsToday}/{geminiStatus.dailyLimit} requests). Automatic multi-model fallback active.
              </span>
            </div>
            <button
              onClick={() => setIsMonitorModalOpen(true)}
              className="bg-white text-rose-900 px-3 py-1 rounded-md text-[11px] font-bold hover:bg-rose-50 transition-colors shrink-0"
            >
              Monitor Details
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo, Brand & Gemini Real-Time Status Pill */}
            <div className="flex items-center space-x-3">
              <div 
                className="flex items-center space-x-3 cursor-pointer" 
                onClick={() => setActiveTab('dashboard')}
              >
                <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center shadow-2xs text-white">
                  <Mail className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-base text-slate-900 tracking-tight">
                      MailCloud Pro
                    </span>
                    <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-time Gemini API Visual Indicator Pill */}
              <button
                onClick={() => setIsMonitorModalOpen(true)}
                className={`px-2.5 py-1 text-xs border rounded-lg flex items-center space-x-1.5 transition-all hover:scale-102 cursor-pointer ${badgeStyle.bgColor}`}
                title="Click to view real-time Gemini API quota monitor"
              >
                <span className={`w-2 h-2 rounded-full ${badgeStyle.dotColor}`} />
                <span className="text-[11px] font-semibold tracking-tight">{badgeStyle.text}</span>
              </button>
            </div>

            {/* Segmented Control Navigation Bar */}
            <nav className="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200/60">
              {navs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-2xs rounded-md font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-orange-600' : 'text-slate-500'}`} />
                    <span>{item.labelBn}</span>
                    {item.badge && (
                      <span className={`px-1.5 py-0.2 text-[10px] rounded-md font-medium ${
                        isActive ? 'bg-orange-50 text-orange-700' : 'bg-slate-200 text-slate-600'
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
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3.5 py-2 rounded-lg shadow-2xs flex items-center space-x-1.5 transition-all"
                  title="সরাসরি নতুন ইমেইল পাঠান"
                >
                  <Send className="w-3.5 h-3.5 text-orange-400" />
                  <span>মেইল পাঠান</span>
                </button>
              )}

              <div className="hidden xl:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900">{user?.name || 'Jahidul Islam'}</span>
                <span className="text-[10px] text-slate-500 font-mono">{user?.email || 'jahidulislammozumder@outlook.com'}</span>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="লগআউট"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Gemini API Quota Monitor Real-Time Modal */}
      {isMonitorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsMonitorModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Gemini API Quota Monitor</h3>
                <p className="text-xs text-slate-500">Real-time daily API usage & model health status</p>
              </div>
            </div>

            {geminiStatus ? (
              <div className="space-y-4">
                {/* Status Callout */}
                <div className={`p-4 rounded-xl border space-y-2 ${
                  geminiStatus.usagePercentage >= 90
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : geminiStatus.usagePercentage >= 70
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      {geminiStatus.usagePercentage >= 90 ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                      <span>Status: {geminiStatus.status.toUpperCase()}</span>
                    </span>
                    <span className="font-mono text-sm">{geminiStatus.usagePercentage}% Used</span>
                  </div>
                  <p className="text-xs leading-relaxed">{geminiStatus.message}</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Daily API Usage Progress</span>
                    <span className="font-mono text-slate-900">{geminiStatus.requestsToday} / {geminiStatus.dailyLimit} requests</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        geminiStatus.usagePercentage >= 90
                          ? 'bg-rose-600'
                          : geminiStatus.usagePercentage >= 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${geminiStatus.usagePercentage}%` }}
                    />
                  </div>
                </div>

                {/* Active Model & Fallback Details */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-medium flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      Active Primary Model:
                    </span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {geminiStatus.activeModel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-2">
                    <strong>Auto Multi-Model Fallback Chain:</strong> If quota limits are reached on the active model, the system automatically falls back across <code>gemini-3.5-flash</code>, <code>gemini-3.6-flash</code>, <code>gemini-3.7-flash</code>, and <code>gemini-3.5-flash-lite</code>.
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Updated: {new Date(geminiStatus.lastUpdated).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={fetchGeminiStatus}
                    disabled={isRefreshing}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Status</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-500">
                Fetching real-time Gemini API quota status...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
