import React, { useState, useEffect } from 'react';
import { Mailbox, User } from '../types';
import { 
  Bot, Send, Sparkles, Copy, Check, RefreshCw, Mail, 
  ShieldCheck, UserCheck, ChevronRight, AlertCircle, Building2,
  Briefcase, CheckCircle2, Shield, Lock, Award
} from 'lucide-react';

interface MailboxPersona {
  roleTitle: string;
  departmentName: string;
  departmentCode: string;
  instructions: string;
  signOff: string;
  securityNotice: string;
}

const PRESET_MAILBOXES = [
  { address: 'ceo@giftghorbd.com', role: 'CEO (Chief Executive Officer)', category: 'executive' },
  { address: 'coo@giftghorbd.com', role: 'COO (Chief Operating Officer)', category: 'executive' },
  { address: 'cto@giftghorbd.com', role: 'CTO (Chief Technology Officer)', category: 'executive' },
  { address: 'cfo@giftghorbd.com', role: 'CFO (Chief Financial Officer)', category: 'executive' },
  { address: 'cmo@giftghorbd.com', role: 'CMO (Chief Marketing Officer)', category: 'executive' },
  { address: 'billing@giftghorbd.com', role: 'Accounts & Billing Department', category: 'dept' },
  { address: 'sales@giftghorbd.com', role: 'Corporate Sales & Commercial Relations', category: 'dept' },
  { address: 'support@giftghorbd.com', role: 'Customer Care & Experience Center', category: 'dept' },
  { address: 'hr@giftghorbd.com', role: 'Human Resources & Talent Acquisition', category: 'dept' },
  { address: 'legal@giftghorbd.com', role: 'Legal Affairs & Corporate Compliance', category: 'dept' },
  { address: 'logistics@giftghorbd.com', role: 'Logistics & Supply Chain Operations', category: 'dept' },
  { address: 'admin@giftghorbd.com', role: 'Corporate Administration & Info Desk', category: 'dept' }
];

