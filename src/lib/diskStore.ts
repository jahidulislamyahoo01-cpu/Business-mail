import fs from 'fs';
import path from 'path';
import { Domain, Mailbox, EmailMessage, IntegrationSettings, TeamUser, SecurityLog, EmailTemplate, SupportTicket, SupportTemplate, SupportSettings } from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DbSchema {
  domains: Domain[];
  mailboxes: Mailbox[];
  messages: EmailMessage[];
  integrations: IntegrationSettings;
  teamUsers: TeamUser[];
  securityLogs: SecurityLog[];
  templates: EmailTemplate[];
  tickets: SupportTicket[];
  supportTemplates: SupportTemplate[];
  supportSettings: SupportSettings;
  autoRepliedEmails?: Record<string, { lastRepliedAt: string; replyCount: number }>;
  repliedMessageFingerprints?: string[];
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

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tmpl_invoice_pro',
    titleBn: 'প্রফেশনাল কমার্শিয়াল ইনভয়েস (Invoice & Bill)',
    titleEn: 'Commercial Invoice & Payment Notice',
    category: 'invoice',
    subject: 'ইনভয়েস #{INVOICE_NUMBER} - {COMPANY_NAME}',
    body: `প্রিয় {CLIENT_NAME},

আপনার সেবার জন্য ধন্যবাদ। আপনার সাম্প্রতিক অর্ডারের অফিশিয়াল ইনভয়েস নিচে সংযুক্ত করা হলো:

--------------------------------------------------
ইনভয়েস নং: #{INVOICE_NUMBER}
তারিখ: {DATE}
পরিশোধের শেষ তারিখ: {DUE_DATE}
--------------------------------------------------
বিবরণ:
১. {ITEM_1_DESC} - ৳ {ITEM_1_PRICE}
২. {ITEM_2_DESC} - ৳ {ITEM_2_PRICE}

সর্বমোট প্রদেয়: ৳ {TOTAL_AMOUNT}
--------------------------------------------------

পেমেন্ট মেথড:
- ব্যাংক একাউন্ট / bKash / Nagad: {PAYMENT_DETAILS}

পেমেন্ট সম্পন্ন করে অনুগ্রহ করে ট্রান্সফার রিসিট বা ট্রানজেকশন আইডি সহ রিপ্লাই দিন।

বিনীত,
{SENDER_NAME}
{COMPANY_NAME}
ইমেইল: {SENDER_EMAIL}`,
    isSystem: true
  },
  {
    id: 'tmpl_welcome_client',
    titleBn: 'নতুন ক্লায়েন্ট অনবোর্ডিং (Welcome & Setup)',
    titleEn: 'New Client Onboarding & Welcome',
    category: 'welcome',
    subject: '{COMPANY_NAME}-এ আপনাকে স্বাগতম!',
    body: `প্রিয় {CLIENT_NAME},

আমাদের সাথে যুক্ত হওয়ার জন্য আন্তরিক ধন্যবাদ ও অভিনন্দন! আপনার একাউন্ট সফলভাবে একটিভ করা হয়েছে।

আপনার সার্ভিস সংক্রান্ত যেকোনো সহায়তার জন্য আমাদের এই বিজনেস ইমেইলে সরাসরি যোগাযোগ করতে পারেন।

গুরুত্বপূর্ণ লিংক ও তথ্য:
- ক্লায়েন্ট পোর্টাল: {PORTAL_URL}
- সাপোর্ট হটলাইন: {PHONE_NUMBER}

আমরা আপনার সাথে দীর্ঘমেয়াদী সফল সম্পর্কের প্রত্যাশা করছি।

শুভকামনায়,
{SENDER_NAME}
{COMPANY_NAME}`,
    isSystem: true
  },
  {
    id: 'tmpl_support_resolution',
    titleBn: 'কাস্টমার সাপোর্ট ও ইস্যু সমাধান (Support Resolved)',
    titleEn: 'Customer Support Resolution',
    category: 'support',
    subject: 'টিকেট সমাধান: #{TICKET_ID} - {SUBJECT}',
    body: `প্রিয় {CLIENT_NAME},

আপনার বিষয়টি সমাধান করা হয়েছে। আমরা সিস্টেমটি পুঙ্খানুপুঙ্খভাবে টেস্ট করে যাচাই করেছি।

অনুগ্রহ করে আপনার দিক থেকে চেক করে কনফার্ম করুন। যদি এখনও কোনো সমস্যা বা বাড়তি জিজ্ঞাসা থাকে, নির্দ্বিধায় এই ইমেইলের উত্তর দিন।

আমাদের সার্ভিসের মান উন্নয়নে আপনার রেটিং বা মতামত আমাদের জন্য অত্যন্ত মূল্যবান।

ধন্যবাদান্তে,
কাস্টমার সাপোর্ট টিম
{COMPANY_NAME}`,
    isSystem: true
  },
  {
    id: 'tmpl_order_confirmation',
    titleBn: 'অর্ডার কনফার্মেশন ও ট্র্যাকিং (Order Confirmation)',
    titleEn: 'Order Confirmation & Dispatch',
    category: 'notification',
    subject: 'অর্ডার নিশ্চিতকরণ: #{ORDER_NUMBER}',
    body: `প্রিয় {CLIENT_NAME},

আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। 

অর্ডার আইডি: #{ORDER_NUMBER}
ডেলিভারি ঠিকানা: {SHIPPING_ADDRESS}
আনুমানিক ডেলিভারি সময়: {DELIVERY_TIME}

প্যাকেজটি কুরিয়ারে হস্তান্তর করা মাত্রই আপনাকে ট্র্যাকিং কোড পাঠিয়ে দেওয়া হবে।

ধন্যবাদ,
{COMPANY_NAME}`,
    isSystem: true
  }
];

