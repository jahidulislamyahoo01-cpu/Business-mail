import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, Copy, ExternalLink, Key, Mail, ShieldCheck, Sparkles } from 'lucide-react';

export const GmailSendAsGuide: React.FC = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const steps = [
    {
      num: 1,
      titleBn: 'স্টেপ ১: Cloudflare এ ফ্রি ইমেইল ফরওয়ার্ডিং এনাবল করুন',
      descBn: 'আপনার ডোমেইন ক্লাউডফ্লেয়ারে যুক্ত করা থাকলে মাত্র ১ ক্লিকে ইমেইল ফরওয়ার্ডিং চালু করতে পারবেন।',
      detailsBn: [
        'Cloudflare Dashboard এ ঢুকুন এবং আপনার ডোমেইন সিলেক্ট করুন।',
        'বামপাশের মেনু থেকে "Email" -> "Email Routing" এ যান।',
        '"Enable Email Routing" বাটনে ক্লিক করুন। ক্লাউডফ্লেয়ার নিজে থেকেই প্রয়োজনীয় MX রেকর্ড যোগ করে দেবে।',
        'এবার "Custom Addresses" এ গিয়ে "Create address" এ ক্লিক করুন।',
        'Custom address এ লিখুন: contact (অথবা info, sales) এবং Destination address এ লিখুন আপনার পার্সোনাল জিমেইল এড্রেস (যেমন: yourname@gmail.com)।',
        'আপনার জিমেইলে পাঠানো কনফার্মেশন লিংকে ক্লিক করলেই ইমেইল রিসিভ হওয়া শুরু করবে!'
      ]
    },
    {
      num: 2,
      titleBn: 'স্টেপ ২: ফ্রি SMTP প্রদানকারী (Brevo/Sendinblue) এ ফ্রী একাউন্ট খুলুন',
      descBn: 'জিমেইল থেকে আপনার ডোমেইনের নাম দিয়ে মেইল সেন্ড করার জন্য একটি ফ্রি SMTP সার্ভার লাগবে। Brevo দিনে ৩০০টি ফ্রি ইমেইল দেয়।',
      detailsBn: [
        'Brevo.com এ গিয়ে একটি ১০০% ফ্রি একাউন্ট তৈরি করুন।',
        'Dashboard -> Top right Profile -> "SMTP & API" অপশনে যান।',
        '"Generate a new SMTP key" এ ক্লিক করুন এবং আপনার সিক্রেট Key টি কপি করে রাখুন।',
        'নিচের SMTP ইনফরমেশনগুলো মনে রাখুন:',
        '• SMTP Server: smtp-relay.brevo.com',
        '• Port: 587 (TLS/STARTTLS)',
        '• Login / Username: আপনার Brevo রেজিস্টার্ড ইমেইল',
        '• Password: আপনার তৈরি করা SMTP Key'
      ]
    },
    {
      num: 3,
      titleBn: 'স্টেপ ৩: Gmail এ "Send Mail As" কনফিগার করুন',
      descBn: 'জিমেইলের সেটিংস থেকে আপনার নতুন প্রফেশনাল ইমেইলটি যুক্ত করে নিন।',
      detailsBn: [
        'আপনার পিসির ব্রাউজারে Gmail খুলুন।',
        'উপরে ডানপাশের গিয়ার (Settings) আইকনে ক্লিক করে "See all settings" এ যান।',
        '"Accounts and Import" ট্যাবে যান।',
        '"Send mail as:" সেকশনে "Add another email address" এ ক্লিক করুন।',
        'একটি পপআপ উইন্ডো আসবে। "Name" এ আপনার বিজিনেসের নাম লিখুন এবং "Email address" এ আপনার বিজিনেস ইমেইল (যেমন: contact@yourdomain.com) লিখুন।',
        '"Treat as an alias" বক্সটি টিক দিয়ে Next Step এ চাপুন।'
      ]
    },
    {
      num: 4,
      titleBn: 'স্টেপ ৪: SMTP ক্রেডেনশিয়াল বসিয়ে ভেরিফাই করুন',
      descBn: 'Brevo থেকে পাওয়া SMTP তথ্য বসিয়ে ইমেইল ভেরিফাই করুন।',
      detailsBn: [
        'SMTP Server: smtp-relay.brevo.com',
        'Port: 587',
        'Username: আপনার Brevo একাউন্টের ইমেইল',
        'Password: Brevo SMTP Key',
        'Secured connection using TLS সিলেক্ট রেখে "Add Account" এ চাপুন।',
        'আপনার জিমেইলে একটি কনফার্মেশন কোড / লিঙ্ক আসবে। কোডটি পপআপে বসিয়ে Verify বাটনে চাপুন।',
        'অভিনন্দন! এখন থেকে জিমেইল থেকে কম্পোজ (Compose) করার সময় "From" ড্রপডাউন থেকে আপনার বিজিনেস ইমেইল সিলেক্ট করে ইমেইল পাঠাতে পারবেন!'
      ]
    }
  ];

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>আজীবন ১ টাকাও খরচ না করে সম্পূর্ণ প্রফেশনাল গাইড</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Cloudflare Routing + Gmail দিয়ে ১০০% ফ্রি বিজিনেস মেইল সেটআপ
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
          এই পদ্ধতিতে আপনার কোনো হোস্টিং বা পেইড ইমেইল সার্ভার কিনতে হবে না। আপনি আপনার রেগুলার জিমেইল অ্যাপ দিয়েই <code className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded">contact@yourdomain.com</code> ইমেইল পেতে এবং পাঠাতে পারবেন।
        </p>
      </div>

      {/* Step Selector Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step) => {
          const isActive = activeStep === step.num;
          return (
            <button
              key={step.num}
              onClick={() => setActiveStep(step.num)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                ধাপ ০{step.num}
              </div>
              <div className="text-xs sm:text-sm font-semibold truncate">
                {step.titleBn.split(':')[1]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Detailed Walkthrough */}
      {steps.map((step) => {
        if (step.num !== activeStep) return null;
        return (
          <div key={step.num} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                {step.num}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{step.titleBn}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{step.descBn}</p>
              </div>
            </div>

            <div className="space-y-4">
              {step.detailsBn.map((detail, idx) => (
                <div key={idx} className="flex items-start space-x-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/60">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-200 leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Step specific helper copy boxes */}
            {step.num === 2 && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-slate-400 font-sans font-semibold text-xs text-indigo-300">
                  Brevo SMTP তথ্য (কপি করতে ক্লিক করুন):
                </div>
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                  <span>smtp-relay.brevo.com</span>
                  <button onClick={() => copyToClipboard('smtp-relay.brevo.com')} className="text-xs text-indigo-400 hover:text-indigo-300">
                    {copiedText === 'smtp-relay.brevo.com' ? 'Copied!' : 'Copy Server'}
                  </button>
                </div>
                <div className="flex items-center justify-between bg-slate-900 p-2 rounded border border-slate-800">
                  <span>Port: 587</span>
                  <button onClick={() => copyToClipboard('587')} className="text-xs text-indigo-400 hover:text-indigo-300">
                    {copiedText === '587' ? 'Copied!' : 'Copy Port'}
                  </button>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                disabled={activeStep === 1}
                onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-40"
              >
                পূর্ববর্তী ধাপ
              </button>

              {activeStep < 4 ? (
                <button
                  onClick={() => setActiveStep((prev) => Math.min(4, prev + 1))}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 inline-flex items-center space-x-1"
                >
                  <span>পরবর্তী ধাপ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-xs text-emerald-400 font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>সেটআপ সম্পন্ন!</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
