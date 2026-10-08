import fs from 'fs';
import path from 'path';
import { Domain, Mailbox, EmailMessage, IntegrationSettings, TeamUser } from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DbSchema {
  domains: Domain[];
  mailboxes: Mailbox[];
  messages: EmailMessage[];
  integrations: IntegrationSettings;
  teamUsers: TeamUser[];
}

const DEFAULT_DOMAINS: Domain[] = [
  {
    id: 'dom_giftghor',
    userId: 'usr_admin',
    domainName: 'giftghor.world',
    status: 'verified',
    mxVerified: true,
    spfVerified: true,
    dmarcVerified: true,
    mailboxesCount: 1,
    maxMailboxes: 50,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_MAILBOXES: Mailbox[] = [
  {
    id: 'mb_contact_giftghor',
    domainId: 'dom_giftghor',
    address: 'contact@giftghor.world',
    username: 'contact',
    domainName: 'giftghor.world',
    displayName: 'GiftGhor Contact Desk',
    quotaMb: 5000,
    usedMb: 120,
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mb_noreply_giftghor',
    domainId: 'dom_giftghor',
    address: 'no-reply@giftghor.world',
    username: 'no-reply',
    domainName: 'giftghor.world',
    displayName: 'MailCloud Pro Security Desk',
    quotaMb: 5000,
    usedMb: 50,
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_MESSAGES: EmailMessage[] = [
  {
    id: 'msg_welcome_giftghor',
    mailboxId: 'mb_contact_giftghor',
    mailboxAddress: 'contact@giftghor.world',
    from: 'system@mailcloud.pro',
    to: 'contact@giftghor.world',
    subject: 'MailCloud Pro বিজনেস ওয়েবমেইলে স্বাগতম',
    body: 'অভিনন্দন! আপনার ডোমেইন contact@giftghor.world সফভাবে প্রস্তুত করা হয়েছে। এখান থেকে আপনি যেকাউকে ইমেইল পাঠাতে ও রিসিভ করতে পারবেন।',
    folder: 'inbox',
    isRead: false,
    isStarred: true,
    date: new Date().toISOString(),
    hasAttachments: false
  }
];

export function ensureDbFile(): DbSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DbSchema = {
        domains: DEFAULT_DOMAINS,
        mailboxes: DEFAULT_MAILBOXES,
        messages: DEFAULT_MESSAGES,
        integrations: {},
        teamUsers: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }

    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content) as DbSchema;

    if (!parsed.teamUsers) {
      parsed.teamUsers = [];
    }

    // Permanently purge any legacy test agent mailboxes
    parsed.mailboxes = (parsed.mailboxes || []).filter(
      (m) => !m.id.startsWith('mb_test_') && !m.address.toLowerCase().startsWith('agent')
    );

    if (!parsed.domains.some((d) => d.domainName === 'giftghor.world')) {
      parsed.domains.unshift(DEFAULT_DOMAINS[0]);
    }
    if (!parsed.mailboxes.some((m) => m.address === 'contact@giftghor.world')) {
      parsed.mailboxes.unshift(DEFAULT_MAILBOXES[0]);
    }
    if (!parsed.mailboxes.some((m) => m.address === 'no-reply@giftghor.world')) {
      parsed.mailboxes.push(DEFAULT_MAILBOXES[1]);
    }

    return parsed;
  } catch (err) {
    console.error('Error reading disk db file, falling back:', err);
    return {
      domains: DEFAULT_DOMAINS,
      mailboxes: DEFAULT_MAILBOXES,
      messages: DEFAULT_MESSAGES,
      integrations: {},
      teamUsers: []
    };
  }
}

export function saveDbFile(data: DbSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write disk db file:', err);
  }
}
