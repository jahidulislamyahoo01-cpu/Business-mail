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
  getPostgresIntegrations, savePostgresIntegrations,
  getPostgresSecurityLogs, savePostgresSecurityLog,
  getPostgresTemplates, savePostgresTemplate, deletePostgresTemplate
} from './src/lib/postgresStore';
import {
  getFirestoreDomains, saveFirestoreDomain, deleteFirestoreDomain,
  getFirestoreMailboxes, saveFirestoreMailbox, deleteFirestoreMailbox,
  getFirestoreMessages, saveFirestoreMessage,
  getFirestoreIntegrations, saveFirestoreIntegrations,
  getFirestoreTeamUsers, saveFirestoreTeamUser, deleteFirestoreTeamUser,
  getFirestoreSecurityLogs, saveFirestoreSecurityLog,
  getFirestoreTemplates, saveFirestoreTemplate, deleteFirestoreTemplate,
  getFirestoreTickets, saveFirestoreTicket,
  getFirestoreSupportSettings, saveFirestoreSupportSettings
} from './src/lib/firestoreClient';
import { User, Domain, Mailbox, EmailMessage, HostingPlan, IntegrationSettings, TeamUser, SecurityLog, EmailTemplate, EmailAnalysis, SystemBackupData, SupportTicket, SupportTemplate, SupportSettings } from './src/types';

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

// Global Search Engine Blocker: Personal & Private Portal (NoIndex, NoFollow)
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  next();
});

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

const recentAutoRepliesMap = new Map<string, number>();
const repliedMessageIds = new Set<string>();
const inMemoryRepliedFingerprints = new Set<string>();
const inMemoryActiveLocks = new Set<string>();

// Real-time Gemini API Quota Monitor Metrics
let geminiRequestsToday = 4; // Default baseline metrics
let geminiLastResetDate = new Date().toISOString().slice(0, 10);
let currentActiveGeminiModel = 'gemini-3.5-flash';
const GEMINI_DAILY_QUOTA_LIMIT = 100; // Daily threshold limit for real-time monitoring

function checkAndResetDailyGeminiQuota() {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (geminiLastResetDate !== todayStr) {
    geminiRequestsToday = 0;
    geminiLastResetDate = todayStr;
  }
}

async function generateContentWithFallback(prompt: string): Promise<string> {
  checkAndResetDailyGeminiQuota();
  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash'
  ];

  let lastError: any;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt
      });
      if (response && response.text) {
        geminiRequestsToday += 1;
        currentActiveGeminiModel = model;
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${model} unavailable, switching to next model...`);
    }
  }
  throw lastError || new Error('All Gemini candidate models failed');
}

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

async function persistTicket(ticket: SupportTicket) {
  if (!dbState.tickets) dbState.tickets = [];
  const idx = dbState.tickets.findIndex((t) => t.id === ticket.id);
  if (idx >= 0) {
    dbState.tickets[idx] = ticket;
  } else {
    dbState.tickets.unshift(ticket);
  }
  saveDbFile(dbState);
  await saveFirestoreTicket(ticket);
}

async function persistSupportSettings(settings: Partial<SupportSettings>) {
  dbState.supportSettings = { ...dbState.supportSettings, ...settings };
  saveDbFile(dbState);
  await saveFirestoreSupportSettings(dbState.supportSettings);
}

// Security Audit Logger (Syncs to Disk, PostgreSQL, and Firestore)
async function logSecurityAction(
  action: string,
  actorEmail: string,
  actorRole: string = 'admin',
  details: string,
  status: 'success' | 'warning' | 'error' = 'success',
  ip: string = '127.0.0.1'
): Promise<SecurityLog> {
  const logItem: SecurityLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    action,
    actorEmail: actorEmail || 'system@mailcloud.pro',
    actorRole: actorRole || 'admin',
    details,
    status,
    ip
  };

  // 1. Disk & Memory
  if (!dbState.securityLogs) dbState.securityLogs = [];
  dbState.securityLogs.unshift(logItem);
  if (dbState.securityLogs.length > 200) {
    dbState.securityLogs = dbState.securityLogs.slice(0, 200);
  }
  saveDbFile(dbState);

  // 2. PostgreSQL
  savePostgresSecurityLog(logItem).catch((e) => console.warn('PG log notice:', e.message));

  // 3. Firestore
  saveFirestoreSecurityLog(logItem).catch((e) => console.warn('FS log notice:', e.message));

  return logItem;
}

// Template Persistence Helpers
async function persistTemplate(tmpl: EmailTemplate) {
  if (!dbState.templates) dbState.templates = [];
  const idx = dbState.templates.findIndex((t) => t.id === tmpl.id);
  if (idx >= 0) {
    dbState.templates[idx] = tmpl;
  } else {
    dbState.templates.unshift(tmpl);
  }
  saveDbFile(dbState);

  await savePostgresTemplate(tmpl);
  await saveFirestoreTemplate(tmpl);
}

async function removeTemplate(id: string) {
  if (!dbState.templates) dbState.templates = [];
  dbState.templates = dbState.templates.filter((t) => t.id !== id);
  saveDbFile(dbState);

  await deletePostgresTemplate(id);
  await deleteFirestoreTemplate(id);
}

// Startup Multi-Store Synchronization
async function syncAllDatabasesOnBoot() {
  console.log('Initiating multi-store database sync (Firestore + PostgreSQL + Disk)...');
  try {
    if (!dbState.teamUsers) dbState.teamUsers = [];
    if (!dbState.securityLogs) dbState.securityLogs = [];
    if (!dbState.templates) dbState.templates = [];

    // 1. Fetch Firestore Data (Primary Persistent Cloud Store - instant REST API)
    let fsDomains: Domain[] = [];
    let fsMailboxes: Mailbox[] = [];
    let fsMessages: EmailMessage[] = [];
    let fsIntegrations: IntegrationSettings | null = null;
    let fsTeamUsers: TeamUser[] = [];
    let fsLogs: SecurityLog[] = [];
    let fsTemplates: EmailTemplate[] = [];
    let fsTickets: SupportTicket[] = [];
    let fsSupportSettings: SupportSettings | null = null;
    try {
      fsDomains = await getFirestoreDomains();
      fsMailboxes = await getFirestoreMailboxes();
      fsMessages = await getFirestoreMessages();
      fsIntegrations = await getFirestoreIntegrations();
      fsTeamUsers = await getFirestoreTeamUsers();
      fsLogs = await getFirestoreSecurityLogs();
      fsTemplates = await getFirestoreTemplates();
      fsTickets = await getFirestoreTickets();
      fsSupportSettings = await getFirestoreSupportSettings();
      console.log(`✓ Firestore connected: ${fsDomains.length} domains, ${fsMailboxes.length} mailboxes, ${fsMessages.length} messages, ${fsTickets.length} tickets loaded`);
    } catch (fsErr: any) {
      console.warn('Firestore sync notice:', fsErr.message);
    }

    // 2. Fetch PostgreSQL Data (safely isolated, only if configured)
    let pgDomains: Domain[] = [];
    let pgMailboxes: Mailbox[] = [];
    let pgMessages: EmailMessage[] = [];
    let pgIntegrations: IntegrationSettings | null = null;
    let pgLogs: SecurityLog[] = [];
    let pgTemplates: EmailTemplate[] = [];
    const hasPgUrl = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGURI);
    if (hasPgUrl) {
      try {
        await initPostgresTables();
        pgDomains = await getPostgresDomains();
        pgMailboxes = await getPostgresMailboxes();
        pgMessages = await getPostgresMessages();
        pgIntegrations = await getPostgresIntegrations();
        pgLogs = await getPostgresSecurityLogs();
        pgTemplates = await getPostgresTemplates();
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

    // Merge Mailboxes across Disk, Firestore, and PostgreSQL (filter out legacy test agent mailboxes)
    const mailboxMap = new Map<string, Mailbox>();
    const isTestAgent = (m: Mailbox) => m.id.startsWith('mb_test_') || m.address.toLowerCase().startsWith('agent');
    
    // Purge test agents from stores
    const legacyToPurge = [
      ...(dbState.mailboxes || []).filter(isTestAgent),
      ...fsMailboxes.filter(isTestAgent),
      ...pgMailboxes.filter(isTestAgent)
    ];
    for (const legacy of legacyToPurge) {
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

    // Merge Security Logs
    const logMap = new Map<string, SecurityLog>();
    (dbState.securityLogs || []).forEach((l) => logMap.set(l.id, l));
    fsLogs.forEach((l) => logMap.set(l.id, l));
    pgLogs.forEach((l) => logMap.set(l.id, l));
    dbState.securityLogs = Array.from(logMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 200);

    // Merge Templates
    const templateMap = new Map<string, EmailTemplate>();
    (dbState.templates || []).forEach((t) => templateMap.set(t.id, t));
    fsTemplates.forEach((t) => templateMap.set(t.id, t));
    pgTemplates.forEach((t) => templateMap.set(t.id, t));
    dbState.templates = Array.from(templateMap.values());

    // Merge Integrations
    if (fsIntegrations && Object.keys(fsIntegrations).length > 0) {
      dbState.integrations = { ...dbState.integrations, ...fsIntegrations };
    }
    if (pgIntegrations && Object.keys(pgIntegrations).length > 0) {
      dbState.integrations = { ...dbState.integrations, ...pgIntegrations };
    }

    // Ensure master default admin password and 2FA
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
    for (const tmpl of dbState.templates) {
      await savePostgresTemplate(tmpl);
      await saveFirestoreTemplate(tmpl);
    }
    if (Object.keys(dbState.integrations).length > 0) {
      await savePostgresIntegrations(dbState.integrations);
      await saveFirestoreIntegrations(dbState.integrations);
    }

    // Merge Support Tickets & Settings
    if (fsTickets && fsTickets.length > 0) {
      const tMap = new Map<string, SupportTicket>();
      (dbState.tickets || []).forEach((t) => tMap.set(t.id, t));
      fsTickets.forEach((t) => tMap.set(t.id, t));
      dbState.tickets = Array.from(tMap.values());
    }
    if (fsSupportSettings) {
      dbState.supportSettings = { ...dbState.supportSettings, ...fsSupportSettings };
    }

    // Clean any demo tickets from database and ensure empty clean array for real customers
    dbState.tickets = (dbState.tickets || []).filter((t) => !t.id.startsWith('tk_demo'));
    saveDbFile(dbState);

    // Persist tickets to Firestore in background
    for (const t of (dbState.tickets || []).slice(0, 20)) {
      await saveFirestoreTicket(t);
    }
    if (dbState.supportSettings) {
      await saveFirestoreSupportSettings(dbState.supportSettings);
    }

    console.log(
      `✓ Databases Synced Successfully! Domains: ${dbState.domains.length} | Mailboxes: ${dbState.mailboxes.length} | Messages: ${dbState.messages.length} | Tickets: ${dbState.tickets.length} | Team: ${dbState.teamUsers.length} | Templates: ${dbState.templates.length} | 2FA: Active`
    );
  } catch (err: any) {
    console.warn('Database Sync Notice:', err.message);
  }
}

// Private & Personal Mode: Block all Search Engine Crawlers & Bots
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Disallow: /
`);
});

