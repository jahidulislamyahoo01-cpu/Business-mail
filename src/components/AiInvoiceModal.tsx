import React, { useState } from 'react';
import { FileText, Send, X, Sparkles, CheckCircle2, AlertTriangle, Building, DollarSign, Calendar, User, Mail, CreditCard } from 'lucide-react';

interface AiInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientEmail?: string;
  initialClientName?: string;
  senderMailboxAddress: string;
}

export const AiInvoiceModal: React.FC<AiInvoiceModalProps> = ({
  isOpen,
  onClose,
  initialClientEmail = '',
  initialClientName = '',
  senderMailboxAddress
}) => {
  const [clientName, setClientName] = useState(initialClientName || '');
  const [clientEmail, setClientEmail] = useState(initialClientEmail || '');
  const [companyName, setCompanyName] = useState('GiftGhor');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState('2500');
  const [itemDescription, setItemDescription] = useState('1x Premium Custom Gift Combo, Express Delivery & Packaging');
  const [paymentInfo, setPaymentInfo] = useState('bKash Personal / Merchant: 01711-223344, Nagad: 01800-445566, City Bank Account: 12345678');
  const [notes, setNotes] = useState('পেমেন্ট সম্পন্ন করে ট্রানজেকশন আইডি প্রদান করে কনফার্ম করুন।');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInvoiceText, setGeneratedInvoiceText] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail || !totalAmount) {
      alert('অনুগ্রহ করে গ্রাহকের ইমেইল এবং মোট টাকার পরিমাণ লিখুন।');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      // 1. Call AI Invoice Generator API
      const res = await fetch('/api/ai/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName || clientEmail.split('@')[0],
          companyName,
          invoiceNumber,
          dueDate,
          total: totalAmount,
          items: [itemDescription],
          paymentInfo,
          notes
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'ইনভয়েস জেনারেট করতে ব্যর্থ হয়েছে');
      }

      const data = await res.json();
      const invoiceText = data.invoiceText || 'Invoice generated';
      setGeneratedInvoiceText(invoiceText);

      // 2. Automatically dispatch email to client
      const sendRes = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxAddress: senderMailboxAddress,
          senderName: `${companyName} Accounts`,
          to: clientEmail.trim(),
          subject: `[${invoiceNumber}] - Commercial Invoice & Billing Summary (${companyName})`,
          body: invoiceText
        })
      });

      if (!sendRes.ok) {
        throw new Error('ইনভয়েস সফলভাবে জেনারেট হলেও ইমেইল সেন্ড ব্যর্থ হয়েছে।');
      }

      setSuccessNotice(`ইনভয়েস #${invoiceNumber} সফলভাবে জেনারেট করে ${clientEmail} ঠিকানায় ইমেইল পাঠানো হয়েছে!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'অজানা ত্রুটি ঘটেছে');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <span>এআই ইনভয়েস & প্রপোজাল জেনারেটর</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 rounded-md flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-500" />
                <span>AI Powered</span>
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              কাস্টমারের জন্য ১-ক্লিকে প্রফেশনাল কমার্শিয়াল ইনভয়েস জেনারেট করে সরাসরি ইমেইলে পাঠিয়ে দিন।
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successNotice && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-1">
            <div className="flex items-center space-x-2 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ইনভয়েস ইমেইল ডেলিভারি সফল!</span>
            </div>
            <p className="text-emerald-800 leading-relaxed pl-6">{successNotice}</p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 space-y-1">
            <div className="flex items-center space-x-2 font-bold text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>সমস্যা দেখা দিয়েছে</span>
            </div>
            <p className="text-rose-800 leading-relaxed pl-6">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleGenerateAndSend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>গ্রাহকের নাম (Client Name)</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="যেমন: তানভির আহমেদ"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>গ্রাহকের ইমেইল (Client Email)</span>
              </label>
              <input
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ইনভয়েস নম্বর (Invoice #)
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>মোট পরিমাণ (৳ Total BDT)</span>
              </label>
              <input
                type="number"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="2500"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>মেয়াদ/শেষ সময় (Due Date)</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              আইটেম বিবরণ / প্রোডাক্ট সার্ভিস বিবরণ
            </label>
            <input
              type="text"
              required
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="যেমন: ১টি গিফট কম্বো, কুরিয়ার চার্জ এবং গিফট র‌্যাপিং"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>পেমেন্ট একাউন্টসমূহ (bKash / Nagad / Bank Details)</span>
            </label>
            <textarea
              rows={2}
              required
              value={paymentInfo}
              onChange={(e) => setPaymentInfo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              অতিরিক্ত শর্তাবলি / নোটস
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: পেমেন্ট সম্পন্ন করে ট্রানজেকশন আইডি দিন"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Generated Text Preview Box */}
          {generatedInvoiceText && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs space-y-2 max-h-48 overflow-y-auto border border-slate-800">
              <div className="text-amber-400 font-semibold flex items-center justify-between">
                <span>✓ জেনারেটকৃত কমার্শিয়াল ইনভয়েস প্রিভিউ:</span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-200 font-mono">
                {generatedInvoiceText}
              </pre>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs transition-colors"
            >
              বন্ধ করুন
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-2xs flex items-center space-x-1.5"
            >
              <Send className={`w-3.5 h-3.5 text-orange-400 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'ইনভয়েস জেনারেট ও পাঠানো হচ্ছে...' : 'ইনভয়েস জেনারেট & ইমেইল পাঠান'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
