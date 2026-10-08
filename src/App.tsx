import React, { useEffect, useState } from 'react';
import { Domain, EmailFolder, EmailMessage, HostingPlan, IntegrationSettings, Mailbox, User, TeamUser } from './types';
import { LoginScreen } from './components/LoginScreen';
import { HeaderNav } from './components/HeaderNav';
import { DashboardView } from './components/DashboardView';
import { DomainsView } from './components/DomainsView';
import { MailboxesView } from './components/MailboxesView';
import { WebmailView } from './components/WebmailView';
import { IntegrationsView } from './components/IntegrationsView';
import { TeamManagementView } from './components/TeamManagementView';
import { AiBusinessAssistant } from './components/AiBusinessAssistant';
import { Mail } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [domains, setDomains] = useState<Domain[]>([]);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({});
  const [activeMailboxAddress, setActiveMailboxAddress] = useState<string>('');

  // Initial Auth & Data Fetch
  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    setIsLoading(true);
    try {
      const authRes = await fetch('/api/auth/me').then((r) => r.json());
      if (authRes.user) {
        setUser(authRes.user);
        await fetchAppData();
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAppData = async () => {
    try {
      const [dRes, mRes, msgRes, pRes, iRes, tRes] = await Promise.all([
        fetch('/api/domains').then((r) => r.json()).catch(() => []),
        fetch('/api/mailboxes').then((r) => r.json()).catch(() => []),
        fetch('/api/messages').then((r) => r.json()).catch(() => []),
        fetch('/api/plans').then((r) => r.json()).catch(() => []),
        fetch('/api/integrations').then((r) => r.json()).catch(() => ({})),
        fetch('/api/team').then((r) => r.json()).catch(() => [])
      ]);

      setDomains(Array.isArray(dRes) ? dRes : []);
      setMailboxes(Array.isArray(mRes) ? mRes : []);
      setMessages(Array.isArray(msgRes) ? msgRes : []);
      setPlans(Array.isArray(pRes) ? pRes : []);
      setIntegrationSettings(iRes || {});
      setTeamUsers(Array.isArray(tRes) ? tRes : []);

      if (Array.isArray(mRes) && mRes.length > 0) {
        setActiveMailboxAddress(mRes[0].address);
      }
    } catch (err) {
      console.error('Data Fetch Error:', err);
    }
  };

  const handleLogin = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }

    const data = await res.json();
    setUser(data.user);
    await fetchAppData();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const handleAddDomain = async (domainName: string) => {
    const res = await fetch('/api/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domainName })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add domain');
    }

    const newDom = await res.json();
    setDomains((prev) => [...prev, newDom]);
  };

  const handleVerifyDomain = async (domainId: string) => {
    const res = await fetch('/api/domains/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domainId })
    });

    const result = await res.json();
    setDomains((prev) =>
      prev.map((d) => (d.id === domainId ? { ...d, ...result } : d))
    );
    return result;
  };

  const handleCreateMailbox = async (data: {
    domainId: string;
    username: string;
    displayName: string;
    quotaMb: number;
  }) => {
    const res = await fetch('/api/mailboxes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create mailbox');
    }

    const newMb = await res.json();
    setMailboxes((prev) => [...prev, newMb]);
    if (!activeMailboxAddress) {
      setActiveMailboxAddress(newMb.address);
    }
  };

  const handleDeleteMailbox = async (id: string) => {
    await fetch(`/api/mailboxes/${id}`, { method: 'DELETE' });
    setMailboxes((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSendMessage = async (data: {
    mailboxAddress: string;
    senderName?: string;
    to: string;
    subject: string;
    body: string;
    logoUrl?: string;
  }) => {
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const newMsg = await res.json();
    setMessages((prev) => [newMsg, ...prev]);
    return newMsg;
  };

  const handlePatchMessage = async (
    id: string,
    updates: { isRead?: boolean; isStarred?: boolean; folder?: EmailFolder }
  ) => {
    const res = await fetch(`/api/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    const updated = await res.json();
    setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const handleSaveSettings = async (settings: Partial<IntegrationSettings>) => {
    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    const updated = await res.json();
    setIntegrationSettings(updated);
  };

  const handleCreateOrUpdateTeamUser = async (data: Partial<TeamUser>) => {
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'টিম মেম্বার তৈরি ব্যর্থ হয়েছে');
    }

    const saved = await res.json();
    setTeamUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
  };

  const handleDeleteTeamUser = async (id: string) => {
    await fetch(`/api/team/${id}`, { method: 'DELETE' });
    setTeamUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const [isGlobalComposeOpen, setIsGlobalComposeOpen] = useState(false);
  const [globalComposeFromAddress, setGlobalComposeFromAddress] = useState<string>('');

  const handleOpenWebmail = (address: string) => {
    setActiveMailboxAddress(address);
    setActiveTab('webmail');
  };

  const handleOpenCompose = (address?: string) => {
    if (address) {
      setActiveMailboxAddress(address);
      setGlobalComposeFromAddress(address);
    } else if (activeMailboxAddress) {
      setGlobalComposeFromAddress(activeMailboxAddress);
    }
    setActiveTab('webmail');
    setIsGlobalComposeOpen(true);
  };

  // Filter allowed mailboxes for sub_admin staff users
  const allowedMailboxes = user?.role === 'sub_admin' && user?.assignedMailboxes && user.assignedMailboxes.length > 0
    ? mailboxes.filter((m) => user.assignedMailboxes?.includes(m.address))
    : mailboxes;

  // If loading session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans">
        <div className="flex items-center space-x-3 text-slate-800 font-semibold text-sm">
          <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <span>MailCloud Pro সিকিউর প্যানেল লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // If Auth Guard Locked
  if (!user) {
    return (
      <LoginScreen
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          fetchAppData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Hind_Siliguri',sans-serif]">
      {/* Top Header Navigation */}
      <HeaderNav
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenCompose={() => handleOpenCompose()}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            user={user}
            domains={domains}
            mailboxes={mailboxes}
            onAddDomain={handleAddDomain}
            onGoToTab={setActiveTab}
            onOpenCompose={() => handleOpenCompose()}
          />
        )}

        {activeTab === 'domains' && (
          <DomainsView
            domains={domains}
            onAddDomain={handleAddDomain}
            onVerifyDomain={handleVerifyDomain}
          />
        )}

        {activeTab === 'mailboxes' && (
          <MailboxesView
            domains={domains}
            mailboxes={mailboxes}
            onCreateMailbox={handleCreateMailbox}
            onDeleteMailbox={handleDeleteMailbox}
            onOpenWebmail={handleOpenWebmail}
            onOpenCompose={handleOpenCompose}
          />
        )}

        {activeTab === 'webmail' && (
          <WebmailView
            mailboxes={allowedMailboxes}
            activeMailboxAddress={activeMailboxAddress || allowedMailboxes[0]?.address || ''}
            setActiveMailboxAddress={setActiveMailboxAddress}
            messages={messages}
            defaultLogoUrl={integrationSettings.defaultLogoUrl}
            onSendMessage={handleSendMessage}
            onPatchMessage={handlePatchMessage}
            isComposeOpenControlled={isGlobalComposeOpen}
            setIsComposeOpenControlled={setIsGlobalComposeOpen}
            initialComposeFromAddress={globalComposeFromAddress}
          />
        )}

        {activeTab === 'team' && (
          <TeamManagementView
            teamUsers={teamUsers}
            mailboxes={mailboxes}
            onCreateOrUpdateTeamUser={handleCreateOrUpdateTeamUser}
            onDeleteTeamUser={handleDeleteTeamUser}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsView
            plans={plans}
            settings={integrationSettings}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {activeTab === 'ai-assistant' && (
          <AiBusinessAssistant />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/90 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 space-y-1.5">
          <div className="flex items-center justify-center space-x-2 text-slate-800 font-semibold text-sm">
            <Mail className="w-4 h-4 text-orange-600" />
            <span>MailCloud Pro - Clean SaaS Business Email Admin</span>
          </div>
          <p className="text-slate-500">
            Logged in as <strong className="text-slate-800 font-mono">{user.email}</strong> | Cloudflare Inspired UI
          </p>
        </div>
      </footer>
    </div>
  );
}