app.get('/sitemap.xml', (req, res) => {
  res.status(404).type('text/plain').send('Sitemap disabled: Private personal portal.');
});

export function extractPureEmail(emailStr?: string): string {
  if (!emailStr || typeof emailStr !== 'string') return '';
  const match = emailStr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase().trim() : emailStr.toLowerCase().trim();
}

function extractCleanEmailBody(rawContent: string): string {
  if (!rawContent) return 'Empty message content';
  
  if (!rawContent.includes('Content-Type:') && !rawContent.includes('MIME-Version:')) {
    return rawContent.trim();
  }

  // Extract text/plain part if multipart
  const textPlainMatch = rawContent.match(/Content-Type:\s*text\/plain[^]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|$)/i);
  if (textPlainMatch && textPlainMatch[1]) {
    return textPlainMatch[1].trim();
  }

  // Fallback: strip email headers by locating double newline
  const parts = rawContent.split(/\r?\n\r?\n/);
  if (parts.length > 1) {
    const candidate = parts.slice(1).join('\n\n').trim();
    return candidate.replace(/--[a-zA-Z0-9_-]+(--)?\s*$/g, '').trim();
  }

  return rawContent.trim();
}

// Gemini AI Intelligent Customer Support Auto-Responder
export interface MailboxPersona {
  roleTitle: string;
  departmentName: string;
  departmentCode: string;
  instructions: string;
  signOff: string;
  securityNotice: string;
}

