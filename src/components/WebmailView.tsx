import React, { useState } from 'react';
import { EmailFolder, EmailMessage, Mailbox } from '../types';
import { Inbox, Send, FileText, AlertOctagon, Trash2, Star, Search, Plus, RefreshCw, Sparkles, X, Bot, Mail, CheckCircle2, ArrowRight, ArrowLeft, ShieldAlert, Upload, Image as ImageIcon } from 'lucide-react';

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
  initialComposeFromAddress
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

  // Inbound Test Modal State
  const [isInboundOpen, setIsInboundOpen] = useState(false);
  const [inboundSender, setInboundSender] = useState('jahidulislamyahoo01@gmail.com');
  const [inboundSubject, setInboundSubject] = useState('নতুন কাস্টমার কোয়ারি (Inbound Test Email)');
  const [inboundBody, setInboundBody] = useState('প্রিয় টিম,\n\nআপনাদের giftghor.world ওয়েবসাইট থেকে এই কাস্টমার মেইলটি এসেছে।');
  const [isInboundSimulating, setIsInboundSimulating] = useState(false);

  // AI Modal/Result State inside Webmail
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Current active mailbox
  const currentMailbox = mailboxes.find((m) => m.address === activeMailboxAddress) || mailboxes[0];

  // Filter messages by active mailbox & folder
  const filteredMessages = messages.filter((m) => {
    const matchesMailbox =
      !activeMailboxAddress ||
      m.mailboxAddress === activeMailboxAddress ||
      m.to === activeMailboxAddress ||
      m.from === activeMailboxAddress;
    const matchesFolder = m.folder === activeFolder;
    const matchesSearch =
      !searchQuery ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.body.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesMailbox && matchesFolder && matchesSearch;
  });

  const selectedMessage = messages.find((m) => m.id === selectedMessageId);

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

      const newMsg = await res.json();
      setIsInboundOpen(false);
      setActiveFolder('inbox');
      setSelectedMessageId(newMsg.id);
      setMobileShowReader(true);
      messages.unshift(newMsg);
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

  const folderItems = [
    { id: 'inbox', label: 'ইনবক্স (Inbox)', icon: Inbox, count: messages.filter((m) => m.folder === 'inbox' && !m.isRead).length },
    { id: 'sent', label: 'সেন্ড ইমেইল (Sent)', icon: Send, count: messages.filter((m) => m.folder === 'sent').length },
    { id: 'drafts', label: 'ড্রাফটস (Drafts)', icon: FileText },
    { id: 'spam', label: 'স্প্যাম (Spam)', icon: AlertOctagon },
    { id: 'trash', label: 'ট্র্যাশ (Trash)', icon: Trash2 },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col min-h-[680px] font-sans max-w-6xl mx-auto">
      {/* Top Mailbox Bar */}
      <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center font-bold shrink-0">
            <Inbox className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block font-semibold uppercase">বর্তমান সিলেক্টেড মেলবক্স:</span>
            <select
              value={activeMailboxAddress}
              onChange={(e) => setActiveMailboxAddress(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-slate-900"
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
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow-xs"
            title="Simulate / Ingest Inbound Email into Webmail"
          >
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">ইনকামিং মেইল সিঙ্ক / টেস্ট</span>
            <span className="sm:hidden">ইনকামিং টেস্ট</span>
          </button>

          <button
            onClick={() => setIsComposeOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>✉️ নতুন ইমেইল পাঠান</span>
          </button>
        </div>
      </div>

      {/* Cloudflare Routing & Outbound Explanation Banner */}
      <div className="bg-amber-50/90 border-b border-amber-200 px-5 py-3 text-xs text-amber-900 space-y-1">
        <div className="flex items-start space-x-2">
          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="block leading-relaxed">
              💡 <strong>ইমেইল সেন্ড/রিসিভ নির্দেশিকা:</strong> Cloudflare Email Routing আপনার ডোমেইনে আসা ইনকামিং মেইল জিমেইলে ফরওয়ার্ড করে। আর ওয়েবমেইল থেকে আসল জিমেইলে (যেমন <strong className="font-mono text-amber-950">jahidulislamyahoo01@gmail.com</strong>) রিয়েল আউটাউন্ড ইমেইল ডেসপ্যাচ করতে "এপিআই সেটিংস" সেকশনে আপনার ফ্রী <strong className="font-semibold text-amber-950">Resend API Key</strong> বসান।
            </span>
          </div>
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
        <div className={`md:col-span-4 lg:col-span-4 border-r border-slate-200 flex flex-col bg-white ${
          mobileShowReader ? 'hidden md:flex' : 'flex'
        }`}>
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
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-4 cursor-pointer transition-colors space-y-1 ${
                      isSelected
                        ? 'bg-orange-50/80 border-l-4 border-orange-600'
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

                    <div className={`text-xs truncate ${!msg.isRead ? 'text-orange-700 font-bold' : 'text-slate-800'}`}>
                      {msg.subject}
                    </div>

                    <p className="text-[11px] text-slate-500 truncate line-clamp-1">
                      {msg.body}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Email Reader Pane */}
        <div className={`md:col-span-5 lg:col-span-6 bg-slate-50/50 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto ${
          !mobileShowReader ? 'hidden md:flex' : 'flex'
        }`}>
          {selectedMessage ? (
            <div className="space-y-6">
              {/* Mobile Back Button */}
              <div className="md:hidden pb-2">
                <button
                  onClick={() => setMobileShowReader(false)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1 shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>← মেসেজ লিস্টে ফিরে যান</span>
                </button>
              </div>

              {/* Header Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {selectedMessage.subject}
                  </h3>
                  <button
                    onClick={() => onPatchMessage(selectedMessage.id, { isStarred: !selectedMessage.isStarred })}
                    className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-amber-500 hover:bg-slate-100 shadow-xs"
                  >
                    <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 font-mono gap-1 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-slate-400">From: </span>
                    <strong className="text-slate-900">{selectedMessage.from}</strong>
                  </div>
                  <div>{new Date(selectedMessage.date).toLocaleString()}</div>
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  <span className="text-slate-400">To: </span>
                  <span className="text-slate-800">{selectedMessage.to}</span>
                </div>
              </div>

              {/* Message Body */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap min-h-[200px]">
                {selectedMessage.body}
              </div>

              {/* AI Action Tools inside Webmail */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                  <Bot className="w-4 h-4 text-orange-600" />
                  <span>Gemini AI ওয়েবমেইল টুলকিট</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAiAction('reply_draft')}
                    disabled={isAiLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    <span>এআই দিয়ে রিপ্লাই ড্রাফট করুন</span>
                  </button>

                  <button
                    onClick={() => handleAiAction('summarize')}
                    disabled={isAiLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition-colors flex items-center space-x-1.5 border border-slate-200 disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>মেসেজ সামারি দেখুন</span>
                  </button>
                </div>

                {isAiLoading && (
                  <div className="text-xs text-orange-600 flex items-center space-x-2 py-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>এআই প্রসেস করছে...</span>
                  </div>
                )}

                {aiOutput && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {aiOutput}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs space-y-2 py-12">
              <Inbox className="w-8 h-8 text-slate-300" />
              <span>একটি ইমেইল নির্বাচন করুন সম্পূর্ণ বিষয়বস্তু দেখার জন্য।</span>
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    মেসেজ (Message Body)
                  </label>
                  <textarea
                    required
                    rows={4}
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

      {/* Inbound Test Modal */}
      {isInboundOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>ইনকামিং ইমেইল টেস্ট & ইনবক্স সিঙ্ক (Inbound Test)</span>
              </h3>
              <button
                onClick={() => setIsInboundOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimulateInbound} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  প্রেরকের ইমেইল (Sender)
                </label>
                <input
                  type="email"
                  required
                  value={inboundSender}
                  onChange={(e) => setInboundSender(e.target.value)}
                  placeholder="jahidulislamyahoo01@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  বিষয় (Subject)
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
                  মেসেজ বডি
                </label>
                <textarea
                  required
                  rows={4}
                  value={inboundBody}
                  onChange={(e) => setInboundBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-900 leading-relaxed font-sans"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isInboundSimulating}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs flex items-center space-x-2 disabled:opacity-50"
                >
                  <Inbox className="w-3.5 h-3.5" />
                  <span>{isInboundSimulating ? 'প্রসেস হচ্ছে...' : 'ইনবক্সে রিসিভ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