export const DEFAULT_SUPPORT_TEMPLATES: SupportTemplate[] = [
  {
    id: 'tmpl_delay',
    title: 'Delivery Delay Apology & Courier Tracking',
    titleBn: 'ডেলিভারি বিলম্বের আন্তরিক দুঃখপ্রকাশ ও ট্র্যাকিং',
    category: 'delivery_delay',
    subjectTemplate: 'অর্ডার ডেলিভারি আপডেট - অর্ডার #{ORDER_ID}',
    bodyTemplate: `সম্মানিত গ্রাহক,

আপনার অর্ডারটির (অর্ডার নং: #{ORDER_ID}) ডেলিভারিতে অনাকাঙ্ক্ষিত বিলম্ব হওয়ার জন্য আমরা আন্তরিকভাবে দুঃখিত। 

আপনার পার্সেলটি বর্তমানে কুরিয়ার সার্ভিসে ট্রানজিটে রয়েছে। আমাদের টিম ইতিমধ্যে কুরিয়ার হাবের সাথে যোগাযোগ করেছে যাতে আগামী ২৪-৪৮ ঘণ্টার মধ্যে অগ্রাধিকার ভিত্তিতে আপনার ঠিকানায় পার্সেলটি পৌঁছে দেওয়া হয়।

কুরিয়ার ট্র্যাকিং কোড: #{TRACKING_CODE}
কুরিয়ার ট্র্যাকিং লিঙ্ক: #{TRACKING_LINK}

যেকোনো সহায়তায় আমাদের হটলাইনে সরাসরি কল করতে পারেন: #{HOTLINE}

ধন্যবাদান্তে,
#{BUSINESS_NAME} কাস্টমার কেয়ার টিম`
  },
  {
    id: 'tmpl_damaged',
    title: 'Damaged / Wrong Item Free Replacement',
    titleBn: 'ক্ষতিগ্রস্ত বা ভুল প্রোডাক্টের ফ্রি রিপ্লেসমেন্ট',
    category: 'damaged_item',
    subjectTemplate: 'প্রোডাক্ট রিপ্লেসমেন্ট কনফার্মেশন - অর্ডার #{ORDER_ID}',
    bodyTemplate: `সম্মানিত গ্রাহক,

আপনার পার্সেলটিতে ত্রুটিপূর্ণ/ক্ষতিগ্রস্ত প্রোডাক্ট পৌঁছানোর জন্য আমরা অত্যন্ত দুঃখিত ও ক্ষমাপ্রার্থী।

গ্রাহক সন্তুষ্টিই আমাদের সর্বোচ্চ অগ্রাধিকার। আপনার সমস্যার কারণে আমরা সম্পূর্ণ নিজস্ব খরচে নতুন একটি ফ্রেশ প্রোডাক্ট রিপ্লেসমেন্ট পাঠানোর সিদ্ধান্ত নিয়েছি।

অনুগ্রহ করে এই ইমেইলে রিপ্লাই করে ক্ষতিগ্রস্ত প্রোডাক্টের একটি ছবি বা ছোট ভিডিও ক্লিপ পাঠিয়ে দিন। ছবি পাওয়ার সাথে সাথেই নতুন পার্সেল ডিসপ্যাচ করা হবে।

ধন্যবাদান্তে,
#{BUSINESS_NAME} সাপোর্ট টিম`
  },
  {
    id: 'tmpl_refund',
    title: 'Refund Request Approved & Account Details',
    titleBn: 'রিফান্ড রিকোয়েস্ট অনুমোদন ও একাউন্ট তথ্য',
    category: 'refund_request',
    subjectTemplate: 'রিফান্ড রিকোয়েস্ট অনুমোদিত - টিকেট #{TICKET_ID}',
    bodyTemplate: `সম্মানিত গ্রাহক,

আপনার অর্ডার #{ORDER_ID} সম্পর্কিত রিফান্ড রিকোয়েস্টটি আমাদের অডিট টিম সফলভাবে অনুমোদন করেছে।

টাকা ফেরত পাঠানোর জন্য অনুগ্রহ করে নিচের তথ্যগুলো রিপ্লাই করুন:
১. বিকাশ / নগদ / ব্যাংক একাউন্ট নম্বর:
২. একাউন্টের ধরন (Personal / Agent):
৩. একাউন্ট হোল্ডারের নাম:

তথ্য পাওয়ার পরবর্তী ৩ থেকে ৫ কার্যদিবসের মধ্যে আপনার কাঙ্ক্ষিত মাধ্যমে রিফান্ড সম্পন্ন করে ট্রানজেকশন আইডি জানিয়ে দেওয়া হবে।

ধন্যবাদান্তে,
#{BUSINESS_NAME} একাউন্টস ও সাপোর্ট টিম`
  },
  {
    id: 'tmpl_exchange',
    title: 'Product Size / Color Exchange Guide',
    titleBn: 'প্রোডাক্ট সাইজ বা কালার এক্সচেঞ্জ গাইডলাইন',
    category: 'exchange',
    subjectTemplate: 'প্রোডাক্ট এক্সচেঞ্জ সহায়তা - অর্ডার #{ORDER_ID}',
    bodyTemplate: `সম্মানিত গ্রাহক,

আপনার অর্ডারের সাইজ/কালার পরিবর্তনের অনুরোধটি আমরা গ্রহণ করেছি। 

আমাদের এক্সচেঞ্জ পলিসি অনুযায়ী:
১. ডেলিভারি ম্যান আপনার ঠিকানায় নতুন সাইজ/কালারটি নিয়ে যাবে।
২. আপনি আগের প্রোডাক্টটি ডেলিভারি ম্যানের হাতে ফেরত দিয়ে নতুনটি বুঝে নেবেন।

অনুগ্রহ করে নিশ্চিত করুন যে প্রোডাক্টের মূল ট্যাগ ও প্যাকেজিং অক্ষত রয়েছে।

ধন্যবাদান্তে,
#{BUSINESS_NAME} লজিস্টিক সাপোর্ট`
  },
  {
    id: 'tmpl_inquiry',
    title: 'General Support & Hotline Contact',
    titleBn: 'সাধারণ তথ্য ও কাস্টমার কেয়ার সহায়তা',
    category: 'product_inquiry',
    subjectTemplate: 'আপনার প্রশ্নের সমাধান - #{BUSINESS_NAME}',
    bodyTemplate: `সম্মানিত গ্রাহক,

#{BUSINESS_NAME}-এ যোগাযোগ করার জন্য আপনাকে ধন্যবাদ। 

আপনার অনুসন্ধানটি আমাদের সাপোর্ট এক্সিকিউটিভ পর্যালোচনা করেছেন। আপনার চাহিদামতো বিস্তারিত তথ্য নিচে দেওয়া হলো:

[এখানে বিস্তারিত তথ্য লিখুন]

যেকোনো প্রয়োজনে আমাদের অফিসিয়াল হোয়াটসঅ্যাপ বা হটলাইনে যুক্ত হতে পারেন।

ধন্যবাদান্তে,
#{BUSINESS_NAME} কাস্টমার সাপোর্ট`
  }
];

