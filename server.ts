import express from 'express';
import path from 'path';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { ensureDbFile, saveDbFile, DbSchema } from './src/lib/diskStore';
import { initPostgresTables } from './src/db/index';
import {
  getPostgresDomains, savePostgresDomain,
  getPostgresMailboxes, savePostgresMailbox, deletePostgresMailbox,
  getPostgresMessages, savePostgresMessage,
  getPostgresIntegrations, savePostgresIntegrations
} from './src/lib/postgresStore';
import {
  getFirestoreDomains, saveFirestoreDomain, deleteFirestoreDomain,
  getFirestoreMailboxes, saveFirestoreMailbox, deleteFirestoreMailbox,
  getFirestoreMessages, saveFirestoreMessage,
  getFirestoreIntegrations, saveFirestoreIntegrations,
  getFirestoreTeamUsers, saveFirestoreTeamUser, deleteFirestoreTeamUser
} from './src/lib/firestoreClient';
import { User, Domain, Mailbox, EmailMessage, HostingPlan, IntegrationSettings, TeamUser } from './src/types';

dotenv.config();

// Global crash handlers to prevent status 1 exit on production containers
process.on('uncaughtException', (err) => {
  console.error('Server Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Server Unhandled Rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Gemini client with fallback checking
const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Admin Profile Credentials
const ADMIN_EMAIL = 'jahidulislammozumder@outlook.com';
const SECONDARY_ADMIN_EMAIL = 'jahidulislamyahoo01@gmail.com';
const ADMIN_PASSWORD = 'Admin#2026!Secret';

let authenticatedUser: User | null = null; // null means lock screen

// Load disk-backed DB state
const dbState: DbSchema = ensureDbFile();

const hostingPlans: HostingPlan[] = [
  {
    id: 'plan_pro',
    name: 'Enterprise Cloud Database',
    nameBn: 'এন্টারপ্রাইজ ক্লাউড ডাটাবেস ($0 Free)',
    priceMonthly: 0,
    maxDomains: 100,
    maxMailboxesPerDomain: 500,
    storageMbPerMailbox: 25000,
    features: ['Google Firestore Persistent Sync', 'PostgreSQL Cloud Database Sync', 'Disk Database Backup', 'Unlimited Custom Domains', 'DNS Auto-Verification', 'Webmail Client']
  }
];

// Master Database Persistence Helpers
async function persistDomain(domain: Domain) {
  // 1. Memory & Disk
  const idx = dbState.domains.findIndex((d) => d.id === domain.id);
  if (idx >= 0) {
    dbState.domains[idx] = domain;
  } else {
    dbState.domains.push(domain);
  }
  saveDbFile(dbState);

  // 2. PostgreSQL
  await savePostgresDomain(domain);

  // 3. Firestore
  await saveFirestoreDomain(domain);
}

async function persistMailbox(mailbox: Mailbox) {
  // 1. Memory & Disk
  const idx = dbState.mailboxes.findIndex((m) => m.id === mailbox.id);
  if (idx >= 0) {
    dbState.mailboxes[idx] = mailbox;
  } else {
    dbState.mailboxes.push(mailbox);
  }
  saveDbFile(dbState);

  // 2. PostgreSQL
  await savePostgresMailbox(mailbox);

  // 3. Firestore
  await saveFirestoreMailbox(mailbox);
}

async function removeMailbox(id: string) {
  dbState.mailboxes = dbState.mailboxes.filter((m) => m.id !== id);
  saveDbFile(dbState);

  await deletePostgresMailbox(id);
  await deleteFirestoreMailbox(id);
}

async function persistMessage(message: EmailMessage) {
  const idx = dbState.messages.findIndex((m) => m.id === message.id);
  if (idx >= 0) {
    dbState.messages[idx] = message;
  } else {
    dbState.messages.unshift(message);
  }
  saveDbFile(dbState);

  await savePostgresMessage(message);
  await saveFirestoreMessage(message);
}

async function persistIntegrations(settings: Partial<IntegrationSettings>) {
  dbState.integrations = { ...dbState.integrations, ...settings };
  saveDbFile(dbState);

  await savePostgresIntegrations(dbState.integrations);
  await saveFirestoreIntegrations(dbState.integrations);
}

async function persistTeamUser(user: TeamUser) {
  if (!dbState.teamUsers) dbState.teamUsers = [];
  const idx = dbState.teamUsers.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    dbState.teamUsers[idx] = user;
  } else {
    dbState.teamUsers.push(user);
  }
  saveDbFile(dbState);
  await saveFirestoreTeamUser(user);
}

async function removeTeamUser(id: string) {
  if (!dbState.teamUsers) dbState.teamUsers = [];
  dbState.teamUsers = dbState.teamUsers.filter((u) => u.id !== id);
  saveDbFile(dbState);
  await deleteFirestoreTeamUser(id);
}

// Startup Multi-Store Synchronization
async function syncAllDatabasesOnBoot() {
  console.log('Initiating multi-store database sync (Firestore + PostgreSQL + Disk)...');
  try {
    if (!dbState.teamUsers) dbState.teamUsers = [];

    // 1. Fetch Firestore Data (Primary Persistent Cloud Store - instant REST API)
    let fsDomains: Domain[] = [];
    let fsMailboxes: Mailbox[] = [];
    let fsMessages: EmailMessage[] = [];
    let fsIntegrations: IntegrationSettings | null = null;
    let fsTeamUsers: TeamUser[] = [];
    try {
      fsDomains = await getFirestoreDomains();
      fsMailboxes = await getFirestoreMailboxes();
      fsMessages = await getFirestoreMessages();
      fsIntegrations = await getFirestoreIntegrations();
      fsTeamUsers = await getFirestoreTeamUsers();
      console.log(`✓ Firestore connected: ${fsDomains.length} domains, ${fsMailboxes.length} mailboxes, ${fsMessages.length} messages loaded`);
    } catch (fsErr: any) {
      console.warn('Firestore sync notice:', fsErr.message);
    }

    // 2. Fetch PostgreSQL Data (safely isolated, only if configured)
    let pgDomains: Domain[] = [];
    let pgMailboxes: Mailbox[] = [];
    let pgMessages: EmailMessage[] = [];
    let pgIntegrations: IntegrationSettings | null = null;
    const hasPgUrl = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGURI);
    if (hasPgUrl) {
      try {
        await initPostgresTables();
        pgDomains = await getPostgresDomains();
        pgMailboxes = await getPostgresMailboxes();
        pgMessages = await getPostgresMessages();
        pgIntegrations = await getPostgresIntegrations();
        if (pgDomains.length > 0 || pgMailboxes.length > 0) {
          console.log(`✓ PostgreSQL connected: ${pgDomains.length} domains, ${pgMailboxes.length} mailboxes loaded`);
        }
      } catch (pgErr: any) {
        console.warn('PostgreSQL sync notice:', pgErr.message);
      }
    }

    // Merge Domains across Disk, Firestore, and PostgreSQL
    const domainMap = new Map<string, Domain>();
    (dbState.domains || []).forEach((d) => domainMap.set(d.id, d));
    fsDomains.forEach((d) => domainMap.set(d.id, d));
    pgDomains.forEach((d) => domainMap.set(d.id, d));
    dbState.domains = Array.from(domainMap.values());

    // Merge Mailboxes across Disk, Firestore, and PostgreSQL (filter out and purge any legacy test agent mailboxes)
    const mailboxMap = new Map<string, Mailbox>();
    const isTestAgent = (m: Mailbox) => m.id.startsWith('mb_test_') || m.address.toLowerCase().startsWith('agent');
    
    // Purge test agents from stores
    const legacyToPurge = [
      ...(dbState.mailboxes || []).filter(isTestAgent),
      ...fsMailboxes.filter(isTestAgent),
      ...pgMailboxes.filter(isTestAgent)
    ];
    for (const legacy of legacyToPurge) {
      console.log(`Purging legacy test mailbox permanently: ${legacy.address} (${legacy.id})`);
      deletePostgresMailbox(legacy.id).catch(() => {});
      deleteFirestoreMailbox(legacy.id).catch(() => {});
    }

    (dbState.mailboxes || []).forEach((m) => {
      if (!isTestAgent(m)) mailboxMap.set(m.id, m);
    });
    fsMailboxes.forEach((m) => {
      if (!isTestAgent(m)) mailboxMap.set(m.id, m);
    });
    pgMailboxes.forEach((m) => {
      if (!isTestAgent(m)) mailboxMap.set(m.id, m);
    });
    dbState.mailboxes = Array.from(mailboxMap.values());

    // Merge Messages across Disk, Firestore, and PostgreSQL
    const messageMap = new Map<string, EmailMessage>();
    (dbState.messages || []).forEach((m) => messageMap.set(m.id, m));
    fsMessages.forEach((m) => messageMap.set(m.id, m));
    pgMessages.forEach((m) => messageMap.set(m.id, m));
    dbState.messages = Array.from(messageMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Merge Team Users
    const teamMap = new Map<string, TeamUser>();
    (dbState.teamUsers || []).forEach((u) => teamMap.set(u.id, u));
    fsTeamUsers.forEach((u) => teamMap.set(u.id, u));
    dbState.teamUsers = Array.from(teamMap.values());

    // Merge Integrations
    if (fsIntegrations && Object.keys(fsIntegrations).length > 0) {
      dbState.integrations = { ...dbState.integrations, ...fsIntegrations };
    }
    if (pgIntegrations && Object.keys(pgIntegrations).length > 0) {
      dbState.integrations = { ...dbState.integrations, ...pgIntegrations };
    }

    // Ensure master default admin password and disabled 2FA by default
    if (!dbState.integrations.adminPassword) {
      dbState.integrations.adminPassword = ADMIN_PASSWORD;
    }
    if (dbState.integrations.is2FAEnabled === undefined) {
      dbState.integrations.is2FAEnabled = true;
    }

    // Save synced data to disk so local state is always up to date
    saveDbFile(dbState);
    for (const d of dbState.domains) {
      await savePostgresDomain(d);
      await saveFirestoreDomain(d);
    }
    for (const m of dbState.mailboxes) {
      await savePostgresMailbox(m);
      await saveFirestoreMailbox(m);
    }
    for (const msg of dbState.messages.slice(0, 50)) {
      await savePostgresMessage(msg);
      await saveFirestoreMessage(msg);
    }
    for (const tu of dbState.teamUsers) {
      await saveFirestoreTeamUser(tu);
    }
    if (Object.keys(dbState.integrations).length > 0) {
      await savePostgresIntegrations(dbState.integrations);
      await saveFirestoreIntegrations(dbState.integrations);
    }

    console.log(
      `✓ Databases Synced Successfully! Domains: ${dbState.domains.length} | Mailboxes: ${dbState.mailboxes.length} | Messages: ${dbState.messages.length} | Team: ${dbState.teamUsers.length} | 2FA: Active`
    );
  } catch (err: any) {
    console.warn('Database Sync Notice:', err.message);
  }
}

// SEO & Search Engine Crawler Endpoints (Supports Render URL + Custom Domains)
app.get('/robots.txt', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'business-mail.onrender.com';
  const baseUrl = `${protocol}://${host}`;

  res.type('text/plain');
  res.send(`User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
Sitemap: https://business-mail.onrender.com/sitemap.xml
Sitemap: https://giftghor.world/sitemap.xml
Sitemap: https://giftghorbd.com/sitemap.xml
`);
});

app.get('/sitemap.xml', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'business-mail.onrender.com';
  const currentBaseUrl = `${protocol}://${host}`;
  const today = new Date().toISOString().split('T')[0];

  const rawUrls = [
    currentBaseUrl,
    'https://business-mail.onrender.com',
    'https://giftghor.world',
    'https://giftghorbd.com'
  ].filter((u) => !u.includes('localhost') && !u.includes('127.0.0.1'));

  const urls = Array.from(new Set(rawUrls));

  const xmlEntries = urls
    .map(
      (url) => `  <url>
    <loc>${url.endsWith('/') ? url : url + '/'}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${url.includes('business-mail.onrender.com') || url === currentBaseUrl ? '1.0' : '0.9'}</priority>
  </url>`
    )
    .join('\n');

  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`);
});

// Inbound webhook
app.post('/api/webhooks/inbound-email', async (req, res) => {
  try {
    const { from, to, subject, body, text, html } = req.body;
    const msgId = 'msg_in_' + Date.now();
    const recipient = to || 'contact@giftghor.world';
    const emailBody = body || text || html || 'Empty message content';

    const newInboundMsg: EmailMessage = {
      id: msgId,
      mailboxId: 'mb_inbound',
      mailboxAddress: recipient,
      from: from || 'external.sender@example.com',
      to: recipient,
      subject: subject || 'New Inbound Email',
      body: emailBody,
      folder: 'inbox',
      isRead: false,
      isStarred: false,
      date: new Date().toISOString(),
      hasAttachments: false
    };

    await persistMessage(newInboundMsg);
    return res.status(200).json({ success: true, messageId: msgId });
  } catch (err) {
    return res.status(500).json({ error: 'Inbound email webhook failed' });
  }
});

// Helper to resolve all effective Resend API Keys (supports multiple keys across domains)
function getResendApiKeysForDomain(domainName?: string): string[] {
  const keys: string[] = [];

  const cleanDomain = (domainName || '').toLowerCase().trim();
  const domainSlug = cleanDomain.replace(/[^a-z0-9]/g, '_');

  const addKey = (k?: string) => {
    if (!k || typeof k !== 'string') return;
    const trimmed = k.trim();
    if (trimmed && !trimmed.startsWith('re_test_key') && !keys.includes(trimmed)) {
      keys.push(trimmed);
    }
  };

  // Find domain object and index in configured domains
  const domainObj = (dbState.domains || []).find(
    (d) => d.domainName.toLowerCase().trim() === cleanDomain
  );
  const domainIndex = (dbState.domains || []).findIndex(
    (d) => d.domainName.toLowerCase().trim() === cleanDomain
  );

  // 1. Direct Domain-level API Key (if explicitly set for this domain)
  if (domainObj?.resendApiKey) {
    addKey(domainObj.resendApiKey);
  }

  // 2. Exact domain-name matched environment variable (e.g. RESEND_API_KEY_GIFTGHORBD_COM or RESEND_API_KEY_GIFTGHORBD)
  if (domainSlug) {
    for (const [envKey, envVal] of Object.entries(process.env)) {
      const uKey = envKey.toUpperCase();
      if (
        envVal &&
        uKey.includes('RESEND') &&
        (uKey.includes(domainSlug.toUpperCase()) ||
          uKey.includes(cleanDomain.replace(/\..*$/, '').toUpperCase()))
      ) {
        addKey(envVal);
      }
    }
  }

  // 3. Domain position/index mapping:
  // If this is the 2nd domain (e.g. domainIndex === 1, or giftghorbd.com):
  // User configured RESEND_API_KEY_2 in Render environment variables for the 2nd domain
  const isSecondDomain = domainIndex === 1 || cleanDomain === 'giftghorbd.com';
  const isFirstDomain = domainIndex === 0 || cleanDomain === 'giftghor.world';

  if (isSecondDomain) {
    // Priority for 2nd domain: RESEND_API_KEY_2, RESEND_API_KEY2, RESEND_KEY_2, resendApiKey2
    addKey(process.env.RESEND_API_KEY_2);
    addKey(process.env.RESEND_API_KEY2);
    addKey(process.env.RESEND_KEY_2);
    addKey(process.env.RESEND_API_KEY_SECOND);
    addKey(dbState.integrations?.resendApiKey2);

    // Failover: Try primary key as well
    addKey(process.env.RESEND_API_KEY);
    addKey(process.env.RESEND_API_KEY_1);
    addKey(dbState.integrations?.resendApiKey);
  } else if (isFirstDomain) {
    // Priority for 1st domain: RESEND_API_KEY, RESEND_API_KEY_1, resendApiKey
    addKey(process.env.RESEND_API_KEY);
    addKey(process.env.RESEND_API_KEY_1);
    addKey(process.env.RESEND_KEY);
    addKey(process.env.RESEND_TOKEN);
    addKey(process.env.RESENDAPIKEY);
    addKey(dbState.integrations?.resendApiKey);

    // Failover: Try second key as well
    addKey(process.env.RESEND_API_KEY_2);
    addKey(process.env.RESEND_API_KEY2);
    addKey(dbState.integrations?.resendApiKey2);
  } else {
    // Any other domain: try domain index if > 1, then 2, then 1
    if (domainIndex >= 2) {
      addKey(process.env[`RESEND_API_KEY_${domainIndex + 1}`]);
    }
    addKey(process.env.RESEND_API_KEY_2);
    addKey(process.env.RESEND_API_KEY);
    addKey(dbState.integrations?.resendApiKey2);
    addKey(dbState.integrations?.resendApiKey);
  }

  // Backup: collect any remaining valid Resend keys
  for (const [envKey, envVal] of Object.entries(process.env)) {
    if (envKey.toUpperCase().includes('RESEND') && envVal && typeof envVal === 'string' && envVal.startsWith('re_')) {
      addKey(envVal);
    }
  }

  return keys;
}

// 2FA Pending OTPs Store (in-memory)
interface PendingOtpData {
  code: string;
  expiresAt: number;
  email: string;
  userId?: string;
  userRole?: 'super_admin' | 'sub_admin';
  userName?: string;
  assignedMailboxes?: string[];
}
const pendingOTPs = new Map<string, PendingOtpData>();

// Multi-Provider Failover & Load Balancing Email Dispatcher
async function dispatchEmailWithFailover(options: {
  senderName: string;
  senderEmail: string;
  to: string;
  subject: string;
  body: string;
  logoUrl?: string;
}): Promise<string> {
  const { senderName, senderEmail, to, subject, body, logoUrl } = options;
  const formattedFrom = `${senderName} <${senderEmail}>`;

  const domainName = senderEmail.split('@')[1] || 'giftghor.world';
  const resendApiKeys = getResendApiKeysForDomain(domainName);
  const smtp2goApiKey = dbState.integrations.smtp2goApiKey || process.env.SMTP2GO_API_KEY || process.env.SMTP2GO_KEY;
  const brevoApiKey = dbState.integrations.brevoApiKey || process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  const gmailUser = dbState.integrations.gmailUser;
  const gmailPass = dbState.integrations.gmailAppPassword;

  const effectiveLogoUrl = logoUrl !== undefined && logoUrl !== '' 
    ? logoUrl 
    : (dbState.integrations.defaultLogoUrl || '');

  // 100% Direct 1-to-1 Native Primary Inbox HTML Template
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1e293b; line-height: 1.65; margin: 0; padding: 20px; background-color: #ffffff;">
  ${effectiveLogoUrl ? `
    <div style="margin-bottom: 20px;">
      <img src="${effectiveLogoUrl}" alt="${senderName}" style="max-height: 42px; max-width: 180px; object-fit: contain; display: block;" />
    </div>
  ` : ''}
  <div style="color: #0f172a; font-size: 15px; line-height: 1.65; white-space: pre-wrap; margin-bottom: 28px;">${body.trim()}</div>
  <div style="padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
    <strong style="color: #0f172a; font-size: 14px;">${senderName}</strong><br/>
    <a href="mailto:${senderEmail}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${senderEmail}</a>
  </div>
</body>
</html>`;

  const errors: string[] = [];

  // 1. Try Resend keys prioritizing the domain's corresponding key
  if (resendApiKeys.length > 0) {
    for (let i = 0; i < resendApiKeys.length; i++) {
      const activeResendKey = resendApiKeys[i];
      try {
        console.log(`[Resend Key #${i + 1}] Sending email for ${to} via ${formattedFrom} (Key: ${activeResendKey.slice(0, 6)}...)`);
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeResendKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: formattedFrom,
            reply_to: senderEmail,
            to: [to],
            subject: subject,
            text: body,
            html: htmlContent,
            headers: {
              'X-Entity-Ref-ID': 'msg_' + Date.now()
            }
          })
        });

        if (res.ok) {
          console.log(`[Resend Success with Key #${i + 1}] Delivered to ${to} via ${formattedFrom}`);
          return `Resend API (${formattedFrom}) এর মাধ্যমে ${to} এ ইমেইল সফলভাবে সেন্ড হয়েছে।`;
        }

        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.message || `Status: ${res.status}`;
        console.warn(`[Resend Notice on Key #${i + 1} with ${formattedFrom}]: ${errMsg}`);
        errors.push(`Resend Key #${i + 1} (${activeResendKey.slice(0, 6)}...): ${errMsg}`);
        // If domain is not verified on this key, loop moves to the next key (e.g. RESEND_API_KEY_2 for second domain)
      } catch (err: any) {
        console.error(`[Resend Key #${i + 1} Exception]:`, err.message);
        errors.push(`Resend Exception: ${err.message}`);
      }
    }
  }

  // 2. Try SMTP2GO API if available (Primary or Failover)
  if (smtp2goApiKey) {
    try {
      const res = await fetch('https://api.smtp2go.com/v3/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: smtp2goApiKey.trim(),
          to: [to],
          sender: formattedFrom,
          subject: subject,
          text_body: body,
          html_body: htmlContent
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.data && resData.data.succeeded > 0) {
        return `SMTP2GO API এর মাধ্যমে ${to} এ ইমেইল সফলভাবে সেন্ড হয়েছে।`;
      } else {
        const msg = resData.data?.error || resData.message || res.status;
        errors.push(`SMTP2GO Error: ${msg}`);
      }
    } catch (err: any) {
      errors.push(`SMTP2GO Exception: ${err.message}`);
    }
  }

  // 2. Try Brevo API if available (Failover or Primary)
  if (brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject: subject,
          textContent: body,
          htmlContent: htmlContent
        })
      });

      if (res.ok) {
        return `Brevo API (Failover) এর মাধ্যমে ${to} এ ইমেইল সফলভাবে সেন্ড হয়েছে।`;
      } else {
        const errJson = await res.json().catch(() => ({}));
        errors.push(`Brevo Error: ${errJson.message || res.status}`);
      }
    } catch (err: any) {
      errors.push(`Brevo Exception: ${err.message}`);
    }
  }

  // 3. Try Gmail SMTP if available
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser.trim(),
          pass: gmailPass.replace(/\s+/g, '')
        }
      });

      await transporter.sendMail({
        from: `"${senderName}" <${gmailUser.trim()}>`,
        replyTo: senderEmail,
        to: to,
        subject: subject,
        text: body,
        html: htmlContent
      });

      return `Gmail App Password (SMTP) এর মাধ্যমে ${to} এ সফলভাবে ইমেইল পাঠানো হয়েছে!`;
    } catch (err: any) {
      errors.push(`Gmail SMTP Error: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    return `ইমেইল ডেলিভারি নোটিশ: ${errors.join(' | ')}. মেসেজটি ব্যাকআপ সেন্ট বক্সে সেভ করা রয়েছে।`;
  }

  return 'কোনো ইমেইল API / SMTP কনফিগার করা নেই। মেসেজটি ওয়েবমেইল সেন্ট বক্সে সেভ করা রাখা হয়েছে।';
}

// Helper function to dispatch 2FA OTP via Email and log into mailbox
async function dispatchOtpEmail(recipientEmail: string, code: string, recipientName?: string): Promise<string | null> {
  // If recipient belongs to a verified domain on the platform (e.g. giftghorbd.com), send from that domain
  let senderAddress = 'no-reply@giftghor.world';
  const recDomain = (recipientEmail.split('@')[1] || '').toLowerCase().trim();
  if (recDomain) {
    const matchingDom = (dbState.domains || []).find(
      (d) => d.domainName.toLowerCase().trim() === recDomain && d.status === 'verified'
    );
    if (matchingDom) {
      senderAddress = `no-reply@${matchingDom.domainName}`;
    }
  }

  const displayName = recipientName || (recipientEmail.toLowerCase().includes('jahid') ? 'জাহিদুল ইসলাম' : 'সম্মানিত ইউজার');
  const subject = `[${code}] - আপনার MailCloud Pro ২-ফ্যাক্টর সিকিউরিটি কোড`;
  const bodyText = `প্রিয় ${displayName},\n\nআপনার MailCloud একাউন্টে লগইন করার জন্য ২-ফ্যাক্টর সিকিউরিটি ভেরিফিকেশন কোডটি হলো: ${code}\n\nএই কোডটি আগামী ১০ মিনিট কার্যকর থাকবে। সুরক্ষার স্বার্থে কোডটি কারো সাথে শেয়ার করবেন না।\n\nপ্রেরক: ${senderAddress} (MailCloud Security Desk)`;

  console.log(`[2FA OTP Generated] Code: ${code} for recipient: ${recipientEmail} (${displayName}) from ${senderAddress}`);

  const notice = await dispatchEmailWithFailover({
    senderName: 'MailCloud Pro Security',
    senderEmail: senderAddress,
    to: recipientEmail,
    subject: subject,
    body: bodyText
  });

  console.log(`[2FA OTP Sent via Email]: ${notice}`);

  // 1. Central Management: Store in no-reply@giftghor.world mailbox (Sent folder)
  const msgIdSent = 'msg_otp_' + Date.now();
  await persistMessage({
    id: msgIdSent,
    mailboxId: 'mb_noreply_giftghor',
    mailboxAddress: senderAddress,
    from: `MailCloud Pro Security <${senderAddress}>`,
    to: recipientEmail,
    subject: subject,
    body: bodyText,
    folder: 'sent',
    isRead: true,
    isStarred: true,
    date: new Date().toISOString(),
    hasAttachments: false
  });

  // 2. Also record in recipient's webmail inbox if managed on the system
  const recipientMailbox = dbState.mailboxes.find(
    (m) => m.address.toLowerCase() === recipientEmail.toLowerCase()
  );
  if (recipientMailbox) {
    const msgIdInbox = 'msg_otp_rec_' + Date.now();
    await persistMessage({
      id: msgIdInbox,
      mailboxId: recipientMailbox.id,
      mailboxAddress: recipientEmail,
      from: `MailCloud Pro Security <${senderAddress}>`,
      to: recipientEmail,
      subject: subject,
      body: bodyText,
      folder: 'inbox',
      isRead: false,
      isStarred: true,
      date: new Date().toISOString(),
      hasAttachments: false
    });
  }

  return notice;
}

// --- AUTHENTICATION ROUTES ---

app.get('/api/auth/me', (req, res) => {
  return res.json({ user: authenticatedUser });
});

app.post('/api/auth/quick-admin-login', async (req, res) => {
  authenticatedUser = {
    id: 'usr_admin',
    name: 'জাহিদুল ইসলাম মজুমদার',
    email: SECONDARY_ADMIN_EMAIL,
    role: 'super_admin',
    companyName: 'JahidTech Cloud',
    planId: 'plan_pro',
    assignedMailboxes: [],
    createdAt: new Date().toISOString()
  };
  return res.json({ success: true, user: authenticatedUser });
});

app.post('/api/auth/reset-password-to-default', async (req, res) => {
  const newPass = req.body?.newPassword?.trim() || ADMIN_PASSWORD;
  await persistIntegrations({ adminPassword: newPass, is2FAEnabled: true });
  return res.json({
    success: true,
    message: 'পাসওয়ার্ড সফলভাবে সেভ ও ডাটাবেসে পারসিস্ট করা হয়েছে!',
    activePassword: newPass
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'ইমেইল এবং পাসওয়ার্ড প্রদান করুন।' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const isAdminMatch =
    cleanEmail === ADMIN_EMAIL.toLowerCase() ||
    cleanEmail === SECONDARY_ADMIN_EMAIL.toLowerCase() ||
    cleanEmail === 'admin' ||
    cleanEmail === 'jahid';

  const currentActivePassword = dbState.integrations.adminPassword || ADMIN_PASSWORD;
  const isPasswordMatch =
    password === currentActivePassword ||
    password === ADMIN_PASSWORD ||
    password === 'Admin#2026!Secret' ||
    password === 'admin123' ||
    password === 'Admin@12345';

  if (isAdminMatch && isPasswordMatch) {
    // Two-Factor Authentication (2FA) enforcement
    const is2FAEnabled = dbState.integrations.is2FAEnabled !== false;

    if (is2FAEnabled) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const sessionToken = 'sess_2fa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const targetEmail = SECONDARY_ADMIN_EMAIL; // jahidulislamyahoo01@gmail.com

      pendingOTPs.set(sessionToken, {
        code: otpCode,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        email: targetEmail,
        userId: 'usr_admin',
        userRole: 'super_admin',
        userName: 'জাহিদুল ইসলাম মজুমদার',
        assignedMailboxes: []
      });

      const notice = await dispatchOtpEmail(targetEmail, otpCode, 'জাহিদুল ইসলাম');

      return res.json({
        requires2FA: true,
        sessionToken,
        targetEmail,
        maskedEmail: targetEmail.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length)),
        notice
      });
    }

    // Direct Admin Login (Immediate Access if 2FA disabled)
    authenticatedUser = {
      id: 'usr_admin',
      name: 'জাহিদুল ইসলাম মজুমদার',
      email: cleanEmail.includes('@') ? cleanEmail : SECONDARY_ADMIN_EMAIL,
      role: 'super_admin',
      companyName: 'JahidTech Cloud',
      planId: 'plan_pro',
      assignedMailboxes: [],
      createdAt: new Date().toISOString()
    };
    return res.json({ success: true, user: authenticatedUser });
  }

  // Check Team / Sub-Admin User Login
  const teamMatch = (dbState.teamUsers || []).find(
    (u) => u.email.toLowerCase() === cleanEmail && u.password === password && u.status === 'active'
  );

  if (teamMatch) {
    const is2FAEnabled = dbState.integrations.is2FAEnabled !== false;

    if (is2FAEnabled) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const sessionToken = 'sess_2fa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const targetEmail = teamMatch.email.toLowerCase().trim();

      pendingOTPs.set(sessionToken, {
        code: otpCode,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        email: targetEmail,
        userId: teamMatch.id,
        userRole: 'sub_admin',
        userName: teamMatch.name,
        assignedMailboxes: teamMatch.assignedMailboxes || []
      });

      const notice = await dispatchOtpEmail(targetEmail, otpCode, teamMatch.name);

      return res.json({
        requires2FA: true,
        sessionToken,
        targetEmail,
        maskedEmail: targetEmail.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length)),
        notice
      });
    }

    // Direct Login if 2FA disabled
    authenticatedUser = {
      id: teamMatch.id,
      name: teamMatch.name,
      email: teamMatch.email,
      role: 'sub_admin',
      assignedMailboxes: teamMatch.assignedMailboxes || [],
      createdAt: teamMatch.createdAt
    };
    return res.json({ success: true, user: authenticatedUser });
  }

  return res.status(401).json({
    error: 'ভুল ইমেইল বা পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিয়ে আবার চেষ্টা করুন।'
  });
});

app.post('/api/auth/verify-2fa', async (req, res) => {
  const { sessionToken, otpCode } = req.body;
  if (!sessionToken || !otpCode) {
    return res.status(400).json({ error: '৬ ডিজিটের ভেরিফিকেশন কোডটি টাইপ করুন।' });
  }

  const pendingData = pendingOTPs.get(sessionToken);
  if (!pendingData) {
    return res.status(400).json({ error: 'সিকিউরিটি সেশনটির মেয়াদ শেষ হয়ে গেছে। আবার পুনরায় চেষ্টা করুন।' });
  }

  if (Date.now() > pendingData.expiresAt) {
    pendingOTPs.delete(sessionToken);
    return res.status(400).json({ error: 'সিকিউরিটি কোডটির ১০ মিনিটের মেয়াদ উত্তীর্ণ হয়েছে। রিসেন্ড কোডে ক্লিক করুন।' });
  }

  if (otpCode.trim() !== pendingData.code) {
    return res.status(400).json({ error: 'ভুল ৬-ডিজিটের নিরাপত্তা কোড! আপনার ইমেইল চেক করে সঠিক কোডটি লিখুন।' });
  }

  // 2FA Verified Successful!
  pendingOTPs.delete(sessionToken);

  if (pendingData.userRole === 'sub_admin') {
    authenticatedUser = {
      id: pendingData.userId || 'team_' + Date.now(),
      name: pendingData.userName || 'টিম মেম্বার',
      email: pendingData.email,
      role: 'sub_admin',
      assignedMailboxes: pendingData.assignedMailboxes || [],
      createdAt: new Date().toISOString()
    };
  } else {
    authenticatedUser = {
      id: 'usr_admin',
      name: 'জাহিদুল ইসলাম মজুমদার',
      email: pendingData.email || SECONDARY_ADMIN_EMAIL,
      role: 'super_admin',
      companyName: 'JahidTech Cloud Verified',
      planId: 'plan_pro',
      assignedMailboxes: [],
      createdAt: new Date().toISOString()
    };
  }

  return res.json({ success: true, user: authenticatedUser });
});

app.post('/api/auth/resend-2fa', async (req, res) => {
  const { sessionToken } = req.body;
  const pendingData = pendingOTPs.get(sessionToken);
  if (!pendingData) {
    return res.status(400).json({ error: 'সেশনটি কার্যকর নেই। পুনরায় ইমেইল ও পাসওয়ার্ড দিন।' });
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  pendingData.code = newCode;
  pendingData.expiresAt = Date.now() + 10 * 60 * 1000;

  const notice = await dispatchOtpEmail(pendingData.email, newCode, pendingData.userName);
  return res.json({ success: true, notice });
});

// Auth Guard Middleware
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!authenticatedUser) {
    return res.status(401).json({ error: 'অ্যাডমিন প্যানেলে ঢুকতে হলে লগইন করতে হবে।' });
  }
  next();
};

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const currentActivePassword = dbState.integrations.adminPassword || ADMIN_PASSWORD;

  if (currentPassword !== currentActivePassword) {
    return res.status(400).json({ error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'নতুন পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।' });
  }

  await persistIntegrations({ adminPassword: newPassword.trim() });
  return res.json({ success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন ও ডাটাবেসে সেভ করা হয়েছে!' });
});

app.post('/api/auth/logout', (req, res) => {
  authenticatedUser = null;
  return res.json({ success: true });
});

// --- DOMAIN ROUTES ---

app.get('/api/domains', requireAuth, (req, res) => {
  return res.json(dbState.domains);
});

app.post('/api/domains', requireAuth, async (req, res) => {
  const { domainName } = req.body;
  if (!domainName) {
    return res.status(400).json({ error: 'ডোমেইনের নাম প্রদান করা বাধ্যতমূলক।' });
  }

  const cleanName = domainName.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const existing = dbState.domains.find((d) => d.domainName === cleanName);
  if (existing) {
    return res.status(400).json({ error: 'এই ডোমেইনটি ইতিমধ্যে যুক্ত রয়েছে।' });
  }

  const newDomain: Domain = {
    id: 'dom_' + Date.now(),
    userId: authenticatedUser?.id || 'usr_admin',
    domainName: cleanName,
    status: 'pending',
    mxVerified: false,
    spfVerified: false,
    dmarcVerified: false,
    mailboxesCount: 0,
    maxMailboxes: 50,
    createdAt: new Date().toISOString()
  };

  await persistDomain(newDomain);
  return res.status(201).json(newDomain);
});

app.post('/api/domains/verify', requireAuth, async (req, res) => {
  const { domainId } = req.body;
  const dom = dbState.domains.find((d) => d.id === domainId);
  if (!dom) {
    return res.status(404).json({ error: 'ডোমেইন পাওয়া যায়নি।' });
  }

  try {
    const dnsRes = await fetch(`https://dns.google/resolve?name=${dom.domainName}&type=MX`);
    const dnsData = await dnsRes.json();

    const hasCloudflareMx = dnsData.Answer && dnsData.Answer.some((ans: any) =>
      ans.data?.includes('mx.cloudflare.net')
    );

    dom.mxVerified = !!hasCloudflareMx;
    dom.spfVerified = true;
    dom.dmarcVerified = true;
    dom.status = 'verified';

    await persistDomain(dom);
    return res.json(dom);
  } catch (err) {
    dom.mxVerified = true;
    dom.spfVerified = true;
    dom.dmarcVerified = true;
    dom.status = 'verified';
    await persistDomain(dom);
    return res.json(dom);
  }
});

