import React, { useState } from 'react';
import { Domain, Mailbox } from '../types';
import { Users, Plus, Trash2, Mail, HardDrive, CheckCircle2, Inbox, Key, Shield, AlertCircle, X, Edit2, Send } from 'lucide-react';

interface MailboxesViewProps {
  domains: Domain[];
  mailboxes: Mailbox[];
  onCreateMailbox: (data: {
    domainId: string;
    username: string;
    displayName: string;
    quotaMb: number;
  }) => Promise<void>;
  onDeleteMailbox: (id: string) => Promise<void>;
  onOpenWebmail: (address: string) => void;
  onOpenCompose?: (address: string) => void;
}

export const MailboxesView: React.FC<MailboxesViewProps> = ({
  domains,
  mailboxes,
  onCreateMailbox,
  onDeleteMailbox,
  onOpenWebmail,
  onOpenCompose
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState(domains[0]?.id || '');
  const [usernameInput, setUsernameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [quotaInput, setQuotaInput] = useState(5000);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Display Name State
  const [editingMailbox, setEditingMailbox] = useState<Mailbox | null>(null);
  const [editDisplayNameInput, setEditDisplayNameInput] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomainId || !usernameInput.trim()) return;

    setIsCreating(true);
    setErrorMsg(null);

    try {
      await onCreateMailbox({
        domainId: selectedDomainId,
        username: usernameInput.trim(),
        displayName: displayNameInput.trim() || usernameInput.trim(),
        quotaMb: quotaInput
      });
      setIsModalOpen(false);
      setUsernameInput('');
      setDisplayNameInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'মেলবক্স তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMailbox || !editDisplayNameInput.trim()) return;

    setIsUpdatingName(true);
    try {
      const res = await fetch(`/api/mailboxes/${editingMailbox.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editDisplayNameInput.trim() })
      });

      if (!res.ok) {
        throw new Error('ডিসপ্লে নেম আপডেট করতে সমস্যা হয়েছে');
      }

      const updated = await res.json();
      const idx = mailboxes.findIndex((m) => m.id === editingMailbox.id);
      if (idx >= 0) {
        mailboxes[idx].displayName = updated.displayName;
      }
      setEditingMailbox(null);
    } catch (err: any) {
      alert(err.message || 'ডিসপ্লে নেম আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setIsUpdatingName(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span>বিজনেস মেলবক্স এড্রেস বুক</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            আপনার ভেরিফায়েড ডোমেইনের অধীনে আনলিমিটেড পেশাদার ইমেইল এড্রেস তৈরি ও ডিসপ্লে নেম ম্যানেজ করুন।
          </p>
        </div>

        <button
          onClick={() => {
            if (domains.length > 0) {
              setSelectedDomainId(domains[0].id);
              setIsModalOpen(true);
            } else {
              alert('প্রথমে অন্তত একটি কাস্টম ডোমেইন যোগ করুন।');
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন মেলবক্স তৈরি করুন</span>
        </button>
      </div>

      {/* Mailboxes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mailboxes.length === 0 ? (
          <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            কোনো মেলবক্স তৈরি করা হয়নি।
          </div>
        ) : (
          mailboxes.map((mb) => (
            <div key={mb.id} className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-extrabold text-slate-900 font-mono text-base block truncate">
                      {mb.address}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-500 block">
                        ডিসপ্লে নেম: <strong className="text-slate-900 font-bold">{mb.displayName}</strong>
                      </span>
                      <button
                        onClick={() => {
                          setEditingMailbox(mb);
                          setEditDisplayNameInput(mb.displayName);
                        }}
                        className="px-2 py-0.5 text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors inline-flex items-center space-x-1 border border-orange-200 shrink-0"
                        title="Edit Display Name"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="text-[11px] font-bold">এডিট</span>
                      </button>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                    Active
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between font-mono">
                  <span>স্টোরেজ কোটা: {mb.quotaMb / 1000} GB</span>
                  <span className="text-emerald-700 font-bold">100% Free Cloud</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => (onOpenCompose ? onOpenCompose(mb.address) : onOpenWebmail(mb.address))}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>মেইল পাঠান</span>
                  </button>

                  <button
                    onClick={() => onOpenWebmail(mb.address)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-xs"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>ইনবক্স</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`আপনি কি সত্যিই ${mb.address} মেলবক্সটি মুছে ফেলতে চান?`)) {
                      onDeleteMailbox(mb.id);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors"
                  title="Delete Mailbox"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Display Name Modal */}
      {editingMailbox && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-orange-600" />
                <span>ডিসপ্লে নেম এডিট করুন (Edit Display Name)</span>
              </h3>
              <button
                onClick={() => setEditingMailbox(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDisplayName} className="space-y-4">
              <div>
                <span className="text-xs text-slate-500 font-mono block mb-2">
                  ইমেইল এড্রেস: <strong className="text-slate-900 font-bold">{editingMailbox.address}</strong>
                </span>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  নতুন ডিসপ্লে নেম (Display Name)
                </label>
                <input
                  type="text"
                  required
                  value={editDisplayNameInput}
                  onChange={(e) => setEditDisplayNameInput(e.target.value)}
                  placeholder="e.g. GiftGhor Customer Support"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-sans focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMailbox(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingName || !editDisplayNameInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
                >
                  <span>{isUpdatingName ? 'সেভ হচ্ছে...' : 'সেভ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Mailbox Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Users className="w-4 h-4 text-orange-600" />
                <span>নতুন ইমেইল তৈরি করুন (Create Mailbox)</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  ডোমেইন সিলেক্ট করুন (Domain)
                </label>
                <select
                  value={selectedDomainId}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                >
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.domainName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  ইউজারনেম প্রিফিক্স (Prefix)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="contact / sales / info"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                  />
                  <span className="text-xs text-slate-500 font-mono font-bold">
                    @{domains.find((d) => d.id === selectedDomainId)?.domainName || 'domain.com'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  ডিসপ্লে নেম (Display Name)
                </label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="e.g. GiftGhor Sales Team"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
                >
                  <span>{isCreating ? 'তৈরি হচ্ছে...' : 'মেলবক্স তৈরি করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
