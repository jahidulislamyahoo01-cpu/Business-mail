import React, { useState } from 'react';
import { Domain } from '../types';
import { Globe, RefreshCw, CheckCircle2, AlertTriangle, Copy, Check, Search, Plus, AlertCircle } from 'lucide-react';

interface DomainsViewProps {
  domains: Domain[];
  onAddDomain: (domainName: string) => Promise<void>;
  onVerifyDomain: (domainId: string) => Promise<any>;
}

export const DomainsView: React.FC<DomainsViewProps> = ({ domains, onAddDomain, onVerifyDomain }) => {
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [verifyResultMap, setVerifyResultMap] = useState<Record<string, any>>({});

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setIsAdding(true);
    setAddError(null);
    try {
      await onAddDomain(newDomain.trim());
      setNewDomain('');
    } catch (err: any) {
      setAddError(err.message || 'ডোমেইন যোগ করতে সমস্যা হয়েছে।');
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    setVerifyingDomainId(domainId);
    try {
      const res = await onVerifyDomain(domainId);
      setVerifyResultMap((prev) => ({ ...prev, [domainId]: res }));
    } catch (err: any) {
      setAddError('DNS ভেরিফিকেশন চেক করতে সমস্যা হয়েছে।');
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-2 sm:px-4 py-4">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-600" />
              <span>কাস্টম ডোমেইন ম্যানেজমেন্ট & DNS অটো-ভেরিফায়ার</span>
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed mt-1">
              আপনার ডোমেইন যোগ করুন এবং লাইভ DNS রেকর্ডের মাধ্যমে ইমেইল সেন্ডিং ও রিসিভিং সচল করুন।
            </p>
          </div>

          {/* Add Domain Form (Inline single clean row) */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="e.g. brand.com"
              className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-500"
            />
            <button
              type="submit"
              disabled={isAdding || !newDomain.trim()}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>যোগ করুন</span>
            </button>
          </form>
        </div>

        {/* Inline Error Message */}
        {addError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{addError}</span>
          </div>
        )}
      </div>

      {/* Domains List Cards */}
      <div className="space-y-4">
        {domains.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            কোনো কাস্টম ডোমেন যুক্ত করা হয়নি।
          </div>
        ) : (
          domains.map((dom) => {
            const verifyInfo = verifyResultMap[dom.id];
            return (
              <div key={dom.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="text-base font-semibold text-slate-900">
                        {dom.domainName}
                      </span>
                      {dom.status === 'verified' ? (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>সক্রিয় (Active)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>পেন্ডিং DNS</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <span>তৈরি: {new Date(dom.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>অনুমোদিত মেলবক্স: {dom.maxMailboxes} টি</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                        <span>🔑 Resend:</span>
                        <span className="font-semibold text-slate-900">
                          {dom.resendApiKey 
                            ? 'Custom API Key' 
                            : (dom.domainName === 'giftghor.world' || domains.indexOf(dom) === 0 
                                ? 'RESEND_API_KEY (1st)' 
                                : 'RESEND_API_KEY_2 (2nd)')}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Compact sleek DNS Verify Button */}
                  <button
                    onClick={() => handleVerify(dom.id)}
                    disabled={verifyingDomainId === dom.id}
                    className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 disabled:opacity-50"
                  >
                    {verifyingDomainId === dom.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600" />
                        <span>পরীক্ষা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 text-slate-500" />
                        <span>অটো-ভেরিফাই DNS</span>
                      </>
                    )}
                  </button>
                </div>

                {/* DNS Records Table or details if verified/pending */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-slate-700">প্রয়োজনীয় DNS রেকর্ডসমূহ (পাবলিক ডিএনএস কনফিগারেশন):</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* MX Record */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">MX Record</span>
                        <button 
                          onClick={() => handleCopy(`mail.${dom.domainName}`, `mx_${dom.id}`)}
                          className="text-slate-400 hover:text-slate-700 text-[11px] flex items-center gap-0.5"
                        >
                          {copiedIndex === `mx_${dom.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIndex === `mx_${dom.id}` ? 'কপি হয়েছে' : 'কপি'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-slate-600 truncate">Host: @ → mail.{dom.domainName}</p>
                    </div>

                    {/* SPF Record */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">SPF TXT Record</span>
                        <button 
                          onClick={() => handleCopy(`v=spf1 include:_spf.mailcloud.pro ~all`, `spf_${dom.id}`)}
                          className="text-slate-400 hover:text-slate-700 text-[11px] flex items-center gap-0.5"
                        >
                          {copiedIndex === `spf_${dom.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIndex === `spf_${dom.id}` ? 'কপি হয়েছে' : 'কপি'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-slate-600 truncate">v=spf1 include:_spf.mailcloud.pro ~all</p>
                    </div>

                    {/* DMARC Record */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">DMARC Record</span>
                        <button 
                          onClick={() => handleCopy(`v=DMARC1; p=none; rua=mailto:admin@${dom.domainName}`, `dmarc_${dom.id}`)}
                          className="text-slate-400 hover:text-slate-700 text-[11px] flex items-center gap-0.5"
                        >
                          {copiedIndex === `dmarc_${dom.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedIndex === `dmarc_${dom.id}` ? 'কপি হয়েছে' : 'কপি'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-slate-600 truncate">_dmarc.{dom.domainName} → p=none</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
