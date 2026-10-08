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
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Top Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-orange-600" />
              <span>কাস্টম ডোমেইন ম্যানেজমেন্ট & DNS অটো-ভেরিফায়ার</span>
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              আপনার ডোমেইন যোগ করুন এবং লাইভ DNS রেকর্ডের মাধ্যমে ইমেইল সেন্ডিং ও রিসিভিং সচল করুন।
            </p>
          </div>

          {/* Add Domain Form */}
          <form onSubmit={handleAdd} className="flex space-x-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="e.g. brand.com"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-mono"
            />
            <button
              type="submit"
              disabled={isAdding || !newDomain.trim()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center space-x-1 shadow-xs disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>যোগ করুন</span>
            </button>
          </form>
        </div>

        {/* Inline Error Message */}
        {addError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{addError}</span>
          </div>
        )}
      </div>

      {/* Domains List Cards */}
      <div className="space-y-6">
        {domains.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            কোনো কাস্টম ডোমেন যুক্ত করা হয়নি।
          </div>
        ) : (
          domains.map((dom) => {
            const verifyInfo = verifyResultMap[dom.id];
            return (
              <div key={dom.id} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xl font-extrabold text-slate-900 font-mono">
                        {dom.domainName}
                      </span>
                      {dom.status === 'verified' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>সক্রিয় (Active)</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
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
                      <span className="inline-flex items-center space-x-1 font-mono font-medium text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                        <span>🔑 Resend:</span>
                        <span className="font-bold text-blue-700">
                          {dom.resendApiKey 
                            ? 'Custom API Key' 
                            : (dom.domainName === 'giftghor.world' || domains.indexOf(dom) === 0 
                                ? 'RESEND_API_KEY (1st)' 
                                : 'RESEND_API_KEY_2 (2nd)')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleVerify(dom.id)}
                    disabled={verifyingDomainId === dom.id}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs disabled:opacity-50"
                  >
                    {verifyingDomainId === dom.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>DNS পরীক্ষা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>অটো-ভেরিফাই DNS</span>
                      </>
                    )}
                  </button>
                </div>

                {/* DNS Health Status Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">MX Record (Inbound)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      dom.mxVerified ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {dom.mxVerified ? '✓ Verified' : '✗ Missing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">SPF Record (Outbound)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      dom.spfVerified ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {dom.spfVerified ? '✓ Verified' : '✗ Missing'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">DMARC Policy (Security)</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      dom.dmarcVerified ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {dom.dmarcVerified ? '✓ Verified' : '✗ Missing'}
                    </span>
                  </div>
                </div>

                {/* DNS Records Table to Copy */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    আপনার Registrar / Cloudflare এ বসানোর জন্য DNS রেকর্ড:
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left font-mono text-xs text-slate-800">
                      <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-3">Type</th>
                          <th className="p-3">Host</th>
                          <th className="p-3">Value</th>
                          <th className="p-3">Priority</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-3 text-purple-700 font-bold">MX</td>
                          <td className="p-3">@</td>
                          <td className="p-3 text-slate-900">route1.mx.cloudflare.net</td>
                          <td className="p-3 text-slate-500">78</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleCopy('route1.mx.cloudflare.net', `mx1_${dom.id}`)}
                              className="text-xs text-orange-600 hover:underline font-bold"
                            >
                              {copiedIndex === `mx1_${dom.id}` ? 'Copied!' : 'Copy'}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 text-purple-700 font-bold">MX</td>
                          <td className="p-3">@</td>
                          <td className="p-3 text-slate-900">route2.mx.cloudflare.net</td>
                          <td className="p-3 text-slate-500">67</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleCopy('route2.mx.cloudflare.net', `mx2_${dom.id}`)}
                              className="text-xs text-orange-600 hover:underline font-bold"
                            >
                              {copiedIndex === `mx2_${dom.id}` ? 'Copied!' : 'Copy'}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 text-blue-700 font-bold">TXT (Resend)</td>
                          <td className="p-3">@</td>
                          <td className="p-3 text-slate-900">v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all</td>
                          <td className="p-3 text-slate-500">-</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleCopy('v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all', `spf_${dom.id}`)}
                              className="text-xs text-orange-600 hover:underline font-bold"
                            >
                              {copiedIndex === `spf_${dom.id}` ? 'Copied!' : 'Copy'}
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 text-blue-700 font-bold">TXT (Brevo)</td>
                          <td className="p-3">@</td>
                          <td className="p-3 text-slate-900">v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all</td>
                          <td className="p-3 text-slate-500">-</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleCopy('v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all', `spf_br_${dom.id}`)}
                              className="text-xs text-orange-600 hover:underline font-bold"
                            >
                              {copiedIndex === `spf_br_${dom.id}` ? 'Copied!' : 'Copy'}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Show Verify Results Log */}
                {verifyInfo && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                    <span className="text-emerald-700 font-bold block">✓ DNS Inspection Result:</span>
                    <div className="text-slate-700">
                      MX Records Found: {verifyInfo.mxRecords?.join(', ') || 'None'}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