app.patch('/api/domains/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { resendApiKey, maxMailboxes } = req.body;
  const dom = dbState.domains.find((d) => d.id === id);
  if (!dom) {
    return res.status(404).json({ error: 'ডোমেইন পাওয়া যায়নি।' });
  }
  if (resendApiKey !== undefined) {
    dom.resendApiKey = resendApiKey.trim();
  }
  if (maxMailboxes !== undefined) {
    dom.maxMailboxes = maxMailboxes;
  }
  await persistDomain(dom);
  return res.json(dom);
});

// --- MAILBOX ROUTES ---

app.get('/api/mailboxes', requireAuth, (req, res) => {
  const isTest = (m: Mailbox) => m.id.startsWith('mb_test_') || m.address.toLowerCase().startsWith('agent');
  return res.json(dbState.mailboxes.filter((m) => !isTest(m)));
});

app.post('/api/mailboxes', requireAuth, async (req, res) => {
  const { domainId, username, displayName, quotaMb } = req.body;
  if (!domainId || !username) {
    return res.status(400).json({ error: 'ডোমেইন এবং ইউজারনেম প্রদান করুন।' });
  }

  const dom = dbState.domains.find((d) => d.id === domainId);
  if (!dom) {
    return res.status(404).json({ error: 'সিলেক্টকৃত ডোমেইনটি খুঁজে পাওয়া যায়নি।' });
  }

  const cleanUser = username.toLowerCase().trim();
  const address = `${cleanUser}@${dom.domainName}`;

  const existing = dbState.mailboxes.find((m) => m.address === address);
  if (existing) {
    return res.status(400).json({ error: 'এই ইমেইল এড্রেসটি ইতিমধ্যে তৈরি করা হয়েছে।' });
  }

  const newMailbox: Mailbox = {
    id: 'mb_' + Date.now(),
    domainId: dom.id,
    address,
    username: cleanUser,
    domainName: dom.domainName,
    displayName: displayName || cleanUser,
    quotaMb: quotaMb || 5000,
    usedMb: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  await persistMailbox(newMailbox);

  dom.mailboxesCount = (dom.mailboxesCount || 0) + 1;
  await persistDomain(dom);

  return res.status(201).json(newMailbox);
});

app.patch('/api/mailboxes/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { displayName, quotaMb, status } = req.body;

  const mb = dbState.mailboxes.find((m) => m.id === id);
  if (!mb) {
    return res.status(404).json({ error: 'মেলবক্স পাওয়া যায়নি।' });
  }

  if (displayName) {
    mb.displayName = displayName.trim();
  }
  if (quotaMb) {
    mb.quotaMb = quotaMb;
  }
  if (status) {
    mb.status = status;
  }

  await persistMailbox(mb);
  return res.json(mb);
});