export const DEFAULT_SUPPORT_SETTINGS: SupportSettings = {
  autoReplyAcknowledgment: true,
  acknowledgmentSubject: 'We received your inquiry - Ticket #{TICKET_ID}',
  acknowledgmentBody: `Dear Customer,

Thank you for reaching out to #{BUSINESS_NAME} Customer Support. We have received your inquiry and created support ticket #{TICKET_ID}.

Our customer support team is actively reviewing your message and will provide a resolution within 2-4 hours.

If your issue is urgent, you can also reach us via Hotline: #{HOTLINE} or WhatsApp: #{WHATSAPP}.

Warm regards,
#{BUSINESS_NAME} Customer Experience Team
Support Hours: #{HOURS}`,
  businessName: 'GiftGhor',
  supportHotline: '+880 1800-GIFTGHOR',
  supportWhatsapp: '+880 1711-223344',
  supportHours: 'সকাল ১০:০০টা - রাত ১০:০০টা (প্রতিদিন)',
  signatureHtml: `<div style="font-family: 'Hind Siliguri', sans-serif; font-size: 13px; color: #334155; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; line-height: 1.6;">
  <strong style="color: #ea580c; font-size: 14px;">GiftGhor Customer Care</strong><br/>
  📞 হটলাইন: <a href="tel:+8801800443844" style="color: #0284c7; text-decoration: none;">+880 1800-GIFTGHOR</a> | 💬 হোয়াটসঅ্যাপ: <a href="https://wa.me/8801711223344" style="color: #16a34a; text-decoration: none;">+880 1711-223344</a><br/>
  🌐 ওয়েবসাইট: <a href="https://giftghor.world" style="color: #ea580c; text-decoration: none;">giftghor.world</a> | ⏰ সার্ভিস সময়: সকাল ১০:০০টা - রাত ১০:০০টা (প্রতিদিন)
</div>`
};

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
        teamUsers: [],
        securityLogs: [],
        templates: DEFAULT_TEMPLATES,
        tickets: [],
        supportTemplates: DEFAULT_SUPPORT_TEMPLATES,
        supportSettings: DEFAULT_SUPPORT_SETTINGS
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }

    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content) as DbSchema;

    if (!parsed.teamUsers) {
      parsed.teamUsers = [];
    }
    if (!parsed.securityLogs) {
      parsed.securityLogs = [];
    }
    if (!parsed.templates || parsed.templates.length === 0) {
      parsed.templates = DEFAULT_TEMPLATES;
    }
    if (!parsed.tickets) {
      parsed.tickets = [];
    }
    if (!parsed.supportTemplates || parsed.supportTemplates.length === 0) {
      parsed.supportTemplates = DEFAULT_SUPPORT_TEMPLATES;
    }
    if (!parsed.supportSettings) {
      parsed.supportSettings = DEFAULT_SUPPORT_SETTINGS;
    }
    if (!parsed.autoRepliedEmails) {
      parsed.autoRepliedEmails = {};
    }
    if (!parsed.repliedMessageFingerprints) {
      parsed.repliedMessageFingerprints = [];
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
      teamUsers: [],
      securityLogs: [],
      templates: DEFAULT_TEMPLATES,
      tickets: [],
      supportTemplates: DEFAULT_SUPPORT_TEMPLATES,
      supportSettings: DEFAULT_SUPPORT_SETTINGS
    };
  }
}

export function saveDbFile(data: DbSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Sanitize raw API keys so disk and git never get blocked by GitHub push protection
    const sanitized: DbSchema = {
      ...data,
      integrations: {
        ...data.integrations,
        resendApiKey: '',
        resendApiKey2: ''
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write disk db file:', err);
  }
}
