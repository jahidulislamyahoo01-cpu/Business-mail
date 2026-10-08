import React from 'react';
import { Cpu, AlertTriangle, ShieldAlert, CheckCircle2, Server, Terminal, Lock, HardDrive } from 'lucide-react';

export const SelfHostGuide: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
          <Cpu className="w-3.5 h-3.5" />
          <span>এডভান্সড লিনাক্স ও ক্লাউড এডমিন নির্দেশিকা</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          নিজস্ব ফ্রী ক্লাউড সার্ভারে (Oracle Free VPS) মেল সার্ভার বানানো
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
          আপনি যদি কোনো থার্ডপার্টি সার্ভিস (Cloudflare/Zoho) ছাড়া সম্পূর্ণ নিজস্ব সার্ভারে (Self-Hosted) বিজিনেস ইমেইল সার্ভার চালাতে চান, তবে আপনার কী কী লাগবে এবং সম্ভাব্য চ্যালেঞ্জগুলো নিচে বিস্তারিত ব্যাখ্যা করা হলো।
        </p>
      </div>

      {/* Prerequisites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Server className="w-5 h-5 text-indigo-400" />
            <span>১. কী কী হার্ডওয়্যার & ক্লাউড লাগবে ($0 Free Tier)</span>
          </h3>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
            <li className="flex items-start space-x-2.5">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong className="text-white">Oracle Always Free Cloud Instance:</strong> ওরাকল ক্লাউডে 4 OCPU, 24GB RAM এবং 200GB স্টোরেজ সম্পূর্ণ বিনামূল্যে ($0) দেয়।
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong className="text-white">Static Public IP:</strong> আপনার সার্ভারে একটি স্থায়ী পাবলিক আইপি (IPv4) থাকতে হবে।
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <span className="text-indigo-400 font-bold">•</span>
              <span>
                <strong className="text-white">Docker & Docker Compose:</strong> মেল সার্ভার সফটওয়্যার (Mailcow / Stalwart / Mail-in-a-Box) রান করার জন্য।
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Lock className="w-5 h-5 text-sky-400" />
            <span>২. নেটওয়ার্ক & সিকিউরিটি কনফিগারেশন</span>
          </h3>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
            <li className="flex items-start space-x-2.5">
              <span className="text-sky-400 font-bold">•</span>
              <span>
                <strong className="text-white">Port 25 (SMTP Outbound):</strong> সবচেয়ে গুরুত্বপূর্ণ বিষয়! ক্লাউড প্রোভাইডারদের Port 25 আনব্লক করা থাকতে হবে।
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <span className="text-sky-400 font-bold">•</span>
              <span>
                <strong className="text-white">PTR Record (Reverse DNS):</strong> আপনার Server IP কে ডোমেইনের সাথে পয়েন্ট করতে হবে (যেমন: <code className="text-indigo-300">192.0.2.1 → mail.yourdomain.com</code>)।
              </span>
            </li>
            <li className="flex items-start space-x-2.5">
              <span className="text-sky-400 font-bold">•</span>
              <span>
                <strong className="text-white">SSL/TLS Certificate:</strong> Let's Encrypt অটোমেটিক ফ্রী এসএসএল সার্টিফিকেট।
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Warning Box on Challenges */}
      <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-900/50 space-y-3">
        <h3 className="text-lg font-bold text-rose-300 flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <span>নিজস্ব ইমেইল সার্ভার বানানোর বড় ৪টি ঝুঁকি ও চ্যালেঞ্জ (Risks & Challenges)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-300 pt-2">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-900/40">
            <strong className="text-rose-400 block mb-1">১. Port 25 ব্লকড থাকা:</strong>
            গুগল ক্লাউড, এডাব্লিউএস, ডিজিটাল ওশন এবং ওরাকল ফ্রি টিয়ার ডিফোল্টভাবে Port 25 ব্লক রাখে স্প্যাম রোখার জন্য। সাপোর্ট টিকেট দিয়ে Port 25 আনব্লক করাতে হয়।
          </div>
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-900/40">
            <strong className="text-rose-400 block mb-1">২. IP Reputation & Spam Filter:</strong>
            নতুন বা ক্লাউডের আইপি থেকে মেইল পাঠালে গুগল/আউটলুক তা সরাসরি Spam/Junk ফোল্ডারে পাঠিয়ে দেয় বা রিজেক্ট করে।
          </div>
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-900/40">
            <strong className="text-rose-400 block mb-1">৩. কন্টিনিউয়াস মেইনটেন্যান্স:</strong>
            সার্ভারে স্প্যাম ফিল্টার (SpamAssassin/Rspamd), এন্টিভাইরাস (ClamAV) এবং সিকিউরিটি আপডেট নিয়মিত দিতে হয়।
          </div>
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-900/40">
            <strong className="text-rose-400 block mb-1">৪. IP Blacklisting:</strong>
            একবার আপনার আইপি Spamhaus বা RBL ব্লকলিস্টে পড়লে জিমেইলে ইনবক্সিং বন্ধ হয়ে যাবে।
          </div>
        </div>
      </div>

      {/* Quick Setup Commands Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <span>Docker Mailcow ইন্সটলেশন নির্দেশিকা (Quick Snippet)</span>
        </h3>
        <p className="text-xs text-slate-400">
          উবুন্টু/ডেবিয়ান লিনাক্স সার্ভারে Mailcow Dockerized মেল সার্ভার ইন্সটল করার প্রাথমিক কমান্ডসমূহ:
        </p>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-indigo-300 space-y-2 overflow-x-auto">
          <div><span className="text-slate-500"># 1. Update server & install docker</span></div>
          <div>curl -fsSL https://get.docker.com | sh</div>
          <div><span className="text-slate-500"># 2. Clone Mailcow repository</span></div>
          <div>cd /opt</div>
          <div>git clone https://github.com/mailcow/mailcow-dockerized</div>
          <div>cd mailcow-dockerized</div>
          <div><span className="text-slate-500"># 3. Generate configuration</span></div>
          <div>./generate_config.sh</div>
          <div><span className="text-slate-500"># 4. Start Mailcow suite</span></div>
          <div>docker compose up -d</div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
          💡 <strong className="text-indigo-300">উপসংহার:</strong> ব্যক্তিগত বা ছোট ব্যবসার জন্য নিজে মেল সার্ভার হোস্ট করার চেয়ে <strong className="text-emerald-400">Cloudflare Email Routing + Gmail</strong> ব্যবহার করা ১০ গুণ বেশি নিরাপদ, ফাস্ট এবং কোনো স্প্যাম রিস্ক থাকে না।
        </div>
      </div>
    </div>
  );
};
