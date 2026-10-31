import React, { useState } from 'react';
import { SupportTicket, EmailMessage, TicketStatus, TicketPriority, TicketCategory } from '../types';
import { 
  ShieldAlert, Clock, User, Phone, ShoppingBag, 
  Tag, FileText, CheckCircle2, AlertCircle, Plus, Send, 
  ExternalLink, ChevronRight, X, Sparkles
} from 'lucide-react';

interface CustomerSupportSidebarProps {
  message: EmailMessage | null;
  ticket: SupportTicket | null;
  allMessages: EmailMessage[];
  onUpdateTicket: (ticketId: string, updates: Partial<SupportTicket>) => Promise<void>;
  onOpenAiReply: (scenario?: 'complaint_apology' | 'delivery_delay' | 'refund_exchange' | 'product_inquiry') => void;
  onOpenTemplates: () => void;
  onClose?: () => void;
}

export const CustomerSupportSidebar: React.FC<CustomerSupportSidebarProps> = ({
  message,
  ticket,
  allMessages,
  onUpdateTicket,
  onOpenAiReply,
  onOpenTemplates,
  onClose
}) => {
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState(ticket?.orderId || message?.orderId || '');
  const [phoneInput, setPhoneInput] = useState(ticket?.customerPhone || message?.customerPhone || '');
  const [nameInput, setNameInput] = useState(ticket?.customerName || message?.customerName || '');

  if (!message && !ticket) {
    return (
      <div className="w-80 border-l border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center text-center text-slate-400">
        <ShoppingBag className="w-10 h-10 mb-2 text-slate-300" />
        <p className="text-xs font-semibold">কোনো ইমেইল সিলেক্ট করা হয়নি</p>
        <p className="text-[11px] mt-1 text-slate-400">ইনবক্স থেকে কাস্টমার ইমেইল সিলেক্ট করলে সাপোর্ট ও অর্ডার ইনফো দেখা যাবে</p>
      </div>
    );
  }

  const effectiveEmail = ticket?.customerEmail || message?.from || '';
  const customerHistory = allMessages.filter(
    (m) => m.from.toLowerCase() === effectiveEmail.toLowerCase() && m.id !== message?.id
  );

  // SLA Calculation
  const slaDueTime = ticket?.slaDueAt ? new Date(ticket.slaDueAt).getTime() : Date.now() + 24 * 3600000;
  const hoursLeft = Math.round((slaDueTime - Date.now()) / (1000 * 60 * 60));
  const isOverdue = hoursLeft <= 0 && ticket?.status !== 'resolved' && ticket?.status !== 'closed';

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return;
    setIsSaving(true);
    await onUpdateTicket(ticket.id, { status: newStatus });
    setIsSaving(false);
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!ticket) return;
    setIsSaving(true);
    await onUpdateTicket(ticket.id, { priority: newPriority });
    setIsSaving(false);
  };

  const handleCategoryChange = async (newCat: TicketCategory) => {
    if (!ticket) return;
    setIsSaving(true);
    await onUpdateTicket(ticket.id, { category: newCat });
    setIsSaving(false);
  };

  const handleSaveCustomerInfo = async () => {
    if (!ticket) return;
    setIsSaving(true);
    await onUpdateTicket(ticket.id, {
      orderId: orderIdInput.trim() || undefined,
      customerPhone: phoneInput.trim() || undefined,
      customerName: nameInput.trim() || undefined
    });
    setIsEditingOrder(false);
    setIsSaving(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !ticket) return;

    const noteItem = {
      id: 'note_' + Date.now(),
      author: 'Support Agent',
      text: newNote.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedNotes = [...(ticket.notes || []), noteItem];
    setIsSaving(true);
    await onUpdateTicket(ticket.id, { notes: updatedNotes });
    setNewNote('');
    setIsSaving(false);
  };

  return (
    <div className="w-80 md:w-88 border-l border-slate-200 bg-white flex flex-col h-full shrink-0 overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>কাস্টমার সাপোর্ট ডট</span>
              {ticket && (
                <span className="font-mono text-[11px] text-orange-600 font-extrabold bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                  {ticket.ticketNumber}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500">ই-কমার্স অর্ডার ও কমপ্লেইন হাব</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* SLA & Urgency Bar */}
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
          isOverdue 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : ticket?.priority === 'urgent'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 shrink-0 text-slate-500" />
            <div>
              <p className="font-bold text-[11px] uppercase tracking-wider">
                {ticket?.status === 'resolved' ? '✓ সমাধান সম্পন্ন' : isOverdue ? '⚠️ SLA Overdue' : 'SLA রেসপন্স বাকি'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                {ticket?.status === 'resolved' 
                  ? 'টিকেট রিজলভড' 
                  : isOverdue 
                  ? 'জরুরি সমাধান প্রয়োজন' 
                  : `${hoursLeft} ঘণ্টা বাকি`}
              </p>
            </div>
          </div>
          {ticket?.priority === 'urgent' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
              URGENT
            </span>
          )}
        </div>

        {/* Customer Profile & Order Info */}
        <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              কাস্টমার ও অর্ডার তথ্য
            </span>
            <button
              onClick={() => setIsEditingOrder(!isEditingOrder)}
              className="text-[11px] text-orange-600 hover:underline font-semibold"
            >
              {isEditingOrder ? 'বাতিল' : 'এডিট'}
            </button>
          </div>

          {isEditingOrder ? (
            <div className="space-y-2 pt-1 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">গ্রাহকের নাম</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="যেমন: তানভীর আহমেদ"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">মোবাইল নম্বর</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="যেমন: +880 1712-XXXXXX"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">ই-কমার্স অর্ডার আইডি</label>
                <input
                  type="text"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  placeholder="যেমন: GG-98412"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-800"
                />
              </div>
              <button
                onClick={handleSaveCustomerInfo}
                disabled={isSaving}
                className="w-full mt-2 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs"
              >
                তথ্য সংরক্ষণ করুন
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-800 font-medium">
                <span className="text-slate-500 text-[11px]">নাম:</span>
                <span className="font-semibold">{ticket?.customerName || message?.customerName || effectiveEmail.split('@')[0]}</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 font-medium">
                <span className="text-slate-500 text-[11px]">ইমেইল:</span>
                <span className="font-mono text-[11px] truncate max-w-[160px]" title={effectiveEmail}>{effectiveEmail}</span>
              </div>
              <div className="flex items-center justify-between text-slate-800 font-medium">
                <span className="text-slate-500 text-[11px]">ফোন:</span>
                {ticket?.customerPhone || message?.customerPhone ? (
                  <a href={`tel:${ticket?.customerPhone || message?.customerPhone}`} className="font-mono text-[11px] text-blue-600 hover:underline flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {ticket?.customerPhone || message?.customerPhone}
                  </a>
                ) : (
                  <span className="text-slate-400 text-[11px] italic">যুক্ত করা হয়নি</span>
                )}
              </div>
              <div className="flex items-center justify-between text-slate-800 font-medium pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 text-[11px]">অর্ডার আইডি:</span>
                {ticket?.orderId || message?.orderId ? (
                  <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 text-xs">
                    #{ticket?.orderId || message?.orderId}
                  </span>
                ) : (
                  <span className="text-slate-400 text-[11px] italic">অর্ডার আনলিঙ্কড</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status, Priority & Category Controls */}
        {ticket && (
          <div className="space-y-3 pt-1">
            {/* Status Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                টিকেট স্ট্যাটাস
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleStatusChange('open')}
                  className={`py-1 text-[11px] font-bold rounded-md transition-all ${
                    ticket.status === 'open' 
                      ? 'bg-amber-500 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ওপেন
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('in_progress')}
                  className={`py-1 text-[11px] font-bold rounded-md transition-all ${
                    ticket.status === 'in_progress' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  প্রসেসিং
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('resolved')}
                  className={`py-1 text-[11px] font-bold rounded-md transition-all ${
                    ticket.status === 'resolved' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  সমাধান
                </button>
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                অভিযোগ / সমস্যা ক্যাটাগরি
              </label>
              <select
                value={ticket.category}
                onChange={(e) => handleCategoryChange(e.target.value as TicketCategory)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-800"
              >
                <option value="delivery_delay">📦 ডেলিভারি বিলম্ব (Delivery Delay)</option>
                <option value="damaged_item">💔 ক্ষতিগ্রস্ত বা ভুল প্রোডাক্ট (Damaged)</option>
                <option value="refund_request">💳 রিফান্ড রিকোয়েস্ট (Refund)</option>
                <option value="exchange">🔄 সাইজ/কালার এক্সচেঞ্জ (Exchange)</option>
                <option value="product_inquiry">💬 প্রোডাক্ট ও অর্ডার তথ্য (Inquiry)</option>
                <option value="payment_issue">💵 পেমেন্ট ভেরিফিকেশন (Payment)</option>
                <option value="other">📌 অন্যান্য সাধারণ বিষয় (Other)</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                অগ্রাধিকার (Priority)
              </label>
              <div className="grid grid-cols-4 gap-1 text-[10px] font-semibold">
                {(['low', 'normal', 'high', 'urgent'] as TicketPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePriorityChange(p)}
                    className={`py-1 rounded-md capitalize border transition-all ${
                      ticket.priority === p
                        ? p === 'urgent'
                          ? 'bg-rose-600 text-white border-rose-600 font-bold'
                          : p === 'high'
                          ? 'bg-amber-600 text-white border-amber-600 font-bold'
                          : 'bg-slate-800 text-white border-slate-800 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p === 'urgent' ? 'জরুরি' : p === 'high' ? 'উচ্চ' : p === 'normal' ? 'সাধারণ' : 'কম'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Fast Action Buttons */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            এক-ক্লিকে দ্রুত সমাধান
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenAiReply('complaint_apology')}
              className="px-2.5 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>AI দুঃখপ্রকাশ ও সমাধান</span>
            </button>
            <button
              onClick={onOpenTemplates}
              className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>রেডি টেমপ্লেট</span>
            </button>
          </div>
        </div>

        {/* Internal Team Notes */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            টিম প্রাইভেট নোট (গ্রাহক দেখতে পাবে না)
          </span>

          {ticket?.notes && ticket.notes.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {ticket.notes.map((note) => (
                <div key={note.id} className="p-2 rounded-lg bg-amber-50/60 border border-amber-200/70 text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-amber-800 font-bold">
                    <span>{note.author}</span>
                    <span className="font-normal font-mono text-[9px] text-slate-400">
                      {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-snug">{note.text}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddNote} className="flex gap-1.5">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="নোট লিখুন (যেমন: কাস্টমারকে কল করা হয়েছে)..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-800"
            />
            <button
              type="submit"
              disabled={isSaving || !newNote.trim()}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-lg text-xs font-bold shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Customer Previous History */}
        {customerHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              পূর্ববর্তী যোগাযোগ ({customerHistory.length}টি বার্তা)
            </span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {customerHistory.slice(0, 4).map((hist) => (
                <div key={hist.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-slate-700 truncate max-w-[140px]">{hist.subject}</span>
                    <span className="font-mono text-[9px]">{new Date(hist.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-500 text-[10px] line-clamp-1">{hist.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