export const AiBusinessAssistant: React.FC = () => {
  const [availableMailboxes, setAvailableMailboxes] = useState<Mailbox[]>([]);
  const [selectedMailboxAddress, setSelectedMailboxAddress] = useState<string>('coo@giftghorbd.com');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const [activePersona, setActivePersona] = useState<MailboxPersona | null>(null);
  const [isFetchingPersona, setIsFetchingPersona] = useState<boolean>(false);

  const [promptInput, setPromptInput] = useState<string>('');
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch registered mailboxes from server on mount
  useEffect(() => {
    fetchMailboxes();
  }, []);

  const fetchMailboxes = async () => {
    try {
      const res = await fetch('/api/mailboxes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAvailableMailboxes(data);
        }
      }
    } catch (err) {
      console.warn('Failed to load server mailboxes list:', err);
    }
  };

  // Fetch Persona Info whenever selected mailbox changes
  useEffect(() => {
    const targetAddr = isCustomMode ? customAddress.trim() : selectedMailboxAddress;
    if (targetAddr) {
      fetchPersonaInfo(targetAddr);
    }
  }, [selectedMailboxAddress, customAddress, isCustomMode]);

  const fetchPersonaInfo = async (mailboxAddress: string) => {
    setIsFetchingPersona(true);
    try {
      const res = await fetch(`/api/ai/persona-info?mailbox=${encodeURIComponent(mailboxAddress)}`);
      if (res.ok) {
        const data = await res.json();
        setActivePersona(data);
      }
    } catch (err) {
      console.warn('Failed to fetch persona info:', err);
    } finally {
      setIsFetchingPersona(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    const targetMailbox = isCustomMode ? customAddress.trim() : selectedMailboxAddress;
    if (!targetMailbox) {
      setErrorMsg('অনুগ্রহ করে একটি সচল মেলবক্স সিলেক্ট করুন।');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setAiOutput(null);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput.trim(),
          selectedMailbox: targetMailbox
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gemini API থেকে উত্তর পেতে সমস্যা হয়েছে।');
      }

      const data = await res.json();
      setAiOutput(data.result);
      if (data.persona) {
        setActivePersona(data.persona);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gemini API কল করতে ত্রুটি হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!aiOutput) return;
    navigator.clipboard.writeText(aiOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectPreset = (addr: string) => {
    setIsCustomMode(false);
    setSelectedMailboxAddress(addr);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans px-2 sm:px-4 py-4">
      {/* Title & Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5 text-orange-600 shrink-0" />
              <span>AI Executive & Department Persona Assistant</span>
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              আপনার প্রতিটি ইন্ডিভিজুয়াল ইমেইল এড্রেস (CEO, COO, CTO, CFO, CMO, Billing, Support, Sales, HR, Legal, Logistics) অনুযায়ী জেমেনাই অটোমেটিক নির্দিষ্ট পার্সোনা প্রয়োগ করবে।
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Persona & Masking Verified</span>
          </div>
        </div>
      </div>

      {/* Position Acknowledgment & Quick Selector Pills */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              স্বীকৃত এক্সিকিউটিভ ও ডিপার্টমেন্টাল পজিশনসমূহ (Active Single Positions)
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            যেকোনো ইমেইলে ক্লিক করে পার্সোনা সিলেক্ট করুন
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {PRESET_MAILBOXES.map((mb) => {
            const isSelected = !isCustomMode && selectedMailboxAddress.toLowerCase() === mb.address.toLowerCase();
            return (
              <button
                key={mb.address}
                type="button"
                onClick={() => handleSelectPreset(mb.address)}
                className={`p-2.5 rounded-xl border text-left transition-all text-xs flex flex-col justify-between space-y-1.5 ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs font-semibold'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-orange-400' : 'text-slate-500'}`}>
                    {mb.address.split('@')[0]}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
                <span className="text-xs truncate font-medium">{mb.role}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Mailbox Selector & Custom Address Input */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-2">
              <Mail className="w-4 h-4 text-slate-600" />
              <span>সচল মেলবক্স ঠিকানা (Active Target Mailbox)</span>
            </label>

            {!isCustomMode ? (
              <select
                value={selectedMailboxAddress}
                onChange={(e) => setSelectedMailboxAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-medium"
              >
                <optgroup label="Executive Officers">
                  <option value="ceo@giftghorbd.com">ceo@giftghorbd.com — CEO Executive Office</option>
                  <option value="coo@giftghorbd.com">coo@giftghorbd.com — COO Operations Office</option>
                  <option value="cto@giftghorbd.com">cto@giftghorbd.com — CTO Tech Operations</option>
                  <option value="cfo@giftghorbd.com">cfo@giftghorbd.com — CFO Finance & Billing</option>
                  <option value="cmo@giftghorbd.com">cmo@giftghorbd.com — CMO Brand & Marketing</option>
                </optgroup>
                <optgroup label="Department Desks">
                  <option value="billing@giftghorbd.com">billing@giftghorbd.com — Billing & Accounts Desk</option>
                  <option value="sales@giftghorbd.com">sales@giftghorbd.com — Corporate Sales Desk</option>
                  <option value="support@giftghorbd.com">support@giftghorbd.com — Customer Support Care</option>
                  <option value="hr@giftghorbd.com">hr@giftghorbd.com — Human Resources Desk</option>
                  <option value="legal@giftghorbd.com">legal@giftghorbd.com — Legal & Compliance Desk</option>
                  <option value="logistics@giftghorbd.com">logistics@giftghorbd.com — Logistics Desk</option>
                  <option value="admin@giftghorbd.com">admin@giftghorbd.com — Corporate Admin Desk</option>
                </optgroup>
                {availableMailboxes.length > 0 && (
                  <optgroup label="Registered Server Mailboxes">
                    {availableMailboxes.map((mb) => (
                      <option key={mb.id} value={mb.address}>
                        {mb.address} ({mb.displayName})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <input
                type="email"
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                placeholder="যেমন: managing.director@giftghorbd.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white font-medium"
              />
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1.5"
            >
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>{isCustomMode ? 'প্রিসেট থেকে নির্বাচন করুন' : 'কাস্টম এড্রেস টাইপ করুন'}</span>
            </button>
          </div>
        </div>

        {/* Live Active Persona Card */}
        {activePersona && (
          <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                    সনাক্তকৃত অফিসিয়াল পার্সোনা (Detected Active Persona)
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {activePersona.roleTitle}
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                  {activePersona.departmentCode}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                  {activePersona.departmentName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 font-semibold flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>সিকিউরিটি ও কন্টাক্ট মাস্কিং রুল:</span>
                </div>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {activePersona.securityNotice}
                </p>
              </div>

              <div className="space-y-1.5 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 font-semibold flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>অফিসিয়াল সাইন-অফ (Sign-Off Format):</span>
                </div>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {activePersona.signOff}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              আপনার নির্দেশনা বা কাস্টমারের বার্তাটি লিখুন (Prompt / Customer Inquiry)
            </label>
            <textarea
              rows={4}
              required
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="যেমন: কাস্টমার তাদের অর্ডারের বিস্তারিত জানতে এবং পণ্য দ্রুত পাঠানোর অনুরোধ জানিয়েছে। এই পার্সোনার অধীনে সুন্দরভাবে উত্তর লিখে দাও..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white leading-relaxed font-sans"
            />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPromptInput('একজন কাস্টমার তাদের অর্ডারের স্ট্যাটাস জানতে চেয়েছে। এই পজিশনের পার্সোনা মেনে প্রফেশনাল উত্তর তৈরি করো।')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              অর্ডার স্ট্যাটাস উত্তর
            </button>
            <button
              type="button"
              onClick={() => setPromptInput('একটি করপোরেট বাল্ক অর্ডার বা পার্টনারশিপ প্রস্তাবনার উত্তর তৈরি করো।')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              করপোরেট পার্টনারশিপ ড্রাফট
            </button>
            <button
              type="button"
              onClick={() => setPromptInput('ইনভয়েস বা পেমেন্ট ভেরিফিকেশন সম্পন্ন করার অফিশিয়াল কনফার্মেশন নোট লিখুন।')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              পেমেন্ট ভেরিফিকেশন
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading || !promptInput.trim()}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                  <span>পার্সোনা অনুযায়ী জেনারেট হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>এআই পার্সোনা ড্রাফট তৈরি করুন</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* AI Output Card */}
        {aiOutput && (
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Bot className="w-4 h-4 text-orange-600" />
                <span>জেনারেটেড রেসপন্স ({activePersona?.roleTitle || 'Selected Persona'})</span>
              </span>

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors flex items-center space-x-1 shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>কপি করা হয়েছে</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>কপি করুন</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans bg-white p-4 sm:p-5 rounded-xl border border-slate-200">
              {aiOutput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
