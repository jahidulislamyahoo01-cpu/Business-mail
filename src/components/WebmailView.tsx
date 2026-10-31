import React, { useState } from 'react';
import { EmailFolder, EmailMessage, Mailbox, SupportTicket, SupportTemplate, SupportSettings, TicketStatus, TicketCategory, TicketPriority } from '../types';
import { 
  Inbox, Send, FileText, AlertOctagon, Trash2, Star, Search, Plus, 
  RefreshCw, Sparkles, X, Bot, Mail, CheckCircle2, ArrowRight, ArrowLeft, 
  ShieldAlert, Upload, Image as ImageIcon, Copy, Check, Code, Zap,
  ShoppingBag, Tag, Clock, User, Phone, ShieldCheck, ChevronDown, MessageSquare
} from 'lucide-react';
import { CustomerSupportSidebar } from './CustomerSupportSidebar';
import { SupportTemplatesModal } from './SupportTemplatesModal';
import { AiInvoiceModal } from './AiInvoiceModal';

interface WebmailViewProps {
  mailboxes: Mailbox[];
  activeMailboxAddress: string;
  setActiveMailboxAddress: (address: string) => void;
  messages: EmailMessage[];
  defaultLogoUrl?: string;
  onSendMessage: (data: { mailboxAddress: string; senderName?: string; to: string; subject: string; body: string; logoUrl?: string }) => Promise<any>;
  onPatchMessage: (id: string, updates: { isRead?: boolean; isStarred?: boolean; folder?: EmailFolder }) => Promise<void>;
  isComposeOpenControlled?: boolean;
  setIsComposeOpenControlled?: (open: boolean) => void;
  initialComposeFromAddress?: string;
  initialComposeTo?: string;
  initialComposeSubject?: string;
  initialComposeBody?: string;
  tickets?: SupportTicket[];
  supportTemplates?: SupportTemplate[];
  supportSettings?: SupportSettings;
  onUpdateTicket?: (id: string, updates: Partial<SupportTicket>) => Promise<void>;
  onSaveSupportSettings?: (settings: Partial<SupportSettings>) => Promise<void>;
}

