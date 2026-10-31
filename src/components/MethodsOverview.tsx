import React from 'react';
import { MethodDetails, SetupMethod } from '../types';
import { CheckCircle2, XCircle, ArrowRight, Zap, Shield, HardDrive, Star, Sparkles } from 'lucide-react';

interface MethodsOverviewProps {
  onSelectMethod: (method: SetupMethod) => void;
  onGoToGuide: (tab: string) => void;
}

export const MethodsOverview: React.FC<MethodsOverviewProps> = ({ onSelectMethod, onGoToGuide }) => {
  const methods: MethodDetails[] = [
    {
      id: 'cloudflare_gmail',
      titleBn: '১. Cloudflare Email Routing + Gmail + Brevo/Resend',
      titleEn: 'Cloudflare Routing + Gmail',
      badge: 'সর্বোত্তম ও সবচেয়ে জনপ্রিয় (Recommended)',
      cost: '$0 (আজীবন সম্পূর্ণ ফ্রী)',
      storage: '১৫ জিবি (আপনার জিমেইল স্টোরেজ)',
      difficultyBn: 'সহজ (১০-১৫ মিনিট)',
      rating: 5,
      summaryBn: 'আপনার ডোমেইনের ইমেইলে (যেমন contact@yourdomain.com) আসা সকল মেসেজ সরাসরি আপনার ব্যক্তিগত জিমেইলে চলে আসবে। এবং জিমেইল থেকেই নিজের ডোমেইনের নাম দিয়ে রিপ্লাই/মেইল পাঠাতে পারবেন।',
      prosBn: [
        'একদম $0 খরচে আজীবন ব্যবহার করা যায়',
        'মোবাইল বা কম্পিউটারে জিমেইল অ্যাপ থেকেই ইমেইল রিসিভ ও সেন্ড করা যায়',
        'স্প্যাম ফিল্টারিং জিমেইলের শক্তিশালী AI দিয়ে হয়',
        'আনলিমিটেড কাস্টম ইমেইল অ্যালিয়াস (যেমন info@, sales@, admin@) তৈরি করা যায়'
      ],
      consBn: [
        'সেন্ড করার জন্য একটি ফ্রী SMTP সার্ভার (যেমন Brevo/Resend) অথবা Gmail App Password সংযোগ করতে হয়',
        'এক দিনে সর্বোচ্চ ৩০০টি পর্যন্ত ফ্রী সেন্ড করা যায় (সাধারণ বিজনেসের জন্য যথেষ্ট)'
      ],
      recommendedForBn: 'ফ্রিল্যান্সার, ছোট এজেন্সি, উদ্যোক্তা এবং স্টার্টআপ যাদের কোনো অতিরিক্ত খরচ ছাড়া পেশাদার ইমেইল প্রয়োজন।'
    },
    {
      id: 'zoho_free',
      titleBn: '২. Zoho Mail Forever Free Plan',
      titleEn: 'Zoho Mail Free Tier',
      badge: 'আলাদা বিজিনেস ওয়েবমেইল (Clean Webmail)',
      cost: '$0 (সর্বোচ্চ ৫ জন ইউজার)',
      storage: '৫ জিবি প্রতি ইউজার',
      difficultyBn: 'খুব সহজ (৫-১০ মিনিট)',
      rating: 4.8,
      summaryBn: 'Zoho সরাসরি তাদের ফ্রি প্ল্যানে ৫টি পর্যন্ত কাস্টম ডোমেইন বিজনেস ইমেইল ইনবক্স দেয়। তাদের নিজস্ব সুন্দর ওয়েবমেইল এবং মোবাইল অ্যাপ রয়েছে।',
      prosBn: [
        'সরাসরি বিজনেস ইনবক্স, কোনো ফরওয়ার্ডিং সেটআপ লাগে না',
        'খুব সুন্দর মোবাইল অ্যাপ এবং ওয়েব ড্যাশবোর্ড রয়েছে',
        'ক্যালেন্ডার, কন্টাক্টস এবং ডকুমেন্ট ম্যানেজার একসাথে পাওয়া যায়',
        'জিমেইলের মতো সহজে ইনবক্স এক্সেস করা যায়'
      ],
      consBn: [
        'ফ্রি প্ল্যানে IMAP/POP3 এক্সেস দেয় না (অর্থাৎ থার্ডপার্টি অ্যাপ বা আউটলুকে লিঙ্ক করা যায় না, জো হো অ্যাপ ইউজ করতে হবে)',
        'মেইল ফরওয়ার্ডিং সুবিধা নেই'
      ],
      recommendedForBn: 'যারা জিমেইলের সাথে মিক্স না করে সম্পূর্ণ আলাদা প্রফেশনাল ওয়েবমেইল ইনবক্স চান।'
    },
    {
      id: 'improv_brevo',
      titleBn: '৩. ImprovMX / ForwardEmail + Free SMTP',
      titleEn: 'Email Forwarding Services',
      badge: 'সহজ ফরওয়ার্ডিং (Lightweight)',
      cost: '$0 (ফ্রি প্ল্যান)',
      storage: 'আপনার গন্তব্য ইমেইলের ওপর নির্ভরশীল',
      difficultyBn: 'খুব সহজ (৫ মিনিট)',
      rating: 4.2,
      summaryBn: 'Cloudflare না থাকলে cPanel বা ImprovMX এর মতো ফ্রি ফরওয়ার্ডার সার্ভিস দিয়ে যেকোনো ইমেইলে মেইল রিডাইরেক্ট করা যায়।',
      prosBn: [
        'মাত্র ২-৩টি DNS রেকর্ড যোগ করলেই কাজ শুরু হয়ে যায়',
        'যেকোনো নেমসার্ভারে (Namecheap, cPanel, GoDaddy) কাজ করে',
        'কোনো সার্ভার কনফিগারেশন এর প্রয়োজন হয় না'
      ],
      consBn: [
        'ফ্রি প্ল্যানে কিছু সার্ভিস সাইজ লিমিট দেয়',
        'ডিজিটাল সিগনেচার স্প্যাম ফিল্টারে কখনো আটকে যেতে পারে'
      ],
      recommendedForBn: 'যাদের ক্লাউডফ্লেয়ার নেই এবং cPanel বা সাধারণ DNS দিয়ে দ্রুত ইমেইল ফরওয়ার্ড করতে চান।'
    },
    {
      id: 'self_host',
      titleBn: '৪. Self-Hosted Mail Server (Docker Mailcow / Stalwart)',
      titleEn: 'Self-Hosted Mail Server',
      badge: 'এডভান্সড টেকনিক্যাল (For Engineers)',
      cost: '$0 (Oracle Cloud Free VPS)',
      storage: 'VPS এর স্টোরেজ (৫০-২০০ জিবি)',
      difficultyBn: 'কঠিন / এডভান্সড (১-২ ঘণ্টা)',
      rating: 3.8,
      summaryBn: 'নিজের ক্লাউড সার্ভারে (যেমন Oracle Always Free VPS, 24GB RAM) Docker দিয়ে Mailcow বা Stalwart ইন্সটল করে সম্পূর্ণ নিজস্ব ইমেইল সার্ভার চালানো।',
      prosBn: [
        'সম্পূর্ণ ডাটা প্রাইভেসি ও ফুল কন্ট্রোল',
        'আনলিমিটেড ইউজার, আনলিমিটেড মেইলবক্স ও স্টোরেজ',
        'নিজের পছন্দমতো ইনবক্স সাইজ ও রুলস সেট করার ক্ষমতা'
      ],
      consBn: [
        'Port 25 খোলা থাকতে হবে (অনেক ফ্রি ক্লাউড ব্লক করে)',
        'Reverse DNS (PTR Record) এবং IP Reputation ঠিক না থাকলে মেইল সরাসরি Spam ফোল্ডারে যাবে',
        'নিয়মিত সার্ভার মেইনটেন্যান্স ও সিকিউরিটি প্যাচ দিতে হয়'
      ],
      recommendedForBn: 'ডেভেলপার ও লিনাক্স এডমিনদের জন্য যারা নিজস্ব ক্লাউড অবকাঠামোতে সম্পূর্ণ ইমেইল সার্ভার বানাতে চান।'
    }
  ];

  return (
    <div className="space-[#1e293b] space-y-10">
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>১০০% ফ্রি বিজিনেস ইমেইল গাইড</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
            নিজের ডোমেইন দিয়ে <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">$0 খরচে</span> প্রফেশনাল বিজনেস ইমেইল বানান
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Namecheap বা Google Workspace যেখানে প্রতি মাসে $3 - $7 ডলার চার্জ করে, সেখানে আপনি <strong className="text-white">একদম $0 খরচে</strong> নিজের ইমেইল (যেমন: <code className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700">contact@yourdomain.com</code>) সেটআপ করতে পারবেন। নিচে সেরা ৪টি পদ্ধতি বিস্তারিত নিচে দেয়া হলো:
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">ডোমেইন খরচ ছাড়া</div>
              <div className="text-lg font-bold text-emerald-400">$0 / মাস</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">প্রয়োজনীয় জিনিস</div>
              <div className="text-sm font-semibold text-white">ডোমেইন + DNS</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">সেটআপ সময়</div>
              <div className="text-sm font-semibold text-white">১০ - ১৫ মিনিট</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400">স্প্যাম সিকিউরিটি</div>
              <div className="text-sm font-semibold text-sky-400">SPF + DKIM + DMARC</div>
            </div>
          </div>
        </div>
      </div>

      {/* What You Need Checklist Section */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          <span>আপনার কী কী লাগবে? (Prerequisites)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">১</div>
            <h3 className="font-semibold text-white">নিজের একটি ডোমেইন (Custom Domain)</h3>
            <p className="text-xs text-slate-400">
              যেমন: <code className="text-indigo-300">yourname.com</code> বা <code className="text-indigo-300">yourcompany.bd</code> (Namecheap, Porkbun, Cloudflare বা যেকোনো প্রোভাইডার থেকে ক্রয়কৃত)।
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 font-bold text-sm">২</div>
            <h3 className="font-semibold text-white">DNS ড্যাশবোর্ড এক্সেস</h3>
            <p className="text-xs text-slate-400">
              যেখানে MX, TXT (SPF), এবং DMARC রেকর্ড যোগ করতে পারবেন (Cloudflare DNS ব্যবহার করা সবচেয়ে সুবিধাজনক)।
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">৩</div>
            <h3 className="font-semibold text-white">একটি পার্সোনাল জিমেইল একাউন্ট</h3>
            <p className="text-xs text-slate-400">
              ইমেইল রিসিভ ও সেন্ড করার জন্য জিমেইল বা অন্য যেকোনো ফ্রি ইনবক্স।
            </p>
          </div>
        </div>
      </div>

      {/* Methods Cards */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">বিনামূল্যে বিজিনেস ইমেইল বানানোর সেরা ৪টি পদ্ধতি</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {methods.map((method) => (
            <div
              key={method.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                method.id === 'cloudflare_gmail'
                  ? 'bg-slate-900/90 border-indigo-500/40 shadow-xl shadow-indigo-950/40 ring-1 ring-indigo-500/20'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="p-6 sm:p-8 space-y-6">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {method.badge}
                      </span>
                      <span className="text-xs text-slate-400">কঠিনতা: {method.difficultyBn}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-2">
                      {method.titleBn}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        onSelectMethod(method.id);
                        if (method.id === 'cloudflare_gmail') {
                          onGoToGuide('gmail-guide');
                        } else if (method.id === 'self_host') {
                          onGoToGuide('self-host');
                        } else {
                          onGoToGuide('dns-tool');
                        }
                      }}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-indigo-600/30"
                    >
                      <span>সেটআপ গাইড দেখুন</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {method.summaryBn}
                </p>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 text-xs">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-slate-400">মাসিক খরচ: </span>
                      <strong className="text-emerald-400 font-semibold">{method.cost}</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-sky-400" />
                    <div>
                      <span className="text-slate-400">ইনবক্স স্টোরেজ: </span>
                      <strong className="text-white font-semibold">{method.storage}</strong>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <div>
                      <span className="text-slate-400">রেটিং: </span>
                      <strong className="text-white font-semibold">{method.rating} / 5</strong>
                    </div>
                  </div>
                </div>

                {/* Pros & Cons Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2 bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/30">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>সুবিধাসমূহ (Pros)</span>
                    </h4>
                    <ul className="space-y-1.5">
                      {method.prosBn.map((pro: string, i: number) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start space-x-2">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 bg-rose-950/20 p-4 rounded-xl border border-rose-900/30">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
                      <XCircle className="w-4 h-4" />
                      <span>সীমা / চ্যালেঞ্জ (Cons)</span>
                    </h4>
                    <ul className="space-y-1.5">
                      {method.consBn.map((con: string, i: number) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start space-x-2">
                          <span className="text-rose-400 mt-0.5">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended For */}
                <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <strong className="text-indigo-300">কার জন্য উপযুক্ত: </strong>
                  {method.recommendedForBn}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
