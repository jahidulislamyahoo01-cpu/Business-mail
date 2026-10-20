import React, { useState } from 'react';
import { SupportTemplate, SupportSettings, SupportTicket } from '../types';
import { FileText, X, Check, Copy, Sparkles, Plus, Search } from 'lucide-react';

interface SupportTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: SupportTemplate[];
  supportSettings?: SupportSettings;
  ticket?: SupportTicket | null;
  onSelectTemplate: (populatedBody: string, subject?: string) => void;
  onAddTemplate?: (template: Partial<SupportTemplate>) => Promise<void>;
}

export const SupportTemplatesModal: React.FC<SupportTemplatesModalProps> = ({
  isOpen,
  onClose,
  templates,
  supportSettings,
  ticket,
  onSelectTemplate,
  onAddTemplate
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const businessName = supportSettings?.businessName || 'GiftGhor';
  const hotline = supportSettings?.supportHotline || '+880 1800-GIFTGHOR';
  const whatsapp = supportSettings?.supportWhatsapp || '+880 1711-223344';
  const hours = supportSettings?.supportHours || 'সকাল ১০:০০টা - রাত ১০:০০টা';
  const orderId = ticket?.orderId || 'GG-XXXXX';
  const ticketId = ticket?.ticketNumber || 'TK-2026-XXXX';

  const populateVariables = (text: string): string => {
    return text
      .replace(/#{BUSINESS_NAME}/g, businessName)
      .replace(/#{HOTLINE}/g, hotline)
      .replace(/#{WHATSAPP}/g, whatsapp)
      .replace(/#{HOURS}/g, hours)
      .replace(/#{ORDER_ID}/g, orderId)
      .replace(/#{TICKET_ID}/g, ticketId)
      .replace(/#{TRACKING_CODE}/g, 'RDX-' + Math.floor(100000 + Math.random() * 900000))
      .replace(/#{TRACKING_LINK}/g, 'https://redx.com.bd/track');
  };

  const filtered = templates.filter((tmpl) => {
    const matchesCategory = selectedCategory === 'all' || tmpl.category === selectedCategory;
    const matchesSearch =
      tmpl.title.toLowerCase().includes(search.toLowerCase()) ||
      tmpl.titleBn.toLowerCase().includes(search.toLowerCase()) ||
      tmpl.bodyTemplate.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUse = (tmpl: SupportTemplate) => {
    const populated = populateVariables(tmpl.bodyTemplate);
    const populatedSubject = populateVariables(tmpl.subjectTemplate);
    onSelectTemplate(populated, populatedSubject);
    onClose();
  };

  const handleCopy = (tmpl: SupportTemplate) => {
    const populated = populateVariables(tmpl.bodyTemplate);
    navigator.clipboard.writeText(populated);
    setCopiedId(tmpl.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                ই-কমার্স কাস্টমার কেয়ার টেমপ্লেট
              </h3>
              <p className="text-xs text-slate-500">
                ১-ক্লিকে রিফান্ড, ডেলিভারি বিলম্ব ও রিপ্লেসমেন্টের প্রফেশনাল উত্তর বসিয়ে দিন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="টেমপ্লেট খুঁজুন (যেমন: রিফান্ড, ডেলিভারি, এক্সচেঞ্জ)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সবগুলো
            </button>
            <button
              onClick={() => setSelectedCategory('delivery_delay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'delivery_delay'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ডেলিভারি বিলম্ব
            </button>
            <button
              onClick={() => setSelectedCategory('damaged_item')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'damaged_item'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ড্যামেজ / রিপ্লেসমেন্ট
            </button>
            <button
              onClick={() => setSelectedCategory('refund_request')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'refund_request'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              রিফান্ড পলিসি
            </button>
          </div>
        </div>

        {/* Templates Grid List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">কোনো টেমপ্লেট খুঁজে পাওয়া যায়নি</p>
            </div>
          ) : (
            filtered.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {tmpl.titleBn}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-sans block">
                      {tmpl.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(tmpl)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1 transition-colors"
                      title="কপি করুন"
                    >
                      {copiedId === tmpl.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold text-[10px]">কপাইড</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-[10px]">কপি</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleUse(tmpl)}
                      className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ইমেইলে বসান</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 whitespace-pre-line font-['Hind_Siliguri',sans-serif] leading-relaxed max-h-36 overflow-y-auto">
                  {populateVariables(tmpl.bodyTemplate)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>
            টিকেট আইডি ও অর্ডার নম্বর স্বয়ংক্রিয়ভাবে প্রতিস্থাপিত হবে
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
