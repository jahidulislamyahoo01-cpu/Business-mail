import React, { useState } from 'react';
import { Bot, Send, Sparkles, Copy, Check, RefreshCw, Mail, MessageSquare, AlertCircle } from 'lucide-react';

export const AiBusinessAssistant: React.FC = () => {
  const [promptInput, setPromptInput] = useState('');
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setAiOutput(null);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput.trim() })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gemini API থেকে উত্তর পেতে সমস্যা হয়েছে।');
      }

      const data = await res.json();
      setAiOutput(data.result);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-2 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-orange-600" />
          <span>জেমেনাই বিজনেস ইমেইল রাইটার & সিস্টেম এসিস্ট্যান্ট</span>
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm">
          আপনার ক্লায়েন্ট প্রস্তাবনা, কাস্টমার সাপোর্ট কিংবা বিজনেস ড্রাফট ইমেইল কয়েক সেকেন্ডে জেনারেট করুন।
        </p>
      </div>

      {/* Main AI Input & Output Box */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              আপনি কী ধরনের ইমেইল বা সহায়তা চান? (Prompt)
            </label>
            <textarea
              rows={4}
              required
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="যেমন: একজন ই-কমার্স ক্লায়েন্টকে তাদের ওয়েব প্রজেক্টের কোটেশন দেওয়ার জন্য একটি পেশাদার বাংলা ইমেইল ড্রাফট করে দাও..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white leading-relaxed font-sans"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !promptInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                  <span>জেনারেট করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>এআই দিয়ে জেনারেট করুন</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* AI Output Card */}
        {aiOutput && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Bot className="w-4 h-4 text-orange-600" />
                <span>জেনারেটেড রেজাল্ট</span>
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

            <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
              {aiOutput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
