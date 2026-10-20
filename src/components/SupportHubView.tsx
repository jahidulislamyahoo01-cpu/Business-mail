import React, { useState } from 'react';
import { SupportTicket, SupportSettings, SupportTemplate, TicketStatus, TicketCategory, TicketPriority } from '../types';
import { 
  ShoppingBag, CheckCircle2, Clock, AlertCircle, 
  Search, Filter, Plus, ArrowRight, User, Phone, 
  Sparkles, FileText, Settings, ShieldAlert, ExternalLink, RefreshCw 
} from 'lucide-react';
import { SupportTemplatesModal } from './SupportTemplatesModal';

interface SupportHubViewProps {
  tickets: SupportTicket[];
  supportSettings: SupportSettings;
  templates: SupportTemplate[];
  onUpdateTicket: (id: string, updates: Partial<SupportTicket>) => Promise<void>;
  onSaveSettings: (settings: Partial<SupportSettings>) => Promise<void>;
  onOpenWebmailWithTicket: (customerEmail: string, ticketId?: string) => void;
  onOpenComposeReply: (to: string, subject: string, body: string) => void;
}

export const SupportHubView: React.FC<SupportHubViewProps> = ({
  tickets,
  supportSettings,
  templates,
  onUpdateTicket,
  onSaveSettings,
  onOpenWebmailWithTicket,
  onOpenComposeReply
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTicketForTemplate, setSelectedTicketForTemplate] = useState<SupportTicket | null>(null);

  // Settings State
  const [businessName, setBusinessName] = useState(supportSettings.businessName || 'GiftGhor');
  const [hotline, setHotline] = useState(supportSettings.supportHotline || '+880 1800-GIFTGHOR');
  const [whatsapp, setWhatsapp] = useState(supportSettings.supportWhatsapp || '+880 1711-223344');
  const [hours, setHours] = useState(supportSettings.supportHours || 'সকাল ১০গ:০০টা - রাত ১০:০০টা (প্রতিদিন)');
  const [autoReply, setAutoReply] = useState(supportSettings.autoReplyAcknowledgment ?? true);
  const [geminiAutoResponder, setGeminiAutoResponder] = useState(supportSettings.geminiAutoResponderEnabled ?? true);
  const [geminiPrompt, setGeminiPrompt] = useState(
    supportSettings.geminiAutoResponderPrompt ||
      'সম্মানিত গ্রাহককে অত্যন্ত নম্রভাবে ও সম্মান প্রদর্শন করে সমাধান দিন। ডেলিভারি সংক্রান্ত হলে জানান যে পার্সেলটি প্রায়োরিটি ভিত্তিতে ট্র্যাকিং হচ্ছে। কোনো পণ্য সমস্যা হলে ১০০% ফ্রি রিপ্লেসমেন্টের আশ্বাস দিন।'
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      t.ticketNumber.toLowerCase().includes(q) ||
      t.customerEmail.toLowerCase().includes(q) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.orderId && t.orderId.toLowerCase().includes(q)) ||
      (t.customerPhone && t.customerPhone.toLowerCase().includes(q)) ||
      t.subject.toLowerCase().includes(q);
    return matchStatus && matchCat && matchSearch;
  });

  // KPI Calculations
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const urgentCount = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'resolved').length;

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    await onSaveSettings({
      businessName,
      supportHotline: hotline,
      supportWhatsapp: whatsapp,
      supportHours: hours,
      autoReplyAcknowledgment: autoReply,
      geminiAutoResponderEnabled: geminiAutoResponder,
      geminiAutoResponderPrompt: geminiPrompt,
      signatureHtml: `<div style="font-family: 'Hind Siliguri', sans-serif; font-size: 13px; color: #334155; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 12px; line-height: 1.6;">
  <strong style="color: #2563eb; font-size: 14px;">${businessName} কাস্টমার কেয়ার</strong><br/>
  📞 হটলাইন: ${hotline} | 💬 হোয়াটসঅ্যাপ: ${whatsapp}<br/>
  🌐 ওয়েবসাইট: giftghor.world | ⏰ সেবা সময়: ${hours}
</div>`
    });
    setIsSavingSettings(false);
    setIsSettingsOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Minimal SaaS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Support Tickets</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              AI Responder Active
            </span>
            {urgentCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {urgentCount} Urgent
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Streamlined customer inquiries, order issues, and AI-powered automated ticket resolution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTemplatesOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-2xs"
          >
            <Settings className="w-4 h-4 text-slate-300" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Compact Stat / KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Tickets</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5 font-mono">{totalCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-700">Open</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5 font-mono">{openCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-700">In Progress</p>
            <p className="text-xl font-bold text-blue-600 mt-0.5 font-mono">{inProgressCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-700">Resolved</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5 font-mono">{resolvedCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Clean Unified Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {[
              { id: 'all', label: 'All', count: totalCount },
              { id: 'open', label: 'Open', count: openCount },
              { id: 'in_progress', label: 'In Progress', count: inProgressCount },
              { id: 'resolved', label: 'Resolved', count: resolvedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-mono">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket #, order, customer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'delivery_delay', label: '📦 Delivery Delay' },
            { id: 'damaged_item', label: '💔 Damaged Item' },
            { id: 'refund_request', label: '💳 Refund' },
            { id: 'exchange', label: '🔄 Exchange' },
            { id: 'product_inquiry', label: '💬 General Inquiry' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                categoryFilter === cat.id
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Decluttered, Clean Ticket List */}
      <div className="space-y-2.5">
        {filteredTickets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 space-y-3">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No support tickets found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Incoming customer emails to your webmail will automatically appear here as structured tickets.
            </p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const slaDue = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : Date.now() + 24 * 3600000;
            const hoursLeft = Math.round((slaDue - Date.now()) / (1000 * 60 * 60));
            const isOverdue = hoursLeft <= 0 && ticket.status !== 'resolved';

            return (
              <div
                key={ticket.id}
                onClick={() => onOpenWebmailWithTicket(ticket.customerEmail, ticket.id)}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                {/* Left side: Ticket ID, subject, customer metadata */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {ticket.ticketNumber}
                    </span>
                    {ticket.orderId && (
                      <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        #{ticket.orderId}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      ticket.priority === 'urgent'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className="text-slate-400 text-xs">
                      • {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {ticket.subject}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <User className="w-3 h-3 text-slate-400" />
                      {ticket.customerName || ticket.customerEmail.split('@')[0]}
                    </span>
                    <span className="font-mono text-slate-400">{ticket.customerEmail}</span>
                    {ticket.tags && ticket.tags.map((tg, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        #{tg}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right side: Status badge & Action */}
                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={ticket.status}
                    onChange={(e) => onUpdateTicket(ticket.id, { status: e.target.value as TicketStatus })}
                    className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-colors focus:outline-none ${
                      ticket.status === 'open'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : ticket.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <button
                    onClick={() => onOpenWebmailWithTicket(ticket.customerEmail, ticket.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Support Templates Modal */}
      <SupportTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => {
          setIsTemplatesOpen(false);
          setSelectedTicketForTemplate(null);
        }}
        templates={templates}
        supportSettings={supportSettings}
        ticket={selectedTicketForTemplate}
        onSelectTemplate={(body, subject) => {
          if (selectedTicketForTemplate) {
            onOpenComposeReply(selectedTicketForTemplate.customerEmail, subject || `Re: [${selectedTicketForTemplate.ticketNumber}] ${selectedTicketForTemplate.subject}`, body);
          } else {
            onOpenComposeReply('', subject || 'Customer Support Update', body);
          }
        }}
      />

      {/* Support Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Customer Care & AI Settings</h3>
                  <p className="text-xs text-slate-500">Configure business branding, hotline, and Gemini AI auto-responder</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettingsSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Business Brand Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Support Hotline</label>
                  <input
                    type="text"
                    value={hotline}
                    onChange={(e) => setHotline(e.target.value)}
                    placeholder="+880 1800-GIFTGHOR"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp Support</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+880 1711-XXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Working Hours</label>
                <input
                  type="text"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="সকাল ১০:০০টা - রাত ১০:০০টা (প্রতিদিন)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Gemini AI Auto-Responder</span>
                      <span className="text-[11px] text-slate-600">Automatically analyze customer emails and reply professionally</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={geminiAutoResponder}
                    onChange={(e) => setGeminiAutoResponder(e.target.checked)}
                    className="w-4 h-4 text-slate-900 rounded"
                  />
                </div>

                {geminiAutoResponder && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Custom AI Rules & Guidelines:
                    </label>
                    <textarea
                      rows={2}
                      value={geminiPrompt}
                      onChange={(e) => setGeminiPrompt(e.target.value)}
                      placeholder="e.g. Standard delivery within 3 days, 100% free replacement on damaged items..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