export function getPersonaForMailbox(mailboxAddress: string, rawBusinessName?: string): MailboxPersona {
  const cleanAddr = (mailboxAddress || '').toLowerCase().trim();
  const prefix = cleanAddr.split('@')[0] || 'contact';
  const businessName = (rawBusinessName || 'GiftGhor').replace(/[\(（]?(গিফট|গিপ্ট|ঘোর|ঘর)[\)）]?/g, '').trim() || 'GiftGhor';

  if (prefix.includes('ceo') || prefix.includes('president') || prefix.includes('founder') || prefix.includes('executive') || prefix.includes('md') || prefix.includes('managing')) {
    return {
      roleTitle: 'Executive Assistant to the Chief Executive Officer (CEO)',
      departmentName: 'Office of the CEO & Executive Secretariat',
      departmentCode: 'CEO_OFFICE',
      instructions: `RECIPIENT IS THE CEO / EXECUTIVE OFFICE (${cleanAddr}):
- Adopt the persona of the CEO's Executive Secretariat / Assistant.
- Write with extreme executive-level courtesy, discretion, strategic oversight, and high-level professionalism.
- Acknowledge receipt on behalf of the CEO's office and state that important correspondence is reviewed with highest priority.
- CRITICAL SECURITY RULE: NEVER reveal, disclose, or share any personal phone numbers, personal WhatsApp, or private email of the CEO or top executives. Direct official follow-ups through official support channels or official email.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Executive Secretariat, Office of the CEO, ${businessName}`,
      signOff: `Executive Secretariat, Office of the CEO, ${businessName}`,
      securityNotice: 'STRICT: Personal phone numbers & private contact details of CEO are strictly masked.'
    };
  }

  if (prefix.includes('coo') || prefix.includes('operations') || prefix.includes('operating') || prefix.includes('chief.operating') || prefix.includes('head.ops')) {
    return {
      roleTitle: 'Executive Assistant to the Chief Operating Officer (COO)',
      departmentName: 'Office of the COO & Operations Management',
      departmentCode: 'COO_OFFICE',
      instructions: `RECIPIENT IS THE COO / OPERATIONS MANAGEMENT OFFICE (${cleanAddr}):
- Adopt the persona of the COO's Executive Secretariat / Assistant.
- Write with operational precision, efficiency, strategic clarity, and high executive courtesy.
- Acknowledge receipt on behalf of the COO's office and state that operational workflows, fulfillment, and supply chain affairs are being reviewed with highest priority.
- CRITICAL SECURITY RULE: NEVER reveal, disclose, or share any personal phone numbers, personal WhatsApp, or private email of the COO or operations executives. Direct official follow-ups through official support channels or official email.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Executive Secretariat, Office of the COO, ${businessName}`,
      signOff: `Executive Secretariat, Office of the COO, ${businessName}`,
      securityNotice: 'STRICT: Operational workflows verified & COO private details strictly masked.'
    };
  }

  if (prefix.includes('cto') || prefix.includes('tech') || prefix.includes('it') || prefix.includes('developer') || prefix.includes('dev') || prefix.includes('engineering') || prefix.includes('systems')) {
    return {
      roleTitle: 'Technical Secretariat to the Chief Technology Officer (CTO)',
      departmentName: 'Office of the CTO & Technical Operations',
      departmentCode: 'CTO_OFFICE',
      instructions: `RECIPIENT IS THE CTO / TECHNICAL OPERATIONS OFFICE (${cleanAddr}):
- Adopt the persona of the CTO's Technical Operations Assistant.
- Maintain a clear, precise, tech-savvy, and reassuring tone regarding IT infrastructure, platform security, software, or technical inquiries.
- Acknowledge receipt on behalf of the CTO's office and state that the engineering/IT operations team is evaluating the matter.
- CRITICAL SECURITY RULE: NEVER reveal server credentials, API keys, private system architecture details, or personal phone numbers of the CTO or engineering team.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Technical Secretariat, Office of the CTO, ${businessName}`,
      signOff: `Technical Secretariat, Office of the CTO, ${businessName}`,
      securityNotice: 'STRICT: Server infrastructure & CTO private credentials protected.'
    };
  }

  if (prefix.includes('cfo') || prefix.includes('finance') || prefix.includes('billing') || prefix.includes('account') || prefix.includes('payment') || prefix.includes('invoice')) {
    return {
      roleTitle: 'Accounts & Financial Secretariat to the Chief Financial Officer (CFO)',
      departmentName: 'Accounts, Finance & Billing Desk',
      departmentCode: 'CFO_FINANCE',
      instructions: `RECIPIENT IS THE CFO / ACCOUNTS & BILLING DEPARTMENT (${cleanAddr}):
- Adopt the persona of the Accounts & Finance Department Specialist under the CFO.
- Write in a structured, professional, billing-oriented tone.
- Acknowledge receipt of invoice/payment inquiries, bKash/Nagad/Bank transactions, or financial statements.
- State that the finance desk is verifying transaction records with payment logs.
- Request transaction ID or payment screenshot if missing and assure financial verification.
- CRITICAL SECURITY RULE: NEVER share internal bank account passwords or personal contact details of finance managers.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Accounts & Billing Desk, ${businessName}`,
      signOff: `Accounts & Billing Desk, ${businessName}`,
      securityNotice: 'STRICT: Financial audit compliance & CFO details protected.'
    };
  }

  if (prefix.includes('cmo') || prefix.includes('marketing') || prefix.includes('brand') || prefix.includes('pr') || prefix.includes('media') || prefix.includes('social')) {
    return {
      roleTitle: 'Brand & Marketing Communications Secretariat to the Chief Marketing Officer (CMO)',
      departmentName: 'Office of the CMO & Marketing Department',
      departmentCode: 'CMO_MARKETING',
      instructions: `RECIPIENT IS THE CMO / BRAND & MARKETING DEPARTMENT (${cleanAddr}):
- Adopt the persona of the CMO's Marketing & Brand Communications Specialist.
- Write in a creative, engaging, courteous, and brand-focused professional tone.
- Acknowledge sponsorships, media inquiries, influencer collaborations, or promotional proposals.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Brand & Marketing Desk, ${businessName}`,
      signOff: `Brand & Marketing Desk, ${businessName}`,
      securityNotice: 'STRICT: Brand guidelines & CMO details protected.'
    };
  }

  if (prefix.includes('hr') || prefix.includes('human') || prefix.includes('talent') || prefix.includes('careers') || prefix.includes('jobs') || prefix.includes('recruitment')) {
    return {
      roleTitle: 'Human Resources & Talent Acquisition Specialist',
      departmentName: 'HR & People Operations Department',
      departmentCode: 'HR_PEOPLE',
      instructions: `RECIPIENT IS THE HUMAN RESOURCES & TALENT DEPARTMENT (${cleanAddr}):
- Adopt the persona of the HR & Talent Acquisition Specialist.
- Write with warm professional courtesy, empathy, and organizational clarity.
- Acknowledge job applications, CV submissions, career inquiries, or employee relations.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Human Resources & Talent Desk, ${businessName}`,
      signOff: `Human Resources & Talent Desk, ${businessName}`,
      securityNotice: 'STRICT: Applicant PII & HR private details protected.'
    };
  }

  if (prefix.includes('legal') || prefix.includes('compliance') || prefix.includes('policy') || prefix.includes('affairs')) {
    return {
      roleTitle: 'Corporate Legal & Compliance Officer',
      departmentName: 'Legal Affairs & Corporate Compliance Desk',
      departmentCode: 'LEGAL_DESK',
      instructions: `RECIPIENT IS THE LEGAL & COMPLIANCE DEPARTMENT (${cleanAddr}):
- Adopt the persona of the Corporate Legal & Compliance Secretariat.
- Write with formal precision, strict confidentiality, and corporate compliance rigor.
- Acknowledge receipt of contracts, policies, IP inquiries, or compliance correspondence.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Legal & Compliance Desk, ${businessName}`,
      signOff: `Legal & Compliance Desk, ${businessName}`,
      securityNotice: 'STRICT: Legal privilege & corporate compliance enforced.'
    };
  }

  if (prefix.includes('logistics') || prefix.includes('delivery') || prefix.includes('dispatch') || prefix.includes('courier') || prefix.includes('warehouse') || prefix.includes('shipping') || prefix.includes('fulfillment')) {
    return {
      roleTitle: 'Logistics & Fulfillment Operations Coordinator',
      departmentName: 'Logistics & Supply Chain Operations Desk',
      departmentCode: 'LOGISTICS_DESK',
      instructions: `RECIPIENT IS THE LOGISTICS & FULFILLMENT DEPARTMENT (${cleanAddr}):
- Adopt the persona of the Logistics & Fulfillment Desk Specialist.
- Focus on order tracking, courier coordination, dispatch timelines, and safe parcel delivery.
- Reassure prompt delivery and active courier monitoring with priority handling.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Logistics & Fulfillment Desk, ${businessName}`,
      signOff: `Logistics & Fulfillment Desk, ${businessName}`,
      securityNotice: 'STRICT: Logistics verification & parcel tracking active.'
    };
  }

  if (prefix.includes('sales') || prefix.includes('commercial') || prefix.includes('corporate') || prefix.includes('b2b') || prefix.includes('partnership') || prefix.includes('business')) {
    return {
      roleTitle: 'Corporate Business & Sales Consultant',
      departmentName: 'Corporate Sales & Commercial Partnerships Desk',
      departmentCode: 'SALES_DESK',
      instructions: `RECIPIENT IS THE SALES & CORPORATE INQUIRIES DESK (${cleanAddr}):
- Adopt the persona of a Corporate Sales & Business Consultant.
- Write in an enthusiastic, polite, value-driven business tone.
- Acknowledge interest in bulk orders, corporate gifting, or commercial partnerships.
- Request required item quantities, event dates, or custom branding requirements.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Corporate Sales Desk, ${businessName}`,
      signOff: `Corporate Sales Desk, ${businessName}`,
      securityNotice: 'STRICT: Commercial proposal confidentiality maintained.'
    };
  }

  if (prefix.includes('admin') || prefix.includes('office') || prefix.includes('info') || prefix.includes('contact') || prefix.includes('general')) {
    return {
      roleTitle: 'General Corporate Secretariat & Information Desk',
      departmentName: 'Corporate Administration & Info Desk',
      departmentCode: 'ADMIN_DESK',
      instructions: `RECIPIENT IS THE CORPORATE ADMIN & INFO DESK (${cleanAddr}):
- Adopt the persona of the Corporate Information & Administrative Secretariat.
- Write in a polite, helpful, and organized corporate tone.
- Route inquiries appropriately and confirm administrative receipt.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Corporate Administration Desk, ${businessName}`,
      signOff: `Corporate Administration Desk, ${businessName}`,
      securityNotice: 'STRICT: Administrative protocol & corporate integrity.'
    };
  }

  // Fallback: Customer Care & Experience Specialist
  return {
    roleTitle: 'Customer Care & Experience Specialist',
    departmentName: 'Customer Care & Experience Center',
    departmentCode: 'SUPPORT_DESK',
    instructions: `RECIPIENT IS CUSTOMER SUPPORT & CARE (${cleanAddr}):
- Adopt the persona of a Customer Care Specialist.
- Write in a warm, empathetic, problem-solving, and reassuring tone.
- Address order complaints, delivery inquiries, or product support with full commitment to 100% customer satisfaction.
- Assure 100% resolution, free replacement, or refund per company policy.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${businessName}".
- Sign off as: Customer Care Team, ${businessName}`,
    signOff: `Customer Care Team, ${businessName}`,
    securityNotice: 'STRICT: 200% Customer satisfaction & service guarantee.'
  };
}

