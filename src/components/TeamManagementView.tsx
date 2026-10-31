import React, { useState } from 'react';
import { Mailbox, TeamUser } from '../types';
import { Users, UserPlus, Shield, Lock, CheckCircle2, Trash2, Edit, Key, Mail, Check, X, ShieldAlert } from 'lucide-react';

interface TeamManagementViewProps {
  teamUsers: TeamUser[];
  mailboxes: Mailbox[];
  onCreateOrUpdateTeamUser: (data: Partial<TeamUser>) => Promise<void>;
  onDeleteTeamUser: (id: string) => Promise<void>;
}

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  teamUsers,
  mailboxes,
  onCreateOrUpdateTeamUser,
  onDeleteTeamUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedMailboxes, setSelectedMailboxes] = useState<string[]>([]);
  const [status, setStatus] = useState<'active' | 'disabled'>('active');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setSelectedMailboxes(mailboxes.map((m) => m.address)); // Default select all or empty
    setStatus('active');
    setNotice(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: TeamUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(user.password || '');
    setSelectedMailboxes(user.assignedMailboxes || []);
    setStatus(user.status);
    setNotice(null);
    setIsModalOpen(true);
  };

  const handleToggleMailbox = (address: string) => {
    if (selectedMailboxes.includes(address)) {
      setSelectedMailboxes(selectedMailboxes.filter((a) => a !== address));
    } else {
      setSelectedMailboxes([...selectedMailboxes, address]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    if (selectedMailboxes.length === 0) {
      alert('কমপক্ষে একটি মেলবক্স অ্যাক্সেস নির্বাচন করুন।');
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      await onCreateOrUpdateTeamUser({
        id: editingUser?.id,
        name,
        email,
        password: password || undefined,
        assignedMailboxes: selectedMailboxes,
        status
      });

      setNotice('টিম মেম্বার অ্যাকাউন্ট সফলভাবে সেভ করা হয়েছে!');
      setTimeout(() => {
        setIsModalOpen(false);
        setNotice(null);
      }, 1500);
    } catch (err: any) {
      alert('সেভ করতে সমস্যা হয়েছে: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-6 h-6 text-orange-600" />
            <span>টিম অ্যাক্সেস কন্ট্রোল & রোল ম্যানেজমেন্ট</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            টিম মেম্বারদের নির্দিষ্ট ইমেইল মেলবক্স (`support@giftghor.world` / `sales@giftghor.world`) অ্যাক্সেস প্রদান করুন।
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center space-x-2 shadow-xs shrink-0"
        >
          <UserPlus className="w-4 h-4 text-orange-400" />
          <span>নতুন স্টাফ অ্যাকাউন্ট যোগ করুন</span>
        </button>
      </div>

      {/* Staff User List */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span>সক্রিয় টিম মেম্বারবৃন্দ ({teamUsers.length})</span>
          </h3>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-mono">
            Role-Based Access Control (RBAC)
          </span>
        </div>

        {teamUsers.length === 0 ? (
          <div className="text-center py-12 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-slate-700 font-semibold text-sm">কোনো সাব-এডমিন বা স্টাফ অ্যাকাউন্ট যুক্ত করা হয়নি</div>
            <p className="text-slate-500 text-xs max-w-md mx-auto">
              নতুন স্টাফ একাউন্ট যোগ করে নির্দিষ্ট মেলবক্স সাপোর্ট দেওয়ার অনুমতি নির্ধারণ করুন।
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition-colors inline-flex items-center space-x-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>স্টাফ যোগ করুন</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {teamUsers.map((user) => (
              <div
                key={user.id}
                className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-white hover:border-slate-300 hover:shadow-xs"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                        <span>{user.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          user.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {user.status === 'active' ? '✓ Active' : 'Disabled'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Mailboxes Badges */}
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-500 font-medium block mb-1">অনুমোদিত মেলবক্সসমূহ:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {user.assignedMailboxes && user.assignedMailboxes.length > 0 ? (
                        user.assignedMailboxes.map((mb) => (
                          <span
                            key={mb}
                            className="bg-white border border-amber-200 text-amber-900 text-[11px] font-mono px-2.5 py-0.5 rounded-lg shadow-2xs font-medium"
                          >
                            ✉ {mb}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-rose-600 font-semibold">কোনো মেলবক্স অ্যাক্সেস দেওয়া হয়নি</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors text-xs font-semibold flex items-center space-x-1"
                    title="সম্পাদনা করুন"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">এডিট</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`আপনি কি সত্যিই ${user.name} অ্যাকাউন্টটি মুছে ফেলতে চান?`)) {
                        onDeleteTeamUser(user.id);
                      }
                    }}
                    className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-xs font-semibold flex items-center space-x-1"
                    title="ডিলিট করুন"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">ডিলেট</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Team Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-orange-600" />
                <span>{editingUser ? 'টিম মেম্বার পারমিশন এডিট করুন' : 'নতুন স্টাফ অ্যাকাউন্ট তৈরি করুন'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  স্টাফের নাম (Full Name)
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: রহিম আহমেদ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  লগইন ইমেইল (Login Email)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahim@giftghor.world"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  লগইন পাসওয়ার্ড (Password)
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'পরিবর্তন না করতে চাইলে ফাঁকা রাখুন' : '••••••••'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* Mailbox Permission Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  অনুমোদিত মেলবক্স নির্বাচন করুন (Assigned Mailboxes):
                </label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {mailboxes.length === 0 ? (
                    <span className="text-xs text-slate-500">কোনো মেলবক্স তৈরি করা নেই।</span>
                  ) : (
                    mailboxes.map((mb) => (
                      <label key={mb.id} className="flex items-center space-x-2.5 cursor-pointer text-xs font-mono text-slate-900">
                        <input
                          type="checkbox"
                          checked={selectedMailboxes.includes(mb.address)}
                          onChange={() => handleToggleMailbox(mb.address)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <span>{mb.address}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  অ্যাকাউন্ট স্ট্যাটাস
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'disabled')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  <option value="active">Active (লগইন এনাবল)</option>
                  <option value="disabled">Disabled (লগইন বন্ধ)</option>
                </select>
              </div>

              {/* 2FA Security Notice */}
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200/80 text-orange-950 text-xs flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">২-ফ্যাক্টর নিরাপত্তা (2FA) সক্রিয়:</span>
                  <p className="text-[11px] text-orange-900 leading-relaxed">
                    এই স্টাফ ইউজার পাসওয়ার্ড দেওয়ার পর তাদের ইমেইলে ৬ ডিজিটের ওটিপি কোড যাবে। সমস্ত ভেরিফিকেশন কোড সেন্ট্রাল <strong className="font-mono text-orange-950">no-reply@giftghor.world</strong> মেলবক্সের সেন্ট বক্সে রেকর্ড হবে।
                  </p>
                </div>
              </div>

              {notice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                  {notice}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
                >
                  {isSaving ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