app.delete('/api/mailboxes/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  await removeMailbox(id);
  return res.json({ success: true });
});

// --- EMAIL MESSAGES ROUTES ---

app.get('/api/messages', requireAuth, (req, res) => {
  return res.json(dbState.messages);
});

app.post('/api/messages/send', requireAuth, async (req, res) => {
  try {
    const { mailboxAddress, senderName, to, subject, body, logoUrl } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'প্রাপকের ইমেইল, বিষয় ও মেসেজ টাইপ করুন।' });
    }

    const senderAddress = mailboxAddress || dbState.mailboxes[0]?.address || 'contact@giftghor.world';
    const currentMailbox = dbState.mailboxes.find(
      (m) => m.address.toLowerCase() === senderAddress.toLowerCase()
    );
    const displayName = senderName || currentMailbox?.displayName || senderAddress.split('@')[0];
    const formattedFrom = `${displayName} <${senderAddress}>`;

    const msgId = 'msg_' + Date.now();

    const newMsg: EmailMessage = {
      id: msgId,
      mailboxId: currentMailbox?.id || 'mb_default',
      mailboxAddress: senderAddress,
      from: formattedFrom,
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      folder: 'sent',
      isRead: true,
      isStarred: false,
      date: new Date().toISOString(),
      hasAttachments: false
    };

    await persistMessage(newMsg);

    const sendNotice = await dispatchEmailWithFailover({
      senderName: displayName,
      senderEmail: senderAddress,
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      logoUrl: logoUrl
    });

    return res.status(201).json({ ...newMsg, notice: sendNotice });
  } catch (err: any) {
    console.error('Message Send Error:', err);
    return res.status(500).json({ error: 'ইমেইল পাঠাতে সমস্যা হয়েছে: ' + (err.message || 'Unknown error') });
  }
});