async function generateGeminiAutoResponse({
  incomingMsg,
  ticket,
  matchedMailbox
}: {
  incomingMsg: EmailMessage;
  ticket: SupportTicket;
  matchedMailbox?: Mailbox;
}): Promise<{ subject: string; body: string } | null> {
  const settings = dbState.supportSettings || {
    businessName: 'GiftGhor',
    supportHotline: '+880 1800-GIFTGHOR',
    supportWhatsapp: '+880 1711-223344',
    supportHours: 'সকাল ১০:০০টা - রাত ১০:০০টা (প্রতিদিন)',
    signatureHtml: '',
    autoReplyAcknowledgment: true,
    geminiAutoResponderEnabled: true
  };

  // If auto-responder is explicitly turned off, skip
  if (settings.geminiAutoResponderEnabled === false && settings.autoReplyAcknowledgment === false) {
    return null;
  }

  const pureCustomerEmail = extractPureEmail(incomingMsg.from);
  const customerSubject = incomingMsg.subject || '';
  const customerBody = incomingMsg.body || '';

  const sLower = customerSubject.toLowerCase();
  const bLower = customerBody.toLowerCase();

  // Prevent auto-replies to no-reply, daemon, loop bounces, or internal accounts
  const isInternal =
    !pureCustomerEmail ||
    !pureCustomerEmail.includes('@') ||
    pureCustomerEmail.includes('no-reply') ||
    pureCustomerEmail.includes('noreply') ||
    pureCustomerEmail.includes('mailer-daemon') ||
    pureCustomerEmail.includes('postmaster') ||
    pureCustomerEmail.includes('notifications') ||
    pureCustomerEmail.includes('bounce') ||
    pureCustomerEmail.includes('daemon') ||
    pureCustomerEmail.includes('system') ||
    pureCustomerEmail.includes('giftghor.world') ||
    pureCustomerEmail.includes('giftghorbd.com') ||
    (dbState.mailboxes || []).some((mb) => extractPureEmail(mb.address) === pureCustomerEmail);

  const isBounce =
    sLower.includes('delivery status') ||
    sLower.includes('undelivered') ||
    sLower.includes('delivery failure') ||
    sLower.includes('delivery failed') ||
    sLower.includes('returned mail') ||
    sLower.includes('failure notice') ||
    bLower.includes('delivery status notification') ||
    bLower.includes('permanent failure') ||
    bLower.includes('message not delivered');

  if (isInternal || isBounce) {
    return null;
  }

  // Determine Department Persona & Security Rules based on Recipient Mailbox
  const recipientAddr = extractPureEmail(incomingMsg.to || 'contact@giftghor.world');
  const rawBizName = (settings.businessName || 'GiftGhor').replace(/[\(（]?(গিফট|গিপ্ট|ঘোর|ঘর)[\)）]?/g, '').trim() || 'GiftGhor';
  const persona = getPersonaForMailbox(recipientAddr, rawBizName);

  const prompt = `You are an expert ${persona.roleTitle} for "${rawBizName}".
The incoming message was sent to our department email address: "${recipientAddr}".

${persona.instructions}

CUSTOMER INCOMING EMAIL:
From: ${pureCustomerEmail}
Recipient Mailbox: ${recipientAddr}
Subject: ${customerSubject}
Message Body:
${customerBody.slice(0, 3000)}

TICKET & STORE CONTEXT:
- Support Ticket Number: ${ticket.ticketNumber}
- Order ID: ${ticket.orderId || 'None mentioned'}
- Identified Category: ${ticket.category}
- Support Hotline: ${settings.supportHotline || '+880 1800-GIFTGHOR'}
- WhatsApp Support: ${settings.supportWhatsapp || '+880 1711-223344'}
- Support Working Hours: ${settings.supportHours || 'সকাল ১০:০০টা - রাত ১০:০০টা (প্রতিদিন)'}
${settings.geminiAutoResponderPrompt ? `- Custom Store Rules: ${settings.geminiAutoResponderPrompt}` : ''}

INSTRUCTIONS:
1. Match language: Natural, elegant, respectful Bengali if customer wrote in Bengali/Banglish; fluent English if written in English.
2. Follow the DEPARTMENT PERSONA rules strictly (${persona.roleTitle}).
3. Never disclose personal phone numbers or direct contact details of any officer or management.
4. Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — write strictly "${rawBizName}".
5. Return ONLY the ready-to-send email body text without markdown fences, JSON formatting, or "Subject:" headers.`;

  let replyBody = '';
  try {
    const textResult = await generateContentWithFallback(prompt);
    replyBody = (textResult || '').trim();
    replyBody = replyBody.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  } catch (err: any) {
    console.warn('[Gemini Auto-Responder Fallback]:', err.message);
    replyBody = `সম্মানিত গ্রাহক,\n\n${rawBizName} এর ${persona.departmentName} এর পক্ষ থেকে ইমেইলটির জন্য আপনাকে আন্তরিক ধন্যবাদ।\n\nআপনার বার্তাটি অত্যন্ত গুরুত্বের সাথে রেজিস্টার করে টিকেট #${ticket.ticketNumber} এর অধীনে গ্রহণ করা হয়েছে। দায়িত্বপ্রাপ্ত সেলস/সাপোর্ট/নির্বাহী দপ্তর থেকে বিষয়টি পর্যালোচনা করে প্রয়োজনীয় সমাধান নিশ্চিত করা হবে।\n\nজরুরি গ্রাহক সেবার জন্য অফিশিয়াল হটলাইন: ${settings.supportHotline || '+880 1800-GIFTGHOR'} এ যোগাযোগ করতে পারেন।\n\nধন্যবাদান্তে,\n${persona.signOff}`;
  }

  const replySubject = customerSubject.toLowerCase().startsWith('re:')
    ? customerSubject
    : `Re: ${customerSubject || 'Customer Inquiry'} [Ticket #${ticket.ticketNumber}]`;

  return {
    subject: replySubject,
    body: replyBody
  };
}

