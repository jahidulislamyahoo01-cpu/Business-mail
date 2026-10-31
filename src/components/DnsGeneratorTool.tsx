import React, { useState } from 'react';
import { DnsRecord, SetupMethod, DnsCheckResult } from '../types';
import { Copy, Check, RefreshCw, AlertTriangle, CheckCircle, Search, HelpCircle, ArrowRight } from 'lucide-react';

interface DnsGeneratorToolProps {
  selectedMethod: SetupMethod;
  setSelectedMethod: (m: SetupMethod) => void;
}

export const DnsGeneratorTool: React.FC<DnsGeneratorToolProps> = ({ selectedMethod, setSelectedMethod }) => {
  const [domain, setDomain] = useState('mybusiness.com');
  const [emailPrefix, setEmailPrefix] = useState('contact');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Live DNS Inspector State
  const [isCheckingDns, setIsCheckingDns] = useState(false);
  const [dnsResults, setDnsResults] = useState<{
    mx?: any;
    txt?: any;
  } | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const cleanDomain = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || 'yourdomain.com';

  // Generate DNS Records based on selected method
  const getDnsRecords = (): DnsRecord[] => {
    if (selectedMethod === 'zoho_free') {
      return [
        {
          type: 'MX',
          host: '@',
          value: 'mx.zoho.com',
          priority: 10,
          ttl: 'Auto / 3600',
          purpose: 'Zoho প্রাথমিক মেইল রিসিভিং সার্ভার'
        },
        {
          type: 'MX',
          host: '@',
          value: 'mx2.zoho.com',
          priority: 20,
          ttl: 'Auto / 3600',
          purpose: 'Zoho ব্যাকআপ মেইল সার্ভার'
        },
        {
          type: 'MX',
          host: '@',
          value: 'mx3.zoho.com',
          priority: 50,
          ttl: 'Auto / 3600',
          purpose: 'Zoho ৩য় ব্যাকআপ সার্ভার'
        },
        {
          type: 'TXT',
          host: '@',
          value: 'v=spf1 include:zoho.com ~all',
          ttl: 'Auto / 3600',
          purpose: 'SPF Record - Zoho সার্ভারকে ইমেইল সেন্ড করার অনুমোদন দেয়'
        },
        {
          type: 'TXT',
          host: 'zoho._domainkey',
          value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ... (Zoho Control Panel থেকে পাবেন)',
          ttl: 'Auto / 3600',
          purpose: 'DKIM Signature - স্প্যাম ফোল্ডার এড়াতে ডিজিটাল সিগনেচার'
        },
        {
          type: 'TXT',
          host: '_dmarc',
          value: `v=DMARC1; p=none; sp=none; rua=mailto:dmarc-reports@${cleanDomain}`,
          ttl: 'Auto / 3600',
          purpose: 'DMARC Policy - স্পুফিং রোখা এবং সিকিউরিটি রিপোর্ট'
        }
      ];
    }

    if (selectedMethod === 'improv_brevo') {
      return [
        {
          type: 'MX',
          host: '@',
          value: 'mx1.improvmx.com',
          priority: 10,
          ttl: 'Auto / 3600',
          purpose: 'ImprovMX মেইল ফরওয়ার্ডিং সার্ভার ১'
        },
        {
          type: 'MX',
          host: '@',
          value: 'mx2.improvmx.com',
          priority: 20,
          ttl: 'Auto / 3600',
          purpose: 'ImprovMX মেইল ফরওয়ার্ডিং সার্ভার ২'
        },
        {
          type: 'TXT',
          host: '@',
          value: 'v=spf1 include:spf.improvmx.com include:spf.brevo.com ~all',
          ttl: 'Auto / 3600',
          purpose: 'SPF Record - ImprovMX এবং Brevo SMTP কে অনুমোদন দেয়'
        },
        {
          type: 'TXT',
          host: '_dmarc',
          value: `v=DMARC1; p=none; sp=none; rua=mailto:admin@${cleanDomain}`,
          ttl: 'Auto / 3600',
          purpose: 'DMARC Policy - স্প্যাম ফোল্ডার প্রটেকশন'
        }
      ];
    }

    if (selectedMethod === 'self_host') {
      return [
        {
          type: 'MX',
          host: '@',
          value: `mail.${cleanDomain}`,
          priority: 10,
          ttl: 'Auto / 3600',
          purpose: 'আপনার নিজস্ব VPS মেল সার্ভার'
        },
        {
          type: 'TXT',
          host: '@',
          value: `v=spf1 mx ip4:YOUR_SERVER_PUBLIC_IP ~all`,
          ttl: 'Auto / 3600',
          purpose: 'SPF Record - আপনার VPS IP কে অনুমোদন দেয়'
        },
        {
          type: 'TXT',
          host: 'dkim._domainkey',
          value: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA... (Mailcow Admin Panel থেকে পাবেন)',
          ttl: 'Auto / 3600',
          purpose: 'DKIM Security Key'
        },
        {
          type: 'TXT',
          host: '_dmarc',
          value: `v=DMARC1; p=quarantine; rua=mailto:postmaster@${cleanDomain}`,
          ttl: 'Auto / 3600',
          purpose: 'Strict DMARC Policy for Self-Hosted Mail Server'
        }
      ];
    }

    // Default: Cloudflare Email Routing + Brevo / Gmail SMTP
    return [
      {
        type: 'MX',
        host: '@',
        value: 'route1.mx.cloudflare.net',
        priority: 78,
        ttl: 'Auto',
        purpose: 'Cloudflare Email Routing Primary Server'
      },
      {
        type: 'MX',
        host: '@',
        value: 'route2.mx.cloudflare.net',
        priority: 67,
        ttl: 'Auto',
        purpose: 'Cloudflare Email Routing Backup Server 1'
      },
      {
        type: 'MX',
        host: '@',
        value: 'route3.mx.cloudflare.net',
        priority: 25,
        ttl: 'Auto',
        purpose: 'Cloudflare Email Routing Backup Server 2'
      },
      {
        type: 'TXT',
        host: '@',
        value: 'v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all',
        ttl: 'Auto',
        purpose: 'SPF Record - Cloudflare ফরওয়ার্ডিং এবং Brevo SMTP সেন্ডিং অনুমোদন'
      },
      {
        type: 'TXT',
        host: '_dmarc',
        value: `v=DMARC1; p=none; sp=none; rua=mailto:dmarc-reports@${cleanDomain}`,
        ttl: 'Auto',
        purpose: 'DMARC Policy - ইনবক্স স্প্যাম প্রটেকশন'
      }
    ];
  };

  const records = getDnsRecords();

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Perform Live DNS Lookup using Google DoH endpoint via express backend
  const handleLiveDnsCheck = async () => {
    if (!cleanDomain || cleanDomain === 'yourdomain.com') {
      setCheckError('দয়া করে আপনার সঠিক ডোমেইন নাম দিন (যেমন: mycompany.com)');
      return;
    }

    setIsCheckingDns(true);
    setCheckError(null);
    setDnsResults(null);

    try {
      const [mxRes, txtRes] = await Promise.all([
        fetch(`/api/dns-lookup?domain=${encodeURIComponent(cleanDomain)}&type=MX`),
        fetch(`/api/dns-lookup?domain=${encodeURIComponent(cleanDomain)}&type=TXT`)
      ]);

      const mxData = await mxRes.json();
      const txtData = await txtRes.json();

      setDnsResults({
        mx: mxData,
        txt: txtData
      });
    } catch (err: any) {
      setCheckError('DNS চেক করতে সমস্যা হয়েছে। ইন্টারনেট কানেকশন বা ডোমেইনের বানান পরীক্ষা করুন।');
    } finally {
      setIsCheckingDns(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Top Configuration Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <span>DNS রেকর্ড জেনারেটর & লাইভ ভেরিফায়ার</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            আপনার ডোমেইন লিখুন এবং আপনার নেমসার্ভার / ডোমেইন প্যানেলে (Namecheap / Cloudflare / cPanel) নিচের রেকর্ডগুলো যুক্ত করুন।
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              পদ্ধতি নির্বাচন করুন
            </label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as SetupMethod)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
            >
              <option value="cloudflare_gmail">Cloudflare Email Routing + Gmail (ফ্রি)</option>
              <option value="zoho_free">Zoho Mail Free Plan (ফ্রি)</option>
              <option value="improv_brevo">ImprovMX / ForwardEmail + Brevo</option>
              <option value="self_host">Self-Hosted Mail Server (VPS)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              আপনার ডোমেইন নাম (Domain Name)
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. mybusiness.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              ইমেইল প্রিফিক্স (Prefix)
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                placeholder="contact"
                className="w-full bg-slate-50 border border-slate-200 rounded-l-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
              />
              <span className="bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl px-3 py-2.5 text-xs text-slate-600 font-mono truncate max-w-[130px]">
                @{cleanDomain}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Email Preview */}
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-orange-900 font-medium">আপনার টার্গেট বিজনেস ইমেইল:</span>
            <div className="text-base sm:text-lg font-mono font-bold text-orange-950 mt-0.5">
              {emailPrefix || 'contact'}@{cleanDomain}
            </div>
          </div>
          <button
            onClick={handleLiveDnsCheck}
            disabled={isCheckingDns}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs disabled:opacity-50"
          >
            {isCheckingDns ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>DNS চেক হচ্ছে...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>লাইভ DNS চেক করুন</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated DNS Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs space-y-0">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            প্রয়োজনীয় DNS রেকর্ডসমূহ (Add these in your Registrar / Cloudflare)
          </h3>
          <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-mono border border-slate-200">
            মোট {records.length} টি রেকর্ড
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-slate-800">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Name / Host</th>
                <th className="px-6 py-3.5">Value / Target</th>
                <th className="px-6 py-3.5">Priority</th>
                <th className="px-6 py-3.5">উদ্দেশ্য (Purpose)</th>
                <th className="px-6 py-3.5 text-right">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded font-bold ${
                      rec.type === 'MX'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {rec.type}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-900 font-bold">
                    {rec.host}
                  </td>
                  <td className="px-6 py-3.5 max-w-md break-all text-slate-900 font-mono">
                    {rec.value}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">
                    {rec.priority !== undefined ? rec.priority : '-'}
                  </td>
                  <td className="px-6 py-3.5 font-sans text-xs text-slate-600">
                    {rec.purpose}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => handleCopy(rec.value, idx)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                      title="Copy Value"
                    >
                      {copiedIndex === idx ? (
                        <span className="text-emerald-700 flex items-center space-x-1"><Check className="w-3.5 h-3.5" /> <span>Copied</span></span>
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live DNS Inspection Results */}
      {checkError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{checkError}</span>
        </div>
      )}

      {dnsResults && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>লাইভ DNS ইন্সপেকশন রেজাল্ট: <code className="text-slate-900 font-mono">{cleanDomain}</code></span>
            </h3>
            <span className="text-xs text-slate-500">Google DNS (DoH) দিয়ে সরাসরি টেস্টকৃত</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MX Check */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">MX (Mail Exchange) রেকর্ডস</span>
                {dnsResults.mx?.answers && dnsResults.mx.answers.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                    সক্রিয় ({dnsResults.mx.answers.length} টি পাওয়া গেছে)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">
                    কোনো MX রেকর্ড পাওয়া যায়নি
                  </span>
                )}
              </div>

              {dnsResults.mx?.answers && dnsResults.mx.answers.length > 0 ? (
                <div className="space-y-1.5 font-mono text-xs text-slate-800">
                  {dnsResults.mx.answers.map((ans: any, i: number) => (
                    <div key={i} className="p-2 rounded bg-white border border-slate-200 flex justify-between">
                      <span className="text-slate-900 font-bold">{ans.data}</span>
                      <span className="text-slate-500">TTL: {ans.TTL}s</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  আপনার ডোমেইনে কোনো MX রেকর্ড পাওয়া যায়নি। মেইল রিসিভ করার জন্য উপরের MX রেকর্ডগুলো আপনার ডোমেন প্যানেলে যুক্ত করুন।
                </p>
              )}
            </div>

            {/* TXT / SPF Check */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">TXT (SPF / DMARC) রেকর্ডস</span>
                {dnsResults.txt?.answers && dnsResults.txt.answers.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                    সক্রিয় ({dnsResults.txt.answers.length} টি পাওয়া গেছে)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">
                    কোনো TXT রেকর্ড পাওয়া যায়নি
                  </span>
                )}
              </div>

              {dnsResults.txt?.answers && dnsResults.txt.answers.length > 0 ? (
                <div className="space-y-1.5 font-mono text-xs text-slate-800">
                  {dnsResults.txt.answers.map((ans: any, i: number) => (
                    <div key={i} className="p-2 rounded bg-white border border-slate-200 text-xs break-all">
                      <span className="text-emerald-800 font-bold">{ans.data}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  SPF রেকর্ড না থাকলে পাঠানো মেইল জিমেইল বা আউটলুকে Spam বা Junk ফোল্ডারে চলে যেতে পারে।
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