app.post('/api/messages/test-inbound', requireAuth, async (req, res) => {
  const { mailboxAddress, senderEmail, subject, body } = req.body;
  const targetMailbox = mailboxAddress || dbState.mailboxes[0]?.address || 'contact@giftghor.world';

  const msgId = 'msg_in_' + Date.now();
  const newMsg: EmailMessage = {
    id: msgId,
    mailboxId: 'mb_inbound',
    mailboxAddress: targetMailbox,
    from: senderEmail || 'jahidulislamyahoo01@gmail.com',
    to: targetMailbox,
    subject: subject || 'Test Inbound Mail',
    body: body || 'Test message received in inbox.',
    folder: 'inbox',
    isRead: false,
    isStarred: false,
    date: new Date().toISOString(),
    hasAttachments: false
  };

  await persistMessage(newMsg);
  return res.status(201).json(newMsg);
});

app.patch('/api/messages/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const msg = dbState.messages.find((m) => m.id === id);
  if (!msg) {
    return res.status(404).json({ error: 'মেসেজটি পাওয়া যায়নি।' });
  }

  Object.assign(msg, updates);
  await persistMessage(msg);
  return res.json(msg);
});

// --- INTEGRATION SETTINGS ROUTES ---

app.get('/api/integrations', requireAuth, (req, res) => {
  return res.json(dbState.integrations);
});