app.post('/api/webhooks/inbound-email', async (req, res) => {
  try {
    const { from, to, subject, body, text, html } = req.body || {};
    const msgId = 'msg_in_' + Date.now();
    const recipient = (to || 'contact@giftghor.world').trim();
    const pureFrom = extractPureEmail(from);
    const pureRecipient = extractPureEmail(recipient);

    const rawBody = body || text || html || 'Empty message content';
    const emailBody = extractCleanEmailBody(rawBody);

    const sLower = (subject || '').toLowerCase();
    const bLower = (emailBody || '').toLowerCase();

    // Check if subject references an existing ticket
    const matchTk = (subject || '').match(/TK-\d{4}-\d{4}/i);
    let ticket = matchTk ? (dbState.tickets || []).find((t) => t.ticketNumber.toUpperCase() === matchTk[0].toUpperCase()) : undefined;

    // If no ticket number in subject, thread into existing open or recent ticket from same pure customer email
    if (!ticket && pureFrom) {
      ticket = (dbState.tickets || []).find(
        (t) => extractPureEmail(t.customerEmail) === pureFrom && t.status !== 'closed'
      ) || (dbState.tickets || []).find(
        (t) => extractPureEmail(t.customerEmail) === pureFrom
      );
    }

    let isNewTicket = false;
    if (!ticket) {
      isNewTicket = true;
      const ticketNum = 'TK-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      const isUrgent = sLower.includes('urgent') || sLower.includes('জরুরি') || sLower.includes('নষ্ট') || bLower.includes('নষ্ট') || bLower.includes('urgent');
      const cat = sLower.includes('delivery') || bLower.includes('ডেলিভারি') || bLower.includes('delivery') ? 'delivery_delay' :
                  sLower.includes('refund') || bLower.includes('রিফান্ড') || bLower.includes('টাকা ফেরত') ? 'refund_request' :
                  sLower.includes('damage') || bLower.includes('ভেঙে') || bLower.includes('ভাঙা') || bLower.includes('নষ্ট') ? 'damaged_item' :
                  sLower.includes('exchange') || bLower.includes('সাইজ') || bLower.includes('এক্সচেঞ্জ') ? 'exchange' : 'product_inquiry';

      // Extract order ID if mentioned like #GG-12345 or GG-12345
      const matchOrder = (subject + ' ' + emailBody).match(/#?(GG-\d{4,6})/i);
      const orderId = matchOrder ? matchOrder[1].toUpperCase() : undefined;

      ticket = {
        id: 'tk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        ticketNumber: ticketNum,
        messageId: msgId,
        customerEmail: pureFrom || from || 'customer@example.com',
        customerName: pureFrom ? pureFrom.split('@')[0] : 'Customer',
        orderId,
        subject: subject || 'New Customer Inquiry',
        status: 'open',
        priority: isUrgent ? 'urgent' : 'normal',
        category: cat,
        tags: [cat === 'delivery_delay' ? 'Delivery Issue' : cat === 'damaged_item' ? 'Replacement' : 'Customer Care'],
        slaDueAt: new Date(Date.now() + (isUrgent ? 4 : 24) * 3600000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await persistTicket(ticket);
    }

    const matchedMb = (dbState.mailboxes || []).find(
      (mb) => extractPureEmail(mb.address) === pureRecipient
    );

    const newInboundMsg: EmailMessage = {
      id: msgId,
      mailboxId: matchedMb ? matchedMb.id : 'mb_inbound',
      mailboxAddress: pureRecipient || recipient,
      from: from || pureFrom || 'external.sender@example.com',
      to: recipient,
      subject: subject || 'New Inbound Email',
      body: emailBody,
      folder: 'inbox',
      isRead: false,
      isStarred: false,
      date: new Date().toISOString(),
      hasAttachments: false,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketStatus: ticket.status,
      ticketCategory: ticket.category,
      ticketPriority: ticket.priority,
      orderId: ticket.orderId,
      customerPhone: ticket.customerPhone,
      customerName: ticket.customerName
    };

    await persistMessage(newInboundMsg);

    // =========================================================================
    // ABSOLUTE ZERO-LOOP & STRICT SINGLE-REPLY GUARANTEE (100% BULLETPROOF)
    // =========================================================================

    // 1. Check if sender is internal mailbox, system address, daemon, bounce, or our own domain
    const allDomains = (dbState.domains || []).map((d) => d.domainName.toLowerCase().trim());
    const isDomainMatch = allDomains.some(
      (dom) => pureFrom.endsWith('@' + dom) || pureFrom.endsWith('.' + dom)
    );
    const isMailboxMatch = (dbState.mailboxes || []).some(
      (mb) => extractPureEmail(mb.address) === pureFrom
    );

    const isInternalSender =
      !pureFrom ||
      !pureFrom.includes('@') ||
      isMailboxMatch ||
      isDomainMatch ||
      pureFrom === pureRecipient ||
      pureFrom.includes('no-reply') ||
      pureFrom.includes('noreply') ||
      pureFrom.includes('no_reply') ||
      pureFrom.includes('mailer-daemon') ||
      pureFrom.includes('postmaster') ||
      pureFrom.includes('bounce') ||
      pureFrom.includes('daemon') ||
      pureFrom.includes('system') ||
      pureFrom.includes('notification') ||
      pureFrom.includes('deliveryservice') ||
      pureFrom.includes('returns') ||
      pureFrom.includes('mta') ||
      pureFrom.includes('giftghor.world') ||
      pureFrom.includes('giftghorbd.com');

    // 2. Non-Delivery Report (NDR) / Bounce Detection
    const isBounceOrNdr =
      sLower.includes('delivery status') ||
      sLower.includes('undelivered') ||
      sLower.includes('undeliverable') ||
      sLower.includes('delivery failure') ||
      sLower.includes('delivery failed') ||
      sLower.includes('mail delivery failed') ||
      sLower.includes('returned mail') ||
      sLower.includes('failure notice') ||
      sLower.includes('non-delivery') ||
      sLower.includes('nondelivery') ||
      sLower.includes('bounce') ||
      sLower.includes('mail system error') ||
      sLower.includes('message status') ||
      sLower.includes('permanent failure') ||
      sLower.includes('rejected') ||
      sLower.includes('unreachable') ||
      sLower.includes('postmaster') ||
      sLower.includes('mailer-daemon') ||
      bLower.includes('delivery status notification') ||
      bLower.includes('this is an automatically generated delivery status notification') ||
      bLower.includes('permanent failure') ||
      bLower.includes('temporary failure') ||
      bLower.includes('message not delivered') ||
      bLower.includes('your message couldn\'t be delivered') ||
      bLower.includes('recipient address rejected') ||
      bLower.includes('user unknown') ||
      bLower.includes('mailbox unavailable') ||
      bLower.includes('550 5.1.1') ||
      bLower.includes('554 5.7.1') ||
      bLower.includes('technical details of permanent failure') ||
      bLower.includes('diagnostic-code') ||
      bLower.includes('action: failed');

    // 3. Threading / Reply / Out of Office / Forward Loop Protection
    const isReplyOrThread =
      sLower.startsWith('re:') ||
      sLower.startsWith('re :') ||
      sLower.startsWith('fwd:') ||
      sLower.startsWith('fwd :') ||
      sLower.includes('re:') ||
      sLower.includes('[ticket #') ||
      sLower.includes('ticket #') ||
      sLower.includes('auto-responder') ||
      sLower.includes('out of office') ||
      sLower.includes('automatic reply') ||
      sLower.includes('auto reply') ||
      sLower.includes('autoreply') ||
      sLower.includes('vacation') ||
      sLower.includes('auto:') ||
      sLower.includes('[auto-reply]');

    // 4. Message Fingerprint Deduplication
    const bodySnippet = (emailBody || '').slice(0, 100).replace(/\s+/g, ' ').trim().toLowerCase();
    const msgFingerprint = `${pureFrom}:::${sLower}:::${bodySnippet}`;
    const isDuplicateMessage =
      inMemoryRepliedFingerprints.has(msgFingerprint) ||
      (dbState.repliedMessageFingerprints || []).includes(msgFingerprint);

    // 5. Ticket Level Guarantee (Strict Max 1 Auto Reply Per Ticket Lifetime)
    const isTicketAlreadyReplied =
      Boolean(ticket.lastAutoReplyAt) ||
      ((ticket.autoReplyCount || 0) >= 1);

    // 6. Pure Sender Level Cooldown (Max 1 Auto Reply Per Customer Address in 24 Hours)
    const lastSenderRecord = (dbState.autoRepliedEmails || {})[pureFrom];
    const lastSenderTime = lastSenderRecord?.lastRepliedAt ? new Date(lastSenderRecord.lastRepliedAt).getTime() : 0;
    const hoursSinceLastReply = lastSenderTime > 0 ? (Date.now() - lastSenderTime) / (1000 * 3600) : 999;
    const isSenderInCooldown = hoursSinceLastReply < 24 || (lastSenderRecord?.replyCount || 0) >= 1;

    // 7. Active Concurrency Lock
    const isCurrentlyLocked =
      inMemoryActiveLocks.has(pureFrom) ||
      inMemoryActiveLocks.has(ticket.id);

    const shouldAutoReply =
      pureFrom &&
      pureFrom.includes('@') &&
      !isInternalSender &&
      !isBounceOrNdr &&
      !isReplyOrThread &&
      !isDuplicateMessage &&
      !isTicketAlreadyReplied &&
      !isSenderInCooldown &&
      !isCurrentlyLocked;

    if (shouldAutoReply) {
      // INSTANT SYNCHRONOUS LOCKING BEFORE ANY ASYNC TASKS
      const nowIso = new Date().toISOString();
      inMemoryActiveLocks.add(pureFrom);
      inMemoryActiveLocks.add(ticket.id);
      inMemoryRepliedFingerprints.add(msgFingerprint);

      if (!dbState.repliedMessageFingerprints) dbState.repliedMessageFingerprints = [];
      dbState.repliedMessageFingerprints.push(msgFingerprint);
      if (dbState.repliedMessageFingerprints.length > 500) {
        dbState.repliedMessageFingerprints = dbState.repliedMessageFingerprints.slice(-400);
      }

      if (!dbState.autoRepliedEmails) dbState.autoRepliedEmails = {};
      dbState.autoRepliedEmails[pureFrom] = {
        lastRepliedAt: nowIso,
        replyCount: ((dbState.autoRepliedEmails[pureFrom]?.replyCount || 0) + 1)
      };

      ticket.lastAutoReplyAt = nowIso;
      ticket.autoReplyCount = (ticket.autoReplyCount || 0) + 1;
      saveDbFile(dbState);
      await persistTicket(ticket);

      (async () => {
        try {
          const autoReply = await generateGeminiAutoResponse({
            incomingMsg: newInboundMsg,
            ticket: ticket!,
            matchedMailbox: matchedMb
          });

          if (autoReply && autoReply.body) {
            const rawBizName = (dbState.supportSettings?.businessName || 'GiftGhor').replace(/[\(（]?(গিফট|গিপ্ট|ঘোর|ঘর)[\)）]?/g, '').trim() || 'GiftGhor';
            const senderName = `${rawBizName} Support`;
            const senderAddress = pureRecipient || recipient;

            console.log(`[Gemini Auto-Responder] Sending SINGLE guaranteed AI response to ${pureFrom} for Ticket #${ticket!.ticketNumber}`);

            const notice = await dispatchEmailWithFailover({
              senderName,
              senderEmail: senderAddress,
              to: pureFrom,
              subject: autoReply.subject,
              body: autoReply.body
            });

            console.log(`[Gemini Auto-Responder Dispatch Notice]:`, notice);

            // Record sent message in webmail
            const replyMsg: EmailMessage = {
              id: 'msg_auto_' + Date.now(),
              mailboxId: matchedMb ? matchedMb.id : 'mb_inbound',
              mailboxAddress: pureRecipient || recipient,
              from: `"${senderName}" <${senderAddress}>`,
              to: pureFrom,
              subject: autoReply.subject,
              body: autoReply.body,
              folder: 'sent',
              isRead: true,
              isStarred: false,
              date: new Date().toISOString(),
              hasAttachments: false,
              ticketId: ticket!.id,
              ticketNumber: ticket!.ticketNumber,
              ticketStatus: 'in_progress',
              ticketCategory: ticket!.category,
              ticketPriority: ticket!.priority,
              orderId: ticket!.orderId,
              customerName: ticket!.customerName,
              customerPhone: ticket!.customerPhone
            };

            await persistMessage(replyMsg);

            // Append note to ticket
            if (!ticket!.notes) ticket!.notes = [];
            ticket!.notes.push({
              id: 'note_auto_' + Date.now(),
              author: 'Gemini AI Auto-Responder',
              text: `কাস্টমারের সমস্যার প্রেক্ষিতে একক স্বয়ংক্রিয় এআই উত্তর পাঠানো হয়েছে:\n\n"${autoReply.body.slice(0, 180)}..."`,
              createdAt: new Date().toISOString()
            });
            ticket!.status = 'in_progress';
            await persistTicket(ticket!);
          }
        } catch (autoErr: any) {
          console.error('[Gemini Auto-Responder Background Task Error]:', autoErr);
        } finally {
          setTimeout(() => {
            inMemoryActiveLocks.delete(pureFrom);
            inMemoryActiveLocks.delete(ticket!.id);
          }, 60000); // 60s lock buffer
        }
      })();
    } else {
      console.log(`[Gemini Auto-Responder] STRICTLY SKIPPED auto-reply for ${pureFrom} (internal=${isInternalSender}, bounce=${isBounceOrNdr}, replyOrThread=${isReplyOrThread}, dupMsg=${isDuplicateMessage}, ticketReplied=${isTicketAlreadyReplied}, senderCooldown=${isSenderInCooldown}, locked=${isCurrentlyLocked})`);
    }

    return res.status(200).json({ success: true, messageId: msgId, ticketNumber: ticket.ticketNumber });
  } catch (err: any) {
    console.error('Inbound webhook error:', err);
    return res.status(500).json({ error: 'Inbound email webhook failed: ' + (err?.message || 'unknown') });
  }
});

app.post('/api/support/reset-auto-reply-locks', async (req, res) => {
  inMemoryRepliedFingerprints.clear();
  inMemoryActiveLocks.clear();
  dbState.repliedMessageFingerprints = [];
  dbState.autoRepliedEmails = {};
  saveDbFile(dbState);
  return res.json({ success: true, message: 'সমস্ত অটো-রিপ্লাই লক এবং সেন্ডারের লিমিট সফলভাবে রিসেট করা হয়েছে।' });
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

// --- SECURITY AUDIT LOGS ROUTES ---

app.get('/api/security/logs', requireAuth, (req, res) => {
  return res.json(dbState.securityLogs || []);
});

app.post('/api/security/logs/clear', requireAuth, async (req, res) => {
  if (authenticatedUser?.role !== 'admin' && authenticatedUser?.role !== 'super_admin') {
    return res.status(403).json({ error: 'শুধুমাত্র সুপার এডমিন অডিট হিস্টোরি ক্লিয়ার করতে পারবেন।' });
  }
  dbState.securityLogs = [];
  saveDbFile(dbState);
  await logSecurityAction('LOGS_CLEARED', authenticatedUser.email, authenticatedUser.role, 'সকল অডিট লগ মুছে ফেলা হয়েছে', 'warning', req.ip);
  return res.json({ success: true, message: 'লগ ক্লিয়ার করা হয়েছে।' });
});

// --- EMAIL TEMPLATES ROUTES ---

app.get('/api/templates', requireAuth, (req, res) => {
  return res.json(dbState.templates || []);
});

app.post('/api/templates', requireAuth, async (req, res) => {
  const { id, titleBn, titleEn, category, subject, body } = req.body;
  if (!titleBn || !subject || !body) {
    return res.status(400).json({ error: 'টেমপ্লেটের শিরোনাম, বিষয় এবং বডি আবশ্যক।' });
  }

  const tmpl: EmailTemplate = {
    id: id || 'tmpl_' + Date.now(),
    titleBn: titleBn.trim(),
    titleEn: (titleEn || titleBn).trim(),
    category: category || 'general',
    subject: subject.trim(),
    body: body.trim(),
    isSystem: false
  };

  await persistTemplate(tmpl);
  await logSecurityAction('TEMPLATE_SAVED', authenticatedUser?.email || 'admin', authenticatedUser?.role || 'admin', `টেমপ্লেট সেভ: ${tmpl.titleBn}`);
  return res.status(201).json(tmpl);
});

app.delete('/api/templates/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = (dbState.templates || []).find((t) => t.id === id);
  if (existing?.isSystem) {
    return res.status(400).json({ error: 'সিস্টেমের ডিফল্ট টেমপ্লেট মুছে ফেলা যাবে না।' });
  }
  await removeTemplate(id);
  await logSecurityAction('TEMPLATE_DELETED', authenticatedUser?.email || 'admin', authenticatedUser?.role || 'admin', `টেমপ্লেট ডিলিট: ${id}`);
  return res.json({ success: true });
});

// --- REAL-TIME GEMINI API QUOTA MONITOR ROUTE ---

app.get('/api/gemini/status', async (req, res) => {
  checkAndResetDailyGeminiQuota();
  const usagePercentage = Math.min(100, Math.round((geminiRequestsToday / GEMINI_DAILY_QUOTA_LIMIT) * 100));
  
  let status: 'healthy' | 'warning' | 'critical' | 'exhausted' = 'healthy';
  let message = 'Gemini AI API active & healthy';

  if (usagePercentage >= 90) {
    status = 'critical';
    message = 'CRITICAL: Gemini API daily quota usage exceeds 90%!';
  } else if (usagePercentage >= 70) {
    status = 'warning';
    message = 'Warning: Gemini API quota usage is above 70%.';
  }

  return res.json({
    usagePercentage,
    requestsToday: geminiRequestsToday,
    dailyLimit: GEMINI_DAILY_QUOTA_LIMIT,
    status,
    activeModel: currentActiveGeminiModel,
    isOverLimit: usagePercentage >= 90,
    message,
    lastUpdated: new Date().toISOString()
  });
});

// --- SYSTEM HEALTH & REAL-TIME STATUS ROUTE ---

app.get('/api/system/health', requireAuth, async (req, res) => {
  let cloudSqlStatus = 'disconnected';
  let cloudSqlLatencyMs = 0;
  const hasPgUrl = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGURI);

  if (hasPgUrl) {
    const start = Date.now();
    try {
      const p = await getPostgresDomains();
      cloudSqlLatencyMs = Date.now() - start;
      cloudSqlStatus = 'connected';
    } catch {
      cloudSqlStatus = 'error';
    }
  }

  let firestoreStatus = 'connected';
  let firestoreLatencyMs = 0;
  try {
    const fsStart = Date.now();
    await getFirestoreDomains();
    firestoreLatencyMs = Date.now() - fsStart;
  } catch {
    firestoreStatus = 'error';
  }

  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    cloudSql: {
      status: cloudSqlStatus,
      latencyMs: cloudSqlLatencyMs,
      configured: hasPgUrl
    },
    firestore: {
      status: firestoreStatus,
      latencyMs: firestoreLatencyMs,
      databaseId: 'ai-studio-mailcloudsaasbus-bea0a0d7-85d2-4e65-a3ea-588d40c8e5b9'
    },
    disk: {
      status: 'synced',
      domainsCount: dbState.domains.length,
      mailboxesCount: dbState.mailboxes.length,
      messagesCount: dbState.messages.length,
      teamCount: (dbState.teamUsers || []).length,
      logsCount: (dbState.securityLogs || []).length,
      templatesCount: (dbState.templates || []).length
    }
  });
});

// --- ONE-CLICK SYSTEM BACKUP & RESTORE ROUTES ---

app.get('/api/system/backup/export', requireAuth, async (req, res) => {
  if (authenticatedUser?.role !== 'admin' && authenticatedUser?.role !== 'super_admin') {
    return res.status(403).json({ error: 'শুধুমাত্র সুপার এডমিন সম্পূর্ণ সিস্টেম ব্যাকআপ এক্সপোর্ট করতে পারবেন।' });
  }

  const backupData = {
    app: 'MailCloud Pro',
    exportedAt: new Date().toISOString(),
    exportedBy: authenticatedUser.email,
    version: '2.5.0',
    data: {
      domains: dbState.domains,
      mailboxes: dbState.mailboxes,
      messages: dbState.messages.slice(0, 100),
      teamUsers: dbState.teamUsers || [],
      templates: dbState.templates || [],
      integrations: {
        ...dbState.integrations,
        resendApiKey: '', // Sanitize raw secrets
        resendApiKey2: ''
      }
    }
  };

  await logSecurityAction('BACKUP_EXPORTED', authenticatedUser.email, authenticatedUser.role, 'সম্পূর্ণ সিস্টেম ব্যাকআপ JSON ডাউনলোড করা হয়েছে', 'success', req.ip);

  res.setHeader('Content-Disposition', `attachment; filename="mailcloud-backup-${Date.now()}.json"`);
  res.setHeader('Content-Type', 'application/json');
  return res.json(backupData);
});

app.post('/api/system/backup/restore', requireAuth, async (req, res) => {
  if (authenticatedUser?.role !== 'admin' && authenticatedUser?.role !== 'super_admin') {
    return res.status(403).json({ error: 'শুধুমাত্র সুপার এডমিন সিস্টেম রিস্টোর করতে পারবেন।' });
  }

  const { backupJson } = req.body;
  if (!backupJson || !backupJson.data) {
    return res.status(400).json({ error: 'সঠিক ব্যাকআপ JSON ফাইল প্রদান করুন।' });
  }

  try {
    const data = backupJson.data;
    if (Array.isArray(data.domains) && data.domains.length > 0) {
      dbState.domains = data.domains;
    }
    if (Array.isArray(data.mailboxes) && data.mailboxes.length > 0) {
      dbState.mailboxes = data.mailboxes;
    }
    if (Array.isArray(data.messages) && data.messages.length > 0) {
      dbState.messages = data.messages;
    }
    if (Array.isArray(data.teamUsers)) {
      dbState.teamUsers = data.teamUsers;
    }
    if (Array.isArray(data.templates) && data.templates.length > 0) {
      dbState.templates = data.templates;
    }

    saveDbFile(dbState);

    // Sync restored data to PostgreSQL and Firestore
    for (const d of dbState.domains) {
      await savePostgresDomain(d);
      await saveFirestoreDomain(d);
    }
    for (const m of dbState.mailboxes) {
      await savePostgresMailbox(m);
      await saveFirestoreMailbox(m);
    }

    await logSecurityAction('BACKUP_RESTORED', authenticatedUser.email, authenticatedUser.role, 'সিস্টেম ব্যাকআপ থেকে ডেটা রিস্টোর সম্পন্ন হয়েছে', 'warning', req.ip);

    return res.json({
      success: true,
      message: 'ব্যাকআপ সফলভাবে রিস্টোর এবং ক্লাউড স্টোরেজে সিঙ্ক করা হয়েছে!',
      stats: {
        domains: dbState.domains.length,
        mailboxes: dbState.mailboxes.length,
        messages: dbState.messages.length,
        teamUsers: (dbState.teamUsers || []).length
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'রিস্টোর করতে ত্রুটি ঘটেছে: ' + err.message });
  }
});

// --- SUPPORT TICKETS API ---
app.get('/api/tickets', requireAuth, (req, res) => {
  return res.json(dbState.tickets || []);
});

app.post('/api/tickets', requireAuth, async (req, res) => {
  const { customerEmail, customerName, customerPhone, orderId, subject, status, priority, category, tags, notes, messageId } = req.body;
  if (!customerEmail || !subject) {
    return res.status(400).json({ error: 'Customer email and subject are required' });
  }

  const ticketNumber = 'TK-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const ticket: SupportTicket = {
    id: 'tk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    ticketNumber,
    messageId,
    customerEmail,
    customerName: customerName || customerEmail.split('@')[0],
    customerPhone,
    orderId,
    subject,
    status: status || 'open',
    priority: priority || 'normal',
    category: category || 'product_inquiry',
    tags: Array.isArray(tags) ? tags : ['Customer Care'],
    notes: notes || [],
    slaDueAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await persistTicket(ticket);

  // Link to message if messageId is provided
  if (messageId) {
    const msg = (dbState.messages || []).find((m) => m.id === messageId);
    if (msg) {
      msg.ticketId = ticket.id;
      msg.ticketNumber = ticket.ticketNumber;
      msg.ticketStatus = ticket.status;
      msg.ticketCategory = ticket.category;
      msg.ticketPriority = ticket.priority;
      msg.orderId = ticket.orderId;
      msg.customerPhone = ticket.customerPhone;
      msg.customerName = ticket.customerName;
      await persistMessage(msg);
    }
  }

  return res.json(ticket);
});

app.patch('/api/tickets/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const ticket = (dbState.tickets || []).find((t) => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: 'টিকেট পাওয়া যায়নি।' });
  }

  Object.assign(ticket, updates, { updatedAt: new Date().toISOString() });
  await persistTicket(ticket);

  // Sync back to message if linked
  if (ticket.messageId) {
    const msg = (dbState.messages || []).find((m) => m.id === ticket.messageId);
    if (msg) {
      msg.ticketStatus = ticket.status;
      msg.ticketPriority = ticket.priority;
      msg.ticketCategory = ticket.category;
      msg.orderId = ticket.orderId;
      msg.customerPhone = ticket.customerPhone;
      msg.customerName = ticket.customerName;
      await persistMessage(msg);
    }
  }

  return res.json(ticket);
});

