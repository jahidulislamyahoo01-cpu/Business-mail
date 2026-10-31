import React, { useState } from 'react';
import { SupportTicket, SupportSettings, SupportTemplate, TicketStatus, TicketCategory, TicketPriority } from '../types';
import { 
  CheckCircle2, Clock, AlertCircle, Search, Filter, Plus, 
  ArrowRight, User, Phone, Sparkles, FileText, Settings, 
  ShieldAlert, ExternalLink, RefreshCw, CreditCard, 
  Wrench, Truck, HelpCircle, Send, MessageSquare, 
  Check, X, ChevronRight, DollarSign, Tag, Building2
} from 'lucide-react';
import { SupportTemplatesModal } from './SupportTemplatesModal';
import { AiInvoiceModal } from './AiInvoiceModal';

export type HelpDeskSection = 'overview' | 'billing' | 'support' | 'orders' | 'inquiries';

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
  const [activeSection, setActiveSection] = useState<HelpDeskSection>('overview');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Panels
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<SupportTicket | null>(null);

  // Quick Reply inside Ticket Drawer
  const [ticketReplyBody, setTicketReplyBody] = useState('');
  const [isSendingTicketReply, setIsSendingTicketReply] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);

  // New Ticket Form State
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newOrderId, setNewOrderId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('product_inquiry');
  const [newPriority, setNewPriority] = useState<TicketPriority>('normal');
  const [newInitialNote, setNewInitialNote] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Settings State
  const [businessName, setBusinessName] = useState(supportSettings.businessName || 'GiftGhor');
  const [hotline, setHotline] = useState(supportSettings.supportHotline || '+880 1800-GIFTGHOR');
  const [whatsapp, setWhatsapp] = useState(supportSettings.supportWhatsapp || '+880 1711-223344');
  const [hours, setHours] = useState(supportSettings.supportHours || '10:00 AM - 10:00 PM (Daily)');
  const [autoReply, setAutoReply] = useState(supportSettings.autoReplyAcknowledgment ?? true);
  const [geminiAutoResponder, setGeminiAutoResponder] = useState(supportSettings.geminiAutoResponderEnabled ?? true);
  const [geminiPrompt, setGeminiPrompt] = useState(
    supportSettings.geminiAutoResponderPrompt ||
      'Address customer inquiries respectfully and professionally. For orders, assure priority tracking. For damaged items, guarantee free replacement.'
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Helper to categorize tickets into sections
  const isTicketInSection = (t: SupportTicket, section: HelpDeskSection): boolean => {
    if (section === 'overview') return true;
    if (section === 'billing') {
      return (
        t.category === 'refund_request' || 
        t.category === 'payment_issue' || 
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes('billing') || tag.toLowerCase().includes('payment') || tag.toLowerCase().includes('invoice'))) ||
        t.subject.toLowerCase().includes('refund') ||
        t.subject.toLowerCase().includes('invoice') ||
        t.subject.toLowerCase().includes('bill') ||
        t.subject.toLowerCase().includes('payment')
      );
    }
    if (section === 'support') {
      return (
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes('tech') || tag.toLowerCase().includes('support') || tag.toLowerCase().includes('system'))) ||
        t.subject.toLowerCase().includes('dns') ||
        t.subject.toLowerCase().includes('server') ||
        t.subject.toLowerCase().includes('email') ||
        t.subject.toLowerCase().includes('login') ||
        t.subject.toLowerCase().includes('technical') ||
        t.category === 'other'
      );
    }
    if (section === 'orders') {
      return (
        t.category === 'delivery_delay' ||
        t.category === 'damaged_item' ||
        t.category === 'exchange' ||
        Boolean(t.orderId) ||
        t.subject.toLowerCase().includes('delivery') ||
        t.subject.toLowerCase().includes('courier') ||
        t.subject.toLowerCase().includes('order') ||
        t.subject.toLowerCase().includes('dispatch')
      );
    }
    if (section === 'inquiries') {
      return (
        t.category === 'product_inquiry' ||
        (!t.orderId && t.category !== 'refund_request' && t.category !== 'delivery_delay' && t.category !== 'damaged_item')
      );
    }
    return true;
  };

  // Section Ticket Counts
  const sectionCounts = {
    overview: tickets.length,
    billing: tickets.filter((t) => isTicketInSection(t, 'billing')).length,
    support: tickets.filter((t) => isTicketInSection(t, 'support')).length,
    orders: tickets.filter((t) => isTicketInSection(t, 'orders')).length,
    inquiries: tickets.filter((t) => isTicketInSection(t, 'inquiries')).length,
  };

  // Filtered Tickets for current section & status & search
  const filteredTickets = tickets.filter((t) => {
    const matchSection = isTicketInSection(t, activeSection);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      t.ticketNumber.toLowerCase().includes(q) ||
      t.customerEmail.toLowerCase().includes(q) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.orderId && t.orderId.toLowerCase().includes(q)) ||
      (t.customerPhone && t.customerPhone.toLowerCase().includes(q)) ||
      t.subject.toLowerCase().includes(q);
    return matchSection && matchStatus && matchSearch;
  });

  // Current section stats
  const currentSectionTickets = tickets.filter((t) => isTicketInSection(t, activeSection));
  const openCount = currentSectionTickets.filter((t) => t.status === 'open').length;
  const inProgressCount = currentSectionTickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = currentSectionTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const urgentCount = currentSectionTickets.filter((t) => t.priority === 'urgent' && t.status !== 'resolved').length;

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerEmail || !newSubject) return;
    setIsCreatingTicket(true);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: newCustomerEmail.trim(),
          customerName: newCustomerName.trim() || newCustomerEmail.split('@')[0],
          customerPhone: newCustomerPhone.trim() || undefined,
          orderId: newOrderId.trim() || undefined,
          subject: newSubject.trim(),
          category: newCategory,
          priority: newPriority,
          status: 'open',
          tags: [activeSection === 'billing' ? 'Billing' : activeSection === 'orders' ? 'Order Fulfillment' : activeSection === 'support' ? 'Technical Support' : 'Customer Inquiry']
        })
      });

      if (res.ok) {
        const created = await res.json();
        if (onUpdateTicket) {
          await onUpdateTicket(created.id, created);
        }
        setIsNewTicketOpen(false);
        setNewCustomerEmail('');
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewOrderId('');
        setNewSubject('');
        setSelectedTicketDetail(created);
      }
    } catch (err) {
      alert('টিকেট তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setIsCreatingTicket(false);
    }
  };

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
      signatureHtml: `<div style="font-family: sans-serif; font-size: 13px; color: #334155; margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 12px; line-height: 1.6;">
  <strong style="color: #4f46e5; font-size: 14px;">${businessName} Customer Support Desk</strong><br/>
  Hotline: ${hotline} | WhatsApp: ${whatsapp}<br/>
  Support Hours: ${hours}
</div>`
    });
    setIsSavingSettings(false);
    setIsSettingsOpen(false);
  };

  const handleDraftWithAiForTicket = async () => {
    if (!selectedTicketDetail) return;
    setIsAiDrafting(true);
    try {
      const res = await fetch('/api/ai/smart-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedTicketDetail.subject,
          body: `Ticket: ${selectedTicketDetail.ticketNumber}\nCustomer: ${selectedTicketDetail.customerName || selectedTicketDetail.customerEmail}\nIssue: ${selectedTicketDetail.subject}`,
          from: selectedTicketDetail.customerEmail,
          scenario: activeSection === 'billing' ? 'refund_exchange' : activeSection === 'orders' ? 'delivery_delay' : 'complaint_apology',
          customerName: selectedTicketDetail.customerName,
          orderId: selectedTicketDetail.orderId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTicketReplyBody(data.suggestedDraft || '');
      }
    } catch (e) {
      console.warn('AI Draft error:', e);
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleSendTicketReply = async () => {
    if (!selectedTicketDetail || !ticketReplyBody.trim()) return;
    setIsSendingTicketReply(true);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxAddress: 'contact@giftghor.world',
          senderName: `${businessName} Support Desk`,
          to: selectedTicketDetail.customerEmail,
          subject: `Re: [${selectedTicketDetail.ticketNumber}] ${selectedTicketDetail.subject}`,
          body: ticketReplyBody.trim()
        })
      });

      // Update ticket status to in_progress or resolved if requested
      await onUpdateTicket(selectedTicketDetail.id, {
        status: 'in_progress',
        updatedAt: new Date().toISOString()
      });

      setTicketReplyBody('');
      alert('সফলভাবে কাস্টমারকে ইমেইল রিপ্লাই পাঠানো হয়েছে!');
    } catch (e) {
      alert('রিপ্লাই সেন্ড করতে সমস্যা হয়েছে');
    } finally {
      setIsSendingTicketReply(false);
    }
  };

  // Section Header Metadata
  const getSectionMetadata = () => {
    switch (activeSection) {
      case 'billing':
        return {
          title: 'Billing & Payments',
          subtitle: 'Invoices, transaction verifications, refunds, bKash/Nagad/Bank receipts, and payment settlements.',
          icon: CreditCard,
          primaryAction: () => setIsInvoiceModalOpen(true),
          primaryActionText: 'Generate Invoice (AI)',
          primaryActionIcon: DollarSign
        };
      case 'support':
        return {
          title: 'Technical & System Support',
          subtitle: 'Email delivery issues, DNS/MX record errors, system diagnostics, and mailbox configurations.',
          icon: Wrench,
          primaryAction: () => setIsNewTicketOpen(true),
          primaryActionText: 'New Technical Ticket',
          primaryActionIcon: Plus
        };
      case 'orders':
        return {
          title: 'Orders & Delivery Desk',
          subtitle: 'Courier logistics, parcel delay tracking, damaged item replacements, and address updates.',
          icon: Truck,
          primaryAction: () => setIsNewTicketOpen(true),
          primaryActionText: 'New Order Issue',
          primaryActionIcon: Plus
        };
      case 'inquiries':
        return {
          title: 'General Inquiries & Customer Care',
          subtitle: 'Pre-sales questions, corporate partnerships, store hours, and standard customer support requests.',
          icon: HelpCircle,
          primaryAction: () => setIsTemplatesOpen(true),
          primaryActionText: 'Response Templates',
          primaryActionIcon: FileText
        };
      default:
        return {
          title: 'All Help Desk Tickets',
          subtitle: 'Centralized help desk managing billing, technical support, order logistics, and customer inquiries.',
          icon: MessageSquare,
          primaryAction: () => setIsNewTicketOpen(true),
          primaryActionText: 'Create New Ticket',
          primaryActionIcon: Plus
        };
    }
  };

  const meta = getSectionMetadata();
  const SectionIcon = meta.icon;
  const ActionIcon = meta.primaryActionIcon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4 bg-white">
      {/* Top Main Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <SectionIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span>{meta.title}</span>
                {urgentCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {urgentCount} Urgent
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {meta.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setIsTemplatesOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Templates</span>
          </button>

          <button
            onClick={meta.primaryAction}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-2xs"
          >
            <ActionIcon className="w-4 h-4" />
            <span>{meta.primaryActionText}</span>
          </button>
        </div>
      </div>

      {/* Help Desk Sub-Sections Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 text-xs">
        {[
          { id: 'overview', label: 'All Tickets', icon: MessageSquare, count: sectionCounts.overview },
          { id: 'billing', label: 'Billing & Payments', icon: CreditCard, count: sectionCounts.billing },
          { id: 'support', label: 'Technical Support', icon: Wrench, count: sectionCounts.support },
          { id: 'orders', label: 'Orders & Delivery', icon: Truck, count: sectionCounts.orders },
          { id: 'inquiries', label: 'General Inquiries', icon: HelpCircle, count: sectionCounts.inquiries },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSection(tab.id as HelpDeskSection);
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? 'bg-slate-800 text-indigo-300' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Counters for Current Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Section Total</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5 font-mono">{currentSectionTickets.length}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <SectionIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-700">Open Tickets</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5 font-mono">{openCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-700">In Progress</p>
            <p className="text-xl font-bold text-indigo-600 mt-0.5 font-mono">{inProgressCount}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
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

      {/* Search & Status Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status Pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'All', count: currentSectionTickets.length },
            { id: 'open', label: 'Open', count: openCount },
            { id: 'in_progress', label: 'In Progress', count: inProgressCount },
            { id: 'resolved', label: 'Resolved', count: resolvedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
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

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by ID, email, order #..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Ticket List View */}
      <div className="space-y-2.5">
        {filteredTickets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 space-y-3">
            <SectionIcon className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No tickets found in this section</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Any incoming email matching this department or manually created tickets will be listed here.
            </p>
            <button
              onClick={() => setIsNewTicketOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Ticket</span>
            </button>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicketDetail(ticket)}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group hover:bg-slate-50/50"
              >
                {/* Left Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {ticket.ticketNumber}
                    </span>
                    {ticket.orderId && (
                      <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                        Order #{ticket.orderId}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      ticket.priority === 'urgent'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className="text-slate-400 text-xs">
                      • {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                    {ticket.subject}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <User className="w-3 h-3 text-slate-400" />
                      {ticket.customerName || ticket.customerEmail.split('@')[0]}
                    </span>
                    <span className="font-mono text-slate-400">{ticket.customerEmail}</span>
                    {ticket.customerPhone && (
                      <span className="font-mono text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {ticket.customerPhone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Status & Action */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={ticket.status}
                    onChange={(e) => onUpdateTicket(ticket.id, { status: e.target.value as TicketStatus })}
                    className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-colors focus:outline-none ${
                      ticket.status === 'open'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : ticket.status === 'in_progress'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>

                  <button
                    onClick={() => setSelectedTicketDetail(ticket)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ticket Details Drawer / Modal */}
      {selectedTicketDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <SectionIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {selectedTicketDetail.ticketNumber}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Help Desk Ticket</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedTicketDetail.subject}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicketDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Customer Info Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Email</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTicketDetail.customerEmail}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Name</span>
                  <span className="font-bold text-slate-900">{selectedTicketDetail.customerName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Order ID</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedTicketDetail.orderId ? `#${selectedTicketDetail.orderId}` : 'None'}</span>
                </div>
              </div>

              {/* Status & Priority Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Ticket Status:</span>
                  {(['open', 'in_progress', 'resolved', 'closed'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={async () => {
                        await onUpdateTicket(selectedTicketDetail.id, { status: st });
                        setSelectedTicketDetail({ ...selectedTicketDetail, status: st });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        selectedTicketDetail.status === st
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    onOpenWebmailWithTicket(selectedTicketDetail.customerEmail, selectedTicketDetail.id);
                    setSelectedTicketDetail(null);
                  }}
                  className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Open Full Thread in Webmail</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Direct Reply Composer */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Send Reply to Customer ({selectedTicketDetail.customerEmail})</span>
                  </span>
                  <button
                    onClick={handleDraftWithAiForTicket}
                    disabled={isAiDrafting}
                    className="text-indigo-600 hover:text-indigo-700 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAiDrafting ? 'Drafting...' : 'AI Draft Response'}</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={ticketReplyBody}
                  onChange={(e) => setTicketReplyBody(e.target.value)}
                  placeholder="Type your official reply to the customer..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white leading-relaxed"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handleSendTicketReply}
                    disabled={isSendingTicketReply || !ticketReplyBody.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingTicketReply ? 'Sending...' : 'Send Reply'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Create Help Desk Ticket</h3>
              </div>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Email Address *</label>
                <input
                  type="email"
                  required
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Order ID (Optional)</label>
                  <input
                    type="text"
                    value={newOrderId}
                    onChange={(e) => setNewOrderId(e.target.value)}
                    placeholder="e.g. 90214"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Subject / Issue Title *</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Summary of issue..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="product_inquiry">General Inquiry</option>
                    <option value="refund_request">Billing & Refund</option>
                    <option value="delivery_delay">Delivery & Shipping</option>
                    <option value="damaged_item">Damaged Item</option>
                    <option value="other">Technical Support</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTicket}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs"
                >
                  {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Invoice Modal for Billing Desk */}
      <AiInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        senderMailboxAddress="billing@giftghorbd.com"
      />

      {/* Support Templates Modal */}
      <SupportTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        templates={templates}
        supportSettings={supportSettings}
        ticket={null}
        onSelectTemplate={(body, subject) => {
          onOpenComposeReply('', subject || 'Help Desk Response', body);
          setIsTemplatesOpen(false);
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
                  <h3 className="text-sm font-bold text-slate-900">Help Desk & AI Settings</h3>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp Support</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+880 1711-XXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Working Hours</label>
                <input
                  type="text"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="10:00 AM - 10:00 PM (Daily)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Gemini AI Auto-Responder</span>
                      <span className="text-[11px] text-slate-600">Automatically analyze incoming emails & reply based on department persona</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={geminiAutoResponder}
                    onChange={(e) => setGeminiAutoResponder(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
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
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs"
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