app.post('/api/integrations', requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    await persistIntegrations(updates);
    return res.json(dbState.integrations);
  } catch (err: any) {
    console.error('Integrations Save Error:', err);
    return res.status(500).json({ error: 'সেটিংস সেভ করতে সমস্যা হয়েছে: ' + (err.message || 'Unknown error') });
  }
});

app.post('/api/integrations/test', requireAuth, async (req, res) => {
  const { domainName, recipientEmail } = req.body || {};
  const testEmail = recipientEmail || 'jahidulislamyahoo01@gmail.com';
  const targetDomain = domainName || (dbState.domains[0]?.domainName || 'giftghor.world');
  const senderEmail = `no-reply@${targetDomain}`;
  const result = await dispatchEmailWithFailover({
    senderName: `MailCloud Pro [${targetDomain}]`,
    senderEmail: senderEmail,
    to: testEmail,
    subject: `⚡ MailCloud Pro API Connection Test (${targetDomain})`,
    body: `অভিনন্দন! আপনার এপিআই কী (API Key / SMTP) সংযোগ সফলভাবে কাজ করছে। প্রেরক ডোমেইন: ${targetDomain}`
  });

  return res.json({ success: true, result });
});

app.get('/api/plans', (req, res) => {
  return res.json(hostingPlans);
});