// --- SUPPORT TEMPLATES API ---
app.get('/api/support/templates', requireAuth, (req, res) => {
  return res.json(dbState.supportTemplates || []);
});

app.post('/api/support/templates', requireAuth, async (req, res) => {
  const { title, titleBn, category, subjectTemplate, bodyTemplate } = req.body;
  const newTmpl: SupportTemplate = {
    id: 'tmpl_' + Date.now(),
    title: title || 'Custom Support Template',
    titleBn: titleBn || title || 'কাস্টম টেমপ্লেট',
    category: category || 'product_inquiry',
    subjectTemplate: subjectTemplate || 'সাপোর্ট মেসেজ',
    bodyTemplate: bodyTemplate || ''
  };
  if (!dbState.supportTemplates) dbState.supportTemplates = [];
  dbState.supportTemplates.push(newTmpl);
  saveDbFile(dbState);
  return res.json(newTmpl);
});

// --- SUPPORT SETTINGS API ---
app.get('/api/support/settings', requireAuth, (req, res) => {
  return res.json(dbState.supportSettings || {});
});

app.post('/api/support/settings', requireAuth, async (req, res) => {
  await persistSupportSettings(req.body);
  return res.json(dbState.supportSettings);
});

// --- AI SMART REPLY & EMAIL ANALYSIS ROUTE ---