export const WebmailView: React.FC<WebmailViewProps> = ({
  mailboxes,
  activeMailboxAddress,
  setActiveMailboxAddress,
  messages,
  defaultLogoUrl,
  onSendMessage,
  onPatchMessage,
  isComposeOpenControlled,
  setIsComposeOpenControlled,
  initialComposeFromAddress,
  initialComposeTo,
  initialComposeSubject,
  initialComposeBody,
  tickets = [],
  supportTemplates = [],
  supportSettings,
  onUpdateTicket,
  onSaveSupportSettings
}) => {
  const [activeFolder, setActiveFolder] = useState<EmailFolder>('inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(messages[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileShowReader, setMobileShowReader] = useState(false);

  // Compose Modal State (controlled or uncontrolled)
  const [internalIsComposeOpen, setInternalIsComposeOpen] = useState(false);
  const isComposeOpen = isComposeOpenControlled !== undefined ? isComposeOpenControlled : internalIsComposeOpen;
  const setIsComposeOpen = (open: boolean) => {
    if (setIsComposeOpenControlled) setIsComposeOpenControlled(open);
    setInternalIsComposeOpen(open);
  };

  const [composeFromMailbox, setComposeFromMailbox] = useState(initialComposeFromAddress || activeMailboxAddress || mailboxes[0]?.address || '');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [attachLogo, setAttachLogo] = useState(false);
  const [composeLogoUrl, setComposeLogoUrl] = useState(defaultLogoUrl || '');
  const [isSending, setIsSending] = useState(false);
  const [sendNotice, setSendNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialComposeFromAddress) {
      setComposeFromMailbox(initialComposeFromAddress);
    } else if (activeMailboxAddress) {
      setComposeFromMailbox(activeMailboxAddress);
    }
  }, [initialComposeFromAddress, activeMailboxAddress]);

  React.useEffect(() => {
    if (initialComposeTo !== undefined && initialComposeTo !== '') setComposeTo(initialComposeTo);
    if (initialComposeSubject !== undefined && initialComposeSubject !== '') setComposeSubject(initialComposeSubject);
    if (initialComposeBody !== undefined && initialComposeBody !== '') setComposeBody(initialComposeBody);
  }, [initialComposeTo, initialComposeSubject, initialComposeBody]);

  // Direct Photo PNG/JPG File Upload Handler
  const handleLogoFileUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে ছবি (PNG, JPG, JPEG, WEBP, SVG) ফাইল নির্বাচন করুন।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      // Automatically compress image if larger than 40KB
      if (file.type === 'image/svg+xml' || file.size < 40000) {
        setComposeLogoUrl(result);
      } else {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 320;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/png', 0.9);
            setComposeLogoUrl(compressed);
          } else {
            setComposeLogoUrl(result);
          }
        };
        img.onerror = () => setComposeLogoUrl(result);
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  // Inbound Test & Cloudflare Worker Modal State
  const [isInboundOpen, setIsInboundOpen] = useState(false);
  const [inboundTab, setInboundTab] = useState<'cloudflare' | 'test'>('cloudflare');
  const [inboundSender, setInboundSender] = useState('jahidulislamyahoo01@gmail.com');
  const [inboundSubject, setInboundSubject] = useState('নতুন কাস্টমার কোয়ারি (Inbound Test Email)');
  const [inboundBody, setInboundBody] = useState('প্রিয় টিম,\n\nআপনাদের giftghor.world ওয়েবসাইট থেকে এই কাস্টমার মেইলটি এসেছে।');
  const [isInboundSimulating, setIsInboundSimulating] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedWorkerCode, setCopiedWorkerCode] = useState(false);
  const [selectedWebhookHost, setSelectedWebhookHost] = useState<'render' | 'origin' | 'custom'>('render');
  const [customWebhookHost, setCustomWebhookHost] = useState('');

  const effectiveWebhookUrl =
    selectedWebhookHost === 'render'
      ? 'https://business-mail.onrender.com/api/webhooks/inbound-email'
      : selectedWebhookHost === 'custom' && customWebhookHost
      ? `${customWebhookHost.replace(/\/$/, '')}/api/webhooks/inbound-email`
      : typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/inbound-email`
      : 'https://business-mail.onrender.com/api/webhooks/inbound-email';

  // AI Modal/Result State inside Webmail
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Support Ticketing & Sidebar State
  const [supportFilter, setSupportFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [isCustomerSidebarOpen, setIsCustomerSidebarOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isAiScenarioLoading, setIsAiScenarioLoading] = useState<string | null>(null);
  const [includeSignature, setIncludeSignature] = useState(true);

  // Inline Quick Reply State for Webmail Reader
  const [inlineReplyBody, setInlineReplyBody] = useState('');
  const [isSendingInlineReply, setIsSendingInlineReply] = useState(false);
  const [isAiInlineDrafting, setIsAiInlineDrafting] = useState(false);
  const [inlineReplyNotice, setInlineReplyNotice] = useState<string | null>(null);

  const handleAiDraftInlineReply = async () => {
    if (!selectedMessage) return;
    setIsAiInlineDrafting(true);
    setInlineReplyNotice(null);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply_draft',
          selectedMailbox: activeMailboxAddress || currentMailbox?.address,
          emailBody: `From: ${selectedMessage.from}\nTo: ${selectedMessage.to}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.body}`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setInlineReplyBody(data.result || '');
      }
    } catch (err) {
      console.warn('AI Draft failed:', err);
    } finally {
      setIsAiInlineDrafting(false);
    }
  };

  const handleSendInlineReply = async () => {
    if (!selectedMessage || !inlineReplyBody.trim()) return;
    setIsSendingInlineReply(true);
    setInlineReplyNotice(null);

    const effectiveSenderAddress = activeMailboxAddress || currentMailbox?.address || 'contact@giftghor.world';
    const effectiveSenderMb = mailboxes.find((m) => m.address === effectiveSenderAddress) || currentMailbox;

    try {
      await onSendMessage({
        mailboxAddress: effectiveSenderAddress,
        senderName: effectiveSenderMb?.displayName || effectiveSenderAddress.split('@')[0],
        to: selectedMessage.from,
        subject: selectedMessage.subject.toLowerCase().startsWith('re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`,
        body: inlineReplyBody.trim()
      });

      setInlineReplyBody('');
      setInlineReplyNotice('রিপ্লাই সফলভাবে পাঠানো হয়েছে!');
      setTimeout(() => setInlineReplyNotice(null), 4000);
    } catch (err: any) {
      alert('রিপ্লাই সেন্ড করতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setIsSendingInlineReply(false);
    }
  };

  // Current active mailbox
  const currentMailbox = mailboxes.find((m) => m.address === activeMailboxAddress) || mailboxes[0];

  // Helper to find matching ticket for a message
  const getMessageTicket = (msg: EmailMessage): SupportTicket | undefined => {
    return tickets.find(
      (t) => t.id === msg.ticketId || t.messageId === msg.id || (msg.ticketNumber && t.ticketNumber === msg.ticketNumber) || t.customerEmail.toLowerCase() === msg.from.toLowerCase()
    );
  };

  // Filter messages by active mailbox, folder, support status & search
  const filteredMessages = messages.filter((m) => {
    const matchesMailbox =
      !activeMailboxAddress ||
      m.mailboxAddress === activeMailboxAddress ||
      m.to === activeMailboxAddress ||
      m.from === activeMailboxAddress;
    const matchesFolder = m.folder === activeFolder;

    let matchesSupport = true;
    if (activeFolder === 'inbox' && supportFilter !== 'all') {
      const tk = getMessageTicket(m);
      if (!tk) matchesSupport = false;
      else matchesSupport = tk.status === supportFilter;
    }

    const q = searchQuery.toLowerCase();
    const tk = getMessageTicket(m);
    const matchesSearch =
      !searchQuery ||
      m.subject.toLowerCase().includes(q) ||
      m.from.toLowerCase().includes(q) ||
      m.body.toLowerCase().includes(q) ||
      (tk && tk.ticketNumber.toLowerCase().includes(q)) ||
      (tk && tk.orderId && tk.orderId.toLowerCase().includes(q));

    return matchesMailbox && matchesFolder && matchesSupport && matchesSearch;
  });

  const selectedMessage = messages.find((m) => m.id === selectedMessageId);
  const selectedTicket = selectedMessage ? getMessageTicket(selectedMessage) : null;

  // Mark Read when selecting message
  const handleSelectMessage = (msg: EmailMessage) => {
    setSelectedMessageId(msg.id);
    setMobileShowReader(true);
    if (!msg.isRead) {
      onPatchMessage(msg.id, { isRead: true });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) return;
    setIsSending(true);
    setSendNotice(null);

    const effectiveSenderAddress = composeFromMailbox || currentMailbox?.address || activeMailboxAddress;
    const effectiveSenderMb = mailboxes.find((m) => m.address === effectiveSenderAddress) || currentMailbox;

    try {
      const res = await onSendMessage({
        mailboxAddress: effectiveSenderAddress,
        senderName: effectiveSenderMb?.displayName || effectiveSenderAddress.split('@')[0],
        to: composeTo.trim(),
        subject: composeSubject.trim(),
        body: composeBody.trim(),
        logoUrl: attachLogo ? composeLogoUrl : ''
      });

      if (res && res.notice) {
        setSendNotice(res.notice);
      }

      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setActiveFolder('sent');
      setTimeout(() => {
        setIsComposeOpen(false);
        setSendNotice(null);
      }, 4000);
    } catch (err: any) {
      alert('ইমেইল সেন্ড করতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInboundSimulating(true);

    try {
      const res = await fetch('/api/messages/test-inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxAddress: activeMailboxAddress || currentMailbox?.address || 'contact@giftghor.world',
          senderEmail: inboundSender,
          subject: inboundSubject,
          body: inboundBody
        })
      });

      const data = await res.json();
      setIsInboundOpen(false);
      setActiveFolder('inbox');
      if (data.inboundMessage) {
        messages.unshift(data.inboundMessage);
        if (data.autoReplyMessage) {
          messages.unshift(data.autoReplyMessage);
        }
        setSelectedMessageId(data.inboundMessage.id);
      } else if (data.id) {
        messages.unshift(data);
        setSelectedMessageId(data.id);
      }
      setMobileShowReader(true);
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (err) {
      alert('ইনকামিং ইমেইল প্রসেস করতে সমস্যা হয়েছে।');
    } finally {
      setIsInboundSimulating(false);
    }
  };

  // Call Gemini AI for Webmail features (Summarize or Reply Draft)
  const handleAiAction = async (action: 'summarize' | 'reply_draft') => {
    if (!selectedMessage) return;
    setIsAiLoading(true);
    setAiOutput(null);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          emailBody: `From: ${selectedMessage.from}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.body}`
        })
      });

      const data = await res.json();
      setAiOutput(data.result || 'প্রসেস করা সম্ভব হয়নি।');
    } catch (err) {
      setAiOutput('ত্রুটি: এআই সার্ভিসটি সাড়া দিচ্ছে না।');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleOpenAiScenarioReply = async (scenario: 'complaint_apology' | 'delivery_delay' | 'refund_exchange' | 'product_inquiry') => {
    if (!selectedMessage) return;
    setIsAiScenarioLoading(scenario);

    try {
      const res = await fetch('/api/ai/smart-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedMessage.subject,
          body: selectedMessage.body,
          from: selectedMessage.from,
          scenario,
          customerName: selectedTicket?.customerName || selectedMessage.customerName,
          orderId: selectedTicket?.orderId || selectedMessage.orderId
        })
      });

      const data = await res.json();
      const draft = data.suggestedDraft || '';

      const tkNum = selectedTicket?.ticketNumber || 'TK-2026';
      setComposeTo(selectedMessage.from);
      setComposeSubject(`Re: [${tkNum}] ${selectedMessage.subject}`);

      let finalBody = draft;
      if (includeSignature && supportSettings?.signatureHtml) {
        const plainSig = `\n\n--\n${supportSettings.businessName || 'GiftGhor'} কাস্টমার কেয়ার\nহটলাইন: ${supportSettings.supportHotline || '+880 1800-GIFTGHOR'} | হোয়াটসঅ্যাপ: ${supportSettings.supportWhatsapp || '+880 1711-223344'}\nসার্ভিস সময়: ${supportSettings.supportHours || 'সকাল ১০:০০টা - রাত ১০:০০টা'}`;
        finalBody += plainSig;
      }

      setComposeBody(finalBody);
      setIsComposeOpen(true);
    } catch (err) {
      alert('এআই ড্রাফট তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setIsAiScenarioLoading(null);
    }
  };

  const handleCreateTicketForMessage = async () => {
    if (!selectedMessage) return;
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: selectedMessage.from,
          customerName: selectedMessage.customerName || selectedMessage.from.split('@')[0],
          subject: selectedMessage.subject,
          messageId: selectedMessage.id,
          orderId: selectedMessage.orderId,
          customerPhone: selectedMessage.customerPhone,
          status: 'open',
          priority: 'normal',
          category: 'product_inquiry',
          tags: ['Customer Support']
        })
      });
      if (res.ok) {
        const newTk = await res.json();
        if (onUpdateTicket) {
          await onUpdateTicket(newTk.id, newTk);
        }
      }
    } catch (e) {
      alert('টিকেট তৈরি করা সম্ভব হয়নি।');
    }
  };

  const folderItems = [
    { id: 'inbox', label: 'ইনবক্স (Inbox)', icon: Inbox, count: messages.filter((m) => m.folder === 'inbox' && !m.isRead).length },
    { id: 'sent', label: 'সেন্ড ইমেইল (Sent)', icon: Send, count: messages.filter((m) => m.folder === 'sent').length },
    { id: 'drafts', label: 'ড্রাফটস (Drafts)', icon: FileText },
    { id: 'spam', label: 'স্প্যাম (Spam)', icon: AlertOctagon },
    { id: 'trash', label: 'ট্র্যাশ (Trash)', icon: Trash2 },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col min-h-[680px] font-sans max-w-6xl mx-auto">
      {/* Top Mailbox Bar */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold shrink-0">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-semibold uppercase">বর্তমান সিলেক্টেড মেলবক্স:</span>
            <select
              value={activeMailboxAddress}
              onChange={(e) => setActiveMailboxAddress(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
            >
              {mailboxes.map((mb) => (
                <option key={mb.id} value={mb.address}>
                  {mb.address} ({mb.displayName})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsInboundOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-2xs"
            title="Simulate / Ingest Inbound Email into Webmail"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">ইনকামিং টেস্ট</span>
            <span className="sm:hidden">টেস্ট</span>
          </button>

          <button
            onClick={() => setIsComposeOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-2xs flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>নতুন ইমেইল পাঠান</span>
          </button>
        </div>
      </div>

      {/* Mobile Folder Navigation Bar */}
      <div className="md:hidden bg-slate-100 border-b border-slate-200 px-3 py-2 flex space-x-1.5 overflow-x-auto scrollbar-none">
        {folderItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeFolder === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveFolder(item.id as EmailFolder);
                setMobileShowReader(false);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.count ? (
                <span className="px-1.5 py-0.2 text-[10px] bg-orange-600 text-white rounded-full font-bold">
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Main Webmail Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Sidebar Folders (Desktop) */}
        <div className="hidden md:block md:col-span-3 lg:col-span-2 bg-slate-50/70 border-r border-slate-200 p-3 space-y-1">
          {folderItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeFolder === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveFolder(item.id as EmailFolder);
                  setMobileShowReader(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count ? (
                  <span className="px-2 py-0.5 text-[10px] bg-orange-600 text-white font-bold rounded-full">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Email Message List */}
        <div className={`border-r border-slate-200 flex flex-col bg-white ${
          isCustomerSidebarOpen ? 'md:col-span-4 lg:col-span-3' : 'md:col-span-4 lg:col-span-4'
        } ${mobileShowReader ? 'hidden md:flex' : 'flex'}`}>
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ইমেইল সার্চ করুন..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">
              {activeFolder} ({filteredMessages.length})
            </span>
          </div>

          {/* Quick Support Filter for Inbox */}
          {activeFolder === 'inbox' && (
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-1 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-semibold shrink-0 text-[10px] uppercase">টিকেট:</span>
              <div className="flex items-center gap-1">
                {(['all', 'open', 'in_progress', 'resolved'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSupportFilter(st)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-colors ${
                      supportFilter === st
                        ? 'bg-slate-900 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'সকল' : st === 'open' ? 'ওপেন' : st === 'in_progress' ? 'প্রসেসিং' : 'সমাধান'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
                <p>"{activeFolder}" ফোল্ডারে কোনো মেসেজ পাওয়া যায়নি।</p>
                <button
                  onClick={() => setIsInboundOpen(true)}
                  className="text-xs text-orange-600 font-bold hover:underline inline-block mt-1"
                >
                  + ইনকামিং ইমেইল টেস্ট করুন
                </button>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessageId === msg.id;
                const tk = getMessageTicket(msg);
                const tkNum = tk?.ticketNumber || msg.ticketNumber;
                const ordId = tk?.orderId || msg.orderId;
                const status = tk?.status || msg.ticketStatus;
                const priority = tk?.priority || msg.ticketPriority;

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-4 cursor-pointer transition-colors space-y-1 ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                        : msg.isRead
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-slate-50 font-bold hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={`truncate max-w-[150px] ${!msg.isRead ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                        {activeFolder === 'sent' ? `To: ${msg.to}` : msg.from}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className={`text-xs truncate ${!msg.isRead ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                      {msg.subject}
                    </div>

                    <p className="text-[11px] text-slate-500 truncate line-clamp-1">
                      {msg.body}
                    </p>

                    {/* Support Ticket & Order Tag */}
                    {(tkNum || ordId || priority === 'urgent' || status) && (
                      <div className="flex items-center gap-1.5 pt-1 text-[10px] flex-wrap">
                        {tkNum && (
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            {tkNum}
                          </span>
                        )}
                        {ordId && (
                          <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            #{ordId}
                          </span>
                        )}
                        {priority === 'urgent' && (
                          <span className="font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200">
                            জরুরি
                          </span>
                        )}
                        {status && (
                          <span className={`px-1.5 py-0.2 rounded font-medium ${
                            status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                            status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {status === 'resolved' ? 'সমাধান' : status === 'in_progress' ? 'প্রসেসিং' : 'ওপেন'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Email Reader Pane - Clean Full Width */}
        <div className={`md:col-span-5 lg:col-span-7 bg-white p-6 sm:p-8 flex flex-col justify-between overflow-y-auto ${
          !mobileShowReader ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedMessage ? (
            <div className="space-y-6">
              {/* Mobile Back Button */}
              <div className="md:hidden pb-2">
                <button
                  onClick={() => setMobileShowReader(false)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1 shadow-2xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← মেসেজ লিস্টে ফিরে যান</span>
                </button>
              </div>

              {/* Clean Sender Info & Minimal Action Toolbar */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
                    {(selectedMessage.from.split('<')[0].replace(/"/g, '').trim()[0] || 'U').toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedMessage.from.split('<')[0].replace(/"/g, '').trim() || selectedMessage.from}
                      </span>
                      {selectedTicket && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                          Help Desk #{selectedTicket.ticketNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>From: <strong className="text-slate-800">{selectedMessage.from}</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>To: {selectedMessage.to}</span>
                    </div>
                  </div>
                </div>

                {/* Minimal, Clean Action Toolbar */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setComposeTo(selectedMessage.from);
                      setComposeSubject(selectedMessage.subject.toLowerCase().startsWith('re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`);
                      setIsComposeOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-2xs"
                    title="নতুন উইন্ডোতে রিপ্লাই কম্পোজ করুন"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>

                  <button
                    onClick={() => onPatchMessage(selectedMessage.id, { isStarred: !selectedMessage.isStarred })}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-amber-500 hover:bg-slate-50 transition-colors shadow-2xs"
                    title="স্টার মার্ক করুন"
                  >
                    <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-amber-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => onPatchMessage(selectedMessage.id, { folder: 'trash' })}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors shadow-2xs"
                    title="ডিলিট / ট্র্যাশে পাঠান"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subject Title */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                  {selectedMessage.subject}
                </h2>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  {new Date(selectedMessage.date).toLocaleString()}
                </div>
              </div>

              {/* Message Body - Spacious, Pristine, High Contrast */}
              <div className="bg-white rounded-xl text-slate-900 text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap font-sans min-h-[200px] select-text py-2">
                {(() => {
                  const raw = selectedMessage.body || '';
                  const singleLine = raw.replace(/\r?\n/g, '').trim();
                  if (/^[A-Za-z0-9+/=]{40,}$/.test(singleLine)) {
                    try {
                      const decoded = atob(singleLine);
                      if (decoded && decoded.length > 5) return decoded;
                    } catch (_) {}
                  }
                  return raw;
                })()}
              </div>

              {/* Inline Quick Reply Drawer */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Quick Reply to <strong className="font-mono">{selectedMessage.from.split('<')[0].replace(/"/g, '').trim()}</strong></span>
                  </span>

                  <button
                    onClick={handleAiDraftInlineReply}
                    disabled={isAiInlineDrafting}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAiInlineDrafting ? 'AI Drafting...' : 'AI Assist Draft'}</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={inlineReplyBody}
                  onChange={(e) => setInlineReplyBody(e.target.value)}
                  placeholder="Type your response directly to customer..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 leading-relaxed shadow-2xs"
                />

                {inlineReplyNotice && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{inlineReplyNotice}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Sending from: <strong className="text-slate-800">{activeMailboxAddress || currentMailbox?.address}</strong>
                  </span>

                  <button
                    onClick={handleSendInlineReply}
                    disabled={isSendingInlineReply || !inlineReplyBody.trim()}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-2xs disabled:opacity-50 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSendingInlineReply ? 'Sending...' : 'Send Reply'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 py-16">
              <Inbox className="w-10 h-10 text-slate-300" />
              <span className="text-sm font-semibold text-slate-600">No email selected</span>
              <p className="text-xs text-slate-400">Select any message from the list to read full content</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header (Fixed) */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center space-x-2">
                <Send className="w-4 h-4 text-orange-600" />
                <span>নতুন ইমেইল পাঠান (Compose Message)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Container */}
            <form onSubmit={handleSend} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-6 space-y-3.5 flex-1 overflow-y-auto">
                {/* From Mailbox */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <span>প্রেরক মেলবক্স (From Mailbox)</span>
                    <span className="text-[11px] text-orange-600 font-medium font-sans">যে ডোমেইন থেকে মেইল পাঠাতে চান</span>
                  </label>
                  <select
                    value={composeFromMailbox || activeMailboxAddress}
                    onChange={(e) => setComposeFromMailbox(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-900"
                  >
                    {mailboxes.map((mb) => (
                      <option key={mb.id} value={mb.address}>
                        {mb.address} ({mb.displayName || mb.domainName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recipient */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
                    <span>প্রাপক (Recipient Email)</span>
                    <span className="text-[10px] text-slate-400 font-sans">সঠিক ইমেইল দিন (যেমন: jahidulislamyahoo01@gmail.com)</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="jahidulislamyahoo01@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    বিষয় (Subject)
                  </label>
                  <input
                    type="text"
                    required
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="GiftGhor কাস্টম ডোমেইন মেইল টেস্ট"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      মেসেজ (Message Body)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTemplatesModalOpen(true)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>রেডি টেমপ্লেট নির্বাচন</span>
                    </button>
                  </div>
                  <textarea
                    required
                    rows={5}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="আপনার বার্তাটি এখানে লিখুন..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-900 leading-relaxed font-sans resize-y"
                  />
                </div>

                {/* Logo Branding Attachment Option */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 font-bold text-amber-950 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={attachLogo}
                        onChange={(e) => setAttachLogo(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>ইমেইলে ব্র্যান্ড লোগো হেডার যুক্ত করুন</span>
                    </label>
                    <span className="text-[10px] bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      Header Logo
                    </span>
                  </div>

                  {attachLogo && (
                    <div className="pt-1.5 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 shadow-xs">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>ফটো আপলোড করুন</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoFileUpload(file);
                            }}
                          />
                        </label>

                        {composeLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setComposeLogoUrl('')}
                            className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100/80 bg-rose-50 border border-rose-200 rounded-lg"
                          >
                            লোগো সরান
                          </button>
                        )}
                      </div>

                      {composeLogoUrl ? (
                        <div className="p-2 bg-slate-900 rounded-xl border border-slate-700 flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-950 rounded-lg border border-amber-500/40 p-1 flex items-center justify-center shrink-0">
                            <img
                              src={composeLogoUrl}
                              alt="Logo Header Preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0 text-[11px]">
                            <span className="text-emerald-400 font-bold block flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>লোগো যুক্ত হয়েছে</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <input
                          type="url"
                          value={composeLogoUrl}
                          onChange={(e) => setComposeLogoUrl(e.target.value)}
                          placeholder="অথবা অনলাইন ছবির লিংক: https://..."
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
                        />
                      )}
                    </div>
                  )}
                </div>

                {sendNotice && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
                    <strong className="block font-bold">ইনফরমেশন নোট:</strong>
                    <span>{sendNotice}</span>
                  </div>
                )}
              </div>

              {/* PERMANENTLY VISIBLE BOTTOM ACTION FOOTER (NEVER CUT OFF ON ANY SCREEN) */}
              <div className="p-3.5 sm:p-4 bg-slate-100/90 border-t border-slate-200/90 shrink-0 flex items-center justify-between gap-3">
                <div className="min-w-0 text-[11px] text-slate-600 truncate">
                  প্রেরক: <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded-md border border-slate-200">{composeFromMailbox || currentMailbox?.address || activeMailboxAddress}</span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-xs"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-6 sm:px-7 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'পাঠানো হচ্ছে...' : 'ইমেইল সেন্ড করুন'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (ALWAYS VISIBLE ON SMARTPHONES) */}
      <button
        onClick={() => setIsComposeOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs px-4 py-3 rounded-full shadow-2xl flex items-center space-x-2 border-2 border-white/60 active:scale-95 transition-transform"
        title="নতুন ইমেইল পাঠান"
      >
        <Send className="w-4 h-4" />
        <span>মেইল পাঠান</span>
      </button>

      {/* Inbound Email Sync & Cloudflare Worker Modal */}
      {isInboundOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    ইনকামিং ইমেইল অটো-সিঙ্ক (Inbound Email Setup)
                  </h3>
                  <p className="text-[11px] text-slate-500">আপনার ডোমেইনে পাঠানো যেকোনো ইমেইল সরাসরি এই ইনবক্সে রিসিভ করার সিস্টেম</p>
                </div>
              </div>
              <button
                onClick={() => setIsInboundOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setInboundTab('cloudflare')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all ${
                  inboundTab === 'cloudflare'
                    ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Cloudflare Worker অটো-সিঙ্ক (১০০% ফ্রি)</span>
              </button>
              <button
                type="button"
                onClick={() => setInboundTab('test')}
                className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all ${
                  inboundTab === 'test'
                    ? 'bg-white text-orange-600 border-t-2 border-orange-500 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>ইনস্ট্যান্ট টেস্ট মেইল সিমুলেটর</span>
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              {inboundTab === 'cloudflare' ? (
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-950 space-y-1">
                    <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>কীভাবে কাজ করবে:</span>
                    </div>
                    <p className="leading-relaxed text-[11px] text-emerald-900">
                      Cloudflare Email Routing-এর ফ্রি <strong>"Email Workers"</strong> ফিচারের মাধ্যমে যেকোনো ব্যক্তি যখন আপনার ডোমেইনে (<strong className="font-mono">contact@giftghor.world</strong> বা <strong className="font-mono">hello@giftghorbd.com</strong>) ইমেইল পাঠাবে, সাথে সাথে ক্লাউডফ্লেয়ার তা এই MailCloud ইনবক্সে পোস্ট করে দেবে এবং ব্যাকআপ হিসেবে আপনার জিমেইলেও পাঠাবে!
                    </p>
                  </div>

                  {/* Webhook Host Selector */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      ১. আপনার ইনবাউন্ড ওয়েবহুক URL (Webhook Endpoint):
                    </label>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedWebhookHost('render')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all border ${
                          selectedWebhookHost === 'render'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        🚀 Render লাইভ সার্ভার (business-mail.onrender.com)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWebhookHost('origin')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all border ${
                          selectedWebhookHost === 'origin'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        🌐 বর্তমান ডোমেইন (Current Origin)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWebhookHost('custom')}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all border ${
                          selectedWebhookHost === 'custom'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        ✏️ কাস্টম ডোমেইন URL
                      </button>
                    </div>

                    {selectedWebhookHost === 'custom' && (
                      <input
                        type="url"
                        placeholder="https://mail.giftghorbd.com"
                        value={customWebhookHost}
                        onChange={(e) => setCustomWebhookHost(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={effectiveWebhookUrl}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(effectiveWebhookUrl);
                          setCopiedWebhook(true);
                          setTimeout(() => setCopiedWebhook(false), 2500);
                        }}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center space-x-1 shrink-0"
                      >
                        {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedWebhook ? 'কপি হয়েছে!' : 'URL কপি'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Cloudflare Worker Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        ২. Cloudflare Email Worker কোড (১ ক্লিকে কপি করুন):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const code = `export default {\n  async email(message, env, ctx) {\n    try {\n      const rawText = await new Response(message.raw).text();\n      const subject = message.headers.get("subject") || "(No Subject)";\n\n      // ১. সরাসরি MailCloud Pro ইনবক্সে মেইল রিসিভ করুন\n      await fetch("${effectiveWebhookUrl}", {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({\n          from: message.from,\n          to: message.to,\n          subject: subject,\n          text: rawText\n        })\n      });\n    } catch (err) {\n      console.error("MailCloud Inbound Webhook Error:", err);\n    }\n\n    // ২. একই সাথে আপনার নিজস্ব জিমেইলেও ব্যাকআপ কপি যাবে\n    try {\n      await message.forward("jahidulislamyahoo01@gmail.com");\n    } catch (fwdErr) {\n      console.error("Gmail Forward Backup Error:", fwdErr);\n    }\n  }\n};`;
                          navigator.clipboard.writeText(code);
                          setCopiedWorkerCode(true);
                          setTimeout(() => setCopiedWorkerCode(false), 2500);
                        }}
                        className="text-orange-600 hover:text-orange-700 font-bold text-xs flex items-center space-x-1"
                      >
                        {copiedWorkerCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedWorkerCode ? 'কোড কপি সম্পন্ন!' : 'কোড কপি করুন'}</span>
                      </button>
                    </div>

                    <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 space-y-1">
                      <div className="text-slate-400">// Cloudflare Dashboard → Email Routing → Email Workers</div>
                      <div className="text-amber-300">export default &#123;</div>
                      <div className="pl-3 text-slate-200">async email(message, env, ctx) &#123;</div>
                      <div className="pl-6 text-emerald-400">try &#123;</div>
                      <div className="pl-9 text-slate-400">const rawText = await new Response(message.raw).text();</div>
                      <div className="pl-9 text-slate-400">const subject = message.headers.get("subject") || "(No Subject)";</div>
                      <div className="pl-9 text-emerald-400">// ১. MailCloud Pro ইনবক্সে মেইল পাঠান</div>
                      <div className="pl-9 text-slate-200">await fetch("{effectiveWebhookUrl}", &#123;</div>
                      <div className="pl-12 text-slate-300">method: "POST",</div>
                      <div className="pl-12 text-slate-300">headers: &#123; "Content-Type": "application/json" &#125;,</div>
                      <div className="pl-12 text-slate-300">body: JSON.stringify(&#123; from: message.from, to: message.to, subject, text: rawText &#125;)</div>
                      <div className="pl-9 text-slate-200">&#125;);</div>
                      <div className="pl-6 text-emerald-400">&#125; catch (err) &#123; console.error(err); &#125;</div>
                      <div className="pl-6 text-emerald-400">// ২. আপনার নিজস্ব জিমেইলে ব্যাকআপ ফরোয়ার্ড</div>
                      <div className="pl-6 text-emerald-400">try &#123;</div>
                      <div className="pl-9 text-slate-200">await message.forward("jahidulislamyahoo01@gmail.com");</div>
                      <div className="pl-6 text-emerald-400">&#125; catch (fwdErr) &#123; console.error(fwdErr); &#125;</div>
                      <div className="pl-3 text-slate-200">&#125;</div>
                      <div className="text-amber-300">&#125;;</div>
                    </div>
                  </div>

                  {/* 3 Steps Guide */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs">সেটআপ করার ৩টি সহজ ধাপ:</h4>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 text-[11px]">
                      <li>Cloudflare ড্যাশবোর্ডে গিয়ে আপনার ডোমেইন নির্বাচন করুন &gt; <strong>Email Routing</strong> &gt; <strong>Email Workers</strong> ট্যাবে যান &gt; <strong>"Create Worker"</strong> এ ক্লিক করুন।</li>
                      <li>উপরে কপি করা স্ক্রিপ্টটি পেস্ট করে <strong>"Save and Deploy"</strong> দিন।</li>
                      <li>এরপর <strong>Routing Rules</strong> ট্যাবে গিয়ে Catch-All Rule বা আপনার ডোমেইন মেলবক্সে Action সিলেক্ট করুন: <strong>"Send to Worker"</strong> (তৈরি করা Worker সিলেক্ট করুন)।</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSimulateInbound} className="space-y-3.5">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
                    💡 এই সিমুলেটর ব্যবহার করে আপনি দেখতে পারবেন যে কোনো কাস্টমার বাইরের জিমেইল বা অন্য যে কোনো ঠিকানা থেকে আপনার বিজনেস মেলবক্সে মেইল পাঠালে তা কীভাবে MailCloud ইনবক্সে প্রদর্শিত হয়।
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      প্রাপক মেলবক্স (Target Inbox):
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={activeMailboxAddress || currentMailbox?.address || 'contact@giftghor.world'}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      বাইরের প্রেরকের ইমেইল (External Sender):
                    </label>
                    <input
                      type="email"
                      required
                      value={inboundSender}
                      onChange={(e) => setInboundSender(e.target.value)}
                      placeholder="customer@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      বিষয় (Subject):
                    </label>
                    <input
                      type="text"
                      required
                      value={inboundSubject}
                      onChange={(e) => setInboundSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      মেসেজ বডি (Email Content):
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={inboundBody}
                      onChange={(e) => setInboundBody(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-900 leading-relaxed font-sans"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isInboundSimulating}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      <span>{isInboundSimulating ? 'প্রসেস হচ্ছে...' : 'সরাসরি ইনবক্সে রিসিভ টেস্ট করুন'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">MailCloud Pro লাইভ ইনবাউন্ড লিসেনার সক্রিয়</span>
              <button
                type="button"
                onClick={() => setIsInboundOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Ready Templates Modal */}
      <SupportTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        templates={supportTemplates}
        supportSettings={supportSettings}
        ticket={selectedTicket}
        onSelectTemplate={(body, subject) => {
          if (subject && (!composeSubject || composeSubject.trim() === '')) {
            setComposeSubject(subject);
          }
          setComposeBody((prev) => (prev ? prev + '\n\n' + body : body));
          if (selectedMessage && (!composeTo || composeTo.trim() === '')) {
            setComposeTo(selectedMessage.from);
          }
          setIsComposeOpen(true);
        }}
      />

      {/* AI Invoice & Commercial Proposal Modal */}
      <AiInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        initialClientEmail={selectedMessage?.from || ''}
        initialClientName={selectedTicket?.customerName || selectedMessage?.customerName || ''}
        senderMailboxAddress={activeMailboxAddress || mailboxes[0]?.address || 'contact@giftghor.world'}
      />
    </div>
  );
};