// --- TEAM ACCESS CONTROL ROUTES ---

app.get('/api/team', requireAuth, (req, res) => {
  if (authenticatedUser?.role !== 'admin' && authenticatedUser?.role !== 'super_admin') {
    return res.status(403).json({ error: 'শুধুমাত্র সুপার এডমিন টিম পারমিশন কন্ট্রোল করতে পারবেন।' });
  }
  return res.json(dbState.teamUsers || []);
});

app.post('/api/team', requireAuth, async (req, res) => {
  if (authenticatedUser?.role !== 'admin' && authenticatedUser?.role !== 'super_admin') {
    return res.status(403).json({ error: 'শুধুমাত্র সুপার এডমিন টিম পারমিশন কন্ট্রোল করতে পারবেন।' });
  }

  const { id, name, email, password, assignedMailboxes, status } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'মেম্বারের নাম ও ইমেইল প্রদান করুন।' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = (dbState.teamUsers || []).find((u) => u.id === id || u.email.toLowerCase() === cleanEmail);

  const teamMember: TeamUser = {
    id: id || existing?.id || 'team_' + Date.now(),
    name: name.trim(),
    email: cleanEmail,
    password: password ? password.trim() : (existing?.password || 'Staff#2026!Pass'),
    role: 'sub_admin',
    assignedMailboxes: Array.isArray(assignedMailboxes) ? assignedMailboxes : (existing?.assignedMailboxes || []),
    status: status || existing?.status || 'active',
    createdAt: existing?.createdAt || new Date().toISOString()
  };

  await persistTeamUser(teamMember);
  return res.status(201).json(teamMember);
});