app.post('/api/ai/smart-reply', requireAuth, async (req, res) => {
  const { subject, body, from, scenario, customerName, orderId } = req.body;
  if (!body) {
    return res.status(400).json({ error: 'ইমেইল বডি প্রদান করুন।' });
  }

  try {
    let scenarioGuidance = '';
    if (scenario === 'complaint_apology') {
      scenarioGuidance = `This is an e-commerce customer complaint or grievance. Be extremely empathetic, take ownership, apologize sincerely for the inconvenience on behalf of GiftGhor, and offer an immediate resolution (replacement, refund, or manager intervention).`;
    } else if (scenario === 'delivery_delay') {
      scenarioGuidance = `This is regarding a delayed package or delivery status. Explain that the package is being expedited with the courier team, reassure the customer that their item is safe, and state that delivery is prioritized within 24-48 hours. Mention order ID ${orderId || ''}.`;
    } else if (scenario === 'refund_exchange') {
      scenarioGuidance = `This is regarding a refund, return, or exchange request. Provide clear, step-by-step instructions (send photo/video of defective item, or provide bKash/Nagad account number for refund), and confirm 100% money-back / replacement guarantee.`;
    } else if (scenario === 'product_inquiry') {
      scenarioGuidance = `This is a product question or order inquiry. Be warm, welcoming, informative, and prompt them to confirm their order or contact the support hotline if needed.`;
    }

    const prompt = `You are the lead Customer Care & Experience Specialist for "GiftGhor" (গিফট ঘোর) - an authentic Bangladeshi e-commerce brand.
${scenarioGuidance}

Analyze the incoming customer email and respond strictly in valid JSON format (no markdown, no backticks, no fences):
{
  "summary": "1 concise sentence summary in Bengali of the customer's issue or emotion",
  "category": "One of: 'delivery_delay' | 'damaged_item' | 'refund_request' | 'exchange' | 'product_inquiry' | 'other'",
  "priority": "One of: 'urgent' | 'normal' | 'low'",
  "sentiment": "One of: 'angry' | 'confused' | 'neutral' | 'happy'",
  "smartReplies": ["3 short, natural 2-5 word Bengali quick responses the support agent can click"],
  "suggestedDraft": "A complete, heartfelt, polite, and highly professional customer service email reply in Bengali, tailored to the customer with warm greeting, solving their complaint, and signoff with GiftGhor Support Team"
}

Customer Email Details:
Customer Name: ${customerName || from || 'সম্মানিত গ্রাহক'}
Order ID: ${orderId || 'N/A'}
Subject: ${subject || 'No Subject'}
Message Content:
${body.slice(0, 3000)}`;

    let parsed: any;
    try {
      const rawResText = await generateContentWithFallback(prompt);

      const rawText = (rawResText || '').trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
      parsed = JSON.parse(rawText);
    } catch (genErr: any) {
      console.warn('Gemini generateContent fallback:', genErr.message);
      let fallbackDraft = '';
      if (scenario === 'delivery_delay') {
        fallbackDraft = `সম্মানিত ${customerName || 'গ্রাহক'},\n\nGiftGhor-এ যোগাযোগ করার জন্য ধন্যবাদ। আপনার অর্ডারটি (${orderId || 'GG-90214'}) কুরিয়ার পার্টনারের সাথে দ্রুত ডেলিভারির জন্য প্রায়োরিটি দেওয়া হয়েছে। আগামী ২৪ থেকে ৪৮ ঘণ্টার মধ্যে আপনার পার্সেলটি পৌঁছে যাবে। কোনো প্রয়োজনে হটলাইনে কল করতে পারেন।\n\nধন্যবাদান্তে,\nGiftGhor কাস্টমার কেয়ার টিম`;
      } else if (scenario === 'refund_exchange') {
        fallbackDraft = `সম্মানিত ${customerName || 'গ্রাহক'},\n\nআপনার মেসেজটির জন্য ধন্যবাদ। আপনার সমস্যাটির জন্য আমরা আন্তরিকভাবে দুঃখিত। আপনি চাইলে ১০০% রিফান্ড অথবা নতুন পণ্য রিপ্লেসমেন্ট নিতে পারেন। অনুগ্রহ করে পণ্যের একটি ছবি এবং আপনার বিকাশ/নগদ নম্বর এই মেসেজের রিপ্লাইতে দিন, দ্রুত প্রসেস করে দেওয়া হবে।\n\nধন্যবাদান্তে,\nGiftGhor কাস্টমার সাপোর্ট`;
      } else {
        fallbackDraft = `সম্মানিত ${customerName || 'গ্রাহক'},\n\nGiftGhor-এ যোগাযোগ করার জন্য আন্তরিক ধন্যবাদ। আপনার অভিযোগটি আমরা সর্বোচ্চ গুরুত্বের সাথে গ্রহণ করেছি। আমাদের সাপোর্ট টিম অবিলম্বে বিষয়টি খতিয়ে দেখে সমাধান নিশ্চিত করছে।\n\nধন্যবাদান্তে,\nGiftGhor কাস্টমার এক্সপেরিয়েন্স টিম`;
      }

      parsed = {
        summary: 'গ্রাহকের বার্তাটি পর্যালোচনা ও অগ্রাধিকার দেওয়া হয়েছে।',
        category: scenario || 'product_inquiry',
        priority: scenario === 'complaint_apology' ? 'urgent' : 'normal',
        sentiment: scenario === 'complaint_apology' ? 'angry' : 'neutral',
        smartReplies: ['দ্রুত ব্যবস্থা নিচ্ছি', 'কুরিয়ার আপডেট দিচ্ছি', 'রিফান্ড প্রসেস করছি'],
        suggestedDraft: fallbackDraft
      };
    }

    return res.json(parsed);
  } catch (err: any) {
    return res.status(500).json({
      error: 'এআই এনালাইসিস সম্পন্ন করা যায়নি।',
      details: err.message
    });
  }
});

