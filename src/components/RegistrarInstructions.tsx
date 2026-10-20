import React, { useState } from 'react';
import { Globe, ExternalLink, ChevronRight, CheckCircle2 } from 'lucide-react';

export const RegistrarInstructions: React.FC = () => {
  const [selectedRegistrar, setSelectedRegistrar] = useState<string>('namecheap');

  const registrars = [
    { id: 'namecheap', name: 'Namecheap', badge: 'Popular' },
    { id: 'cloudflare', name: 'Cloudflare', badge: 'Fastest' },
    { id: 'cpanel', name: 'cPanel / Web Hosting', badge: 'Standard' },
    { id: 'hostinger', name: 'Hostinger', badge: 'Easy' },
    { id: 'godaddy', name: 'GoDaddy', badge: 'Common' },
    { id: 'porkbun', name: 'Porkbun', badge: 'Cheap' }
  ];

  const instructions: Record<string, string[]> = {
    namecheap: [
      'Namecheap Dashboard এ লগইন করুন এবং "Domain List" এ যান।',
      'আপনার ডোমেইনের পাশে থাকা "Manage" বাটনে ক্লিক করুন।',
      'উপরে "Advanced DNS" ট্যাবে ক্লিক করুন।',
      'নিচে "Mail Settings" অপশনে গিয়ে "Custom MX" সিলেক্ট করুন এবং জেনারেট হওয়া MX রেকর্ডগুলো পেস্ট করুন।',
      '"ADD NEW RECORD" এ চাপ দিয়ে TXT রেকর্ড হিসেবে SPF এবং DMARC ফিল্ডগুলো সেইভ করে দিন।'
    ],
    cloudflare: [
      'Cloudflare Dashboard এ লগইন করে আপনার ডোমেইন সিলেক্ট করুন।',
      'বামপাশের মেনু থেকে "DNS" -> "Records" এ যান।',
      '"Add record" বাটনে ক্লিক করুন।',
      'Type হিসেবে "MX" নির্বাচন করুন, Name ফিল্ডে "@" দিন, Target এ MX সার্ভার এড্রেস এবং Priority মান বসান।',
      'Email Routing ব্যবহার করলে Cloudflare অটোমেটিক ১-ক্লিকে MX রেকর্ড বসিয়ে দেবে।'
    ],
    cpanel: [
      'cPanel ড্যাশবোর্ডে লগইন করুন।',
      '"Domains" সেকশন থেকে "Zone Editor" এ ক্লিক করুন।',
      'আপনার ডোমেইনের পাশে "Manage" বা "MX Entry" তে যান।',
      'পুরাতন প্রোভাইডারের MX রেকর্ড ডিলিট করে নতুন MX রেকর্ড যুক্ত করুন।',
      '"Add Record" এ গিয়ে Type "TXT" সিলেক্ট করে SPF রেকর্ড বসান।'
    ],
    hostinger: [
      'Hostinger hPanel এ লগইন করে "Domains" অপশনে যান।',
      'আপনার ডোমেন নির্বাচন করে "DNS / Name Servers" সেকশনে ক্লিক করুন।',
      '"Manage DNS records" ফর্ম থেকে Type হিসেবে "MX" নির্বাচন করে রেকর্ডগুলো যোগ করুন।',
      'সেইভ বাটনে চাপ দিন এবং ১০ মিনিট অপেক্ষা করুন।'
    ],
    godaddy: [
      'GoDaddy My Products পেজে যান এবং "Domains" সিলেক্ট করুন।',
      'আপনার ডোমেনের পাশে থাকা ৩ ডট অপশন থেকে "Manage DNS" এ যান।',
      '"Add New Record" এ ক্লিক করে Type: MX এবং Priority সহ তথ্যগুলো লিখুন।',
      'সেইভ করে বের হয়ে আসুন।'
    ],
    porkbun: [
      'Porkbun Account এ গিয়ে Domain Management এ যান।',
      'আপনার ডোমেনের পাশে থাকা "DNS" লিংকে ক্লিক করুন।',
      'Type: MX নির্বাচন করে Answer ফিল্ডে সার্ভার বসিয়ে Add চাপুন।',
      'একইভাবে TXT রেকর্ড যোগ করুন।'
    ]
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center space-x-3">
        <Globe className="w-5 h-5 text-indigo-400" />
        <h3 className="text-xl font-bold text-white">ডোমেইন রেজিস্ট্রারে DNS যোগ করার গাইড (Registrar Guides)</h3>
      </div>

      {/* Registrar Selector Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {registrars.map((reg) => (
          <button
            key={reg.id}
            onClick={() => setSelectedRegistrar(reg.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedRegistrar === reg.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {reg.name}
          </button>
        ))}
      </div>

      {/* Selected Instructions List */}
      <div className="space-y-3 pt-2">
        {instructions[selectedRegistrar]?.map((step, idx) => (
          <div key={idx} className="flex items-start space-x-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800/70">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span className="text-xs sm:text-sm text-slate-300 leading-relaxed">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