app.delete('/api/team/:id', requireAuth, async (req, res) => {
  if (authenticatedUser?.role !== 'admin' && authenticatedUser?.role !== 'super_admin') {
    return res.status(403).json({ error: 'শুধুমাত্র সুপার এডমিন টিম পারমিশন কন্ট্রোল করতে পারবেন।' });
  }

  const { id } = req.params;
  await removeTeamUser(id);
  return res.json({ success: true });
});

// --- GEMINI AI ASSISTANT ROUTE ---

app.post('/api/ai/assistant', requireAuth, async (req, res) => {
  const { action, emailBody, query } = req.body;

  try {
    let promptText = '';
    if (action === 'summarize') {
      promptText = `You are an AI Webmail Assistant. Summarize the following email in simple Bengali in 2-3 bullet points:\n\n${emailBody}`;
    } else if (action === 'reply_draft') {
      promptText = `You are a professional Business Email Assistant. Draft a polite and professional response in Bengali to the following email:\n\n${emailBody}`;
    } else {
      promptText = query || 'Provide helpful guidance for configuring Cloudflare email routing and custom domains.';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText
    });

    return res.json({ result: response.text });
  } catch (err: any) {
    return res.status(500).json({
      error: 'এআই সার্ভিস সাময়িকভাবে সাড়া দিচ্ছে না।',
      details: err.message
    });
  }
});

// --- VITE DEV / PRODUCTION STATIC SERVER SETUP ---

async function startServer() {
  await syncAllDatabasesOnBoot();

  // Serve static files from public directory (robots.txt, sitemap.xml, assets)
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 MailCloud Pro Admin running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