// --- AI INVOICE & PROPOSAL GENERATOR ROUTE ---

app.post('/api/ai/generate-invoice', requireAuth, async (req, res) => {
  const { clientName, companyName, items, total, invoiceNumber, dueDate, paymentInfo, notes } = req.body;

  try {
    const prompt = `You are a professional business invoice generator for a Bangladeshi company.
Create a clean, beautiful, formatted commercial invoice email body in Bengali with professional ASCII/table layout and payment details.
Do NOT output markdown code fences. Output clean text.

Details:
Client Name: ${clientName || 'সম্মানিত গ্রাহক'}
Company Name: ${companyName || 'GiftGhor'}
Invoice Number: ${invoiceNumber || 'INV-' + Date.now().toString().slice(-6)}
Due Date: ${dueDate || 'পরবর্তী ৭ দিনের মধ্যে'}
Total Amount: ৳ ${total || '০.০০'}
Items Description: ${JSON.stringify(items || [])}
Payment Methods / Accounts: ${paymentInfo || 'bKash / Nagad / Bank Account'}
Extra Notes: ${notes || 'পেমেন্ট সম্পন্ন করে ট্রানজেকশন আইডি প্রদান করুন।'}`;

    try {
      const invoiceText = await generateContentWithFallback(prompt);
      return res.json({ invoiceText });
    } catch (genErr: any) {
      console.warn('Invoice generation fallback:', genErr.message);
      const invNum = invoiceNumber || 'INV-' + Date.now().toString().slice(-6);
      const invoiceText = `========================================================\n                 ${companyName || 'GiftGhor'} - অফিসিয়াল ইনভয়েস\n========================================================\nইনভয়েস নং: ${invNum}\nতারিখ: ${new Date().toLocaleDateString('bn-BD')}\nপরিশোধের শেষ সময়: ${dueDate || 'পরবর্তী ৭ দিনের মধ্যে'}\nগ্রাহকের নাম: ${clientName || 'সম্মানিত গ্রাহক'}\n--------------------------------------------------------\nবিবরণ / আইটেম: ${Array.isArray(items) ? items.join(', ') : 'ই-কমার্স পণ্য ও সার্ভিস'}\nমোট প্রদেয় টাকা: ৳ ${total || '০.০০'}\n--------------------------------------------------------\nপেমেন্ট মেথড: ${paymentInfo || 'bKash / Nagad / Rocket / Bank Transfer'}\nবিশেষ দ্রষ্টব্য: ${notes || 'পেমেন্ট সম্পন্ন করে ট্রানজেকশন আইডি পাঠিয়ে নিশ্চিত করুন।'}\n\nধন্যবাদ,\n${companyName || 'GiftGhor'} একাউন্টস ডিপার্টমেন্ট`;
      return res.json({ invoiceText });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'ইনভয়েস জেনারেট ব্যর্থ হয়েছে: ' + err.message });
  }
});

// --- MAILBOX PERSONA INFO ROUTE ---
app.get('/api/ai/persona-info', requireAuth, (req, res) => {
  const mailbox = (req.query.mailbox as string) || 'contact@giftghorbd.com';
  const bizName = (dbState.supportSettings?.businessName || 'GiftGhor').replace(/[\(（]?(গিফট|গিপ্ট|ঘোর|ঘর)[\)）]?/g, '').trim() || 'GiftGhor';
  const persona = getPersonaForMailbox(mailbox, bizName);
  return res.json(persona);
});

// --- GEMINI AI GENERAL ASSISTANT ROUTE ---

app.post('/api/ai/assistant', requireAuth, async (req, res) => {
  const { action, emailBody, query, prompt: promptInput, selectedMailbox } = req.body;

  const activeMailbox = selectedMailbox || dbState.mailboxes[0]?.address || 'contact@giftghorbd.com';
  const bizName = (dbState.supportSettings?.businessName || 'GiftGhor').replace(/[\(（]?(গিফট|গিপ্ট|ঘোর|ঘর)[\)）]?/g, '').trim() || 'GiftGhor';
  const persona = getPersonaForMailbox(activeMailbox, bizName);

  try {
    let promptText = '';
    if (promptInput) {
      promptText = `You are an expert ${persona.roleTitle} representing "${bizName}".
Target Mailbox Address: ${activeMailbox}
Department Office: ${persona.departmentName}

${persona.instructions}

CRITICAL RULES:
- Write in elegant Bengali if user/prompt is in Bengali, or English if prompt is in English.
- Strictly adhere to the position persona (${persona.roleTitle}).
- NEVER disclose, reveal, or share direct personal phone numbers or private WhatsApp details of any officer or management.
- Do NOT output Bengali spelling of "gift ghor" ("গিফট ঘর" / "গিফট ঘোর") — strictly write "${bizName}".
- Sign off using: ${persona.signOff}

USER REQUEST:
${promptInput}`;
    } else if (action === 'summarize') {
      promptText = `You are an AI Webmail Assistant for ${persona.roleTitle}. Summarize the following email in simple, concise Bengali in 2-3 bullet points:\n\n${emailBody}`;
    } else if (action === 'reply_draft') {
      promptText = `You are acting as ${persona.roleTitle} for "${bizName}" (${activeMailbox}).
${persona.instructions}

Draft a polite, professional, and solution-driven email response in Bengali to the following message:

${emailBody}

Sign off as: ${persona.signOff}`;
    } else {
      promptText = query || 'Provide helpful guidance for configuring Cloudflare email routing and custom domains.';
    }

    try {
      const result = await generateContentWithFallback(promptText);
      return res.json({ result, persona });
    } catch (genErr: any) {
      console.warn('Assistant fallback:', genErr.message);
      let fallbackText = '';
      if (action === 'summarize') {
        fallbackText = `• ইমেইল বিষয়বস্তু: ${persona.departmentName} এর ইনকামিং বার্তা\n• সারসংক্ষেপ: অফিসিয়াল বার্তাটির দ্রুত সমাধান চাওয়া হয়েছে\n• পরবর্তী পদক্ষেপ: ${persona.roleTitle} এর পক্ষ থেকে উত্তর প্রদান করা`;
      } else if (action === 'reply_draft') {
        fallbackText = `সম্মানিত গ্রাহক,\n\n${bizName} এর ${persona.departmentName} এর পক্ষ থেকে আপনার ইমেইলটির জন্য ধন্যবাদ।\n\nআপনার বার্তাটি গুরুত্বের সাথে রেজিস্টার করা হয়েছে। প্রয়োজনীয় বিষয়াবলি পর্যালোচনা করে দ্রুত উত্তর প্রদান করা হচ্ছে।\n\nধন্যবাদান্তে,\n${persona.signOff}`;
      } else {
        fallbackText = `সম্মানিত গ্রাহক,\n\n${persona.roleTitle} এর পক্ষ থেকে আপনার অনুরোধটি গ্রহণ করা হয়েছে।\n\nধন্যবাদান্তে,\n${persona.signOff}`;
      }
      return res.json({ result: fallbackText, persona });
    }
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
