export type UserRole = 'admin' | 'client' | 'super_admin' | 'sub_admin' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string;
  planId?: string;
  assignedMailboxes?: string[];
  createdAt: string;
}

export type AccessRole = 'super_admin' | 'sub_admin' | 'manager';

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: AccessRole;
  assignedMailboxes: string[]; // List of allowed mailbox addresses
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  action: string;
  actorEmail: string;
  actorRole?: string;
  details: string;
  status: 'success' | 'warning' | 'error';
  ip?: string;
}

export interface EmailTemplate {
  id: string;
  titleBn: string;
  titleEn: string;
  category: 'invoice' | 'welcome' | 'support' | 'notification' | 'general';
  subject: string;
  body: string;
  isSystem?: boolean;
}

export interface EmailAnalysis {
  category: 'inquiry' | 'billing' | 'support' | 'promotional' | 'important' | 'spam';
  priority: 'urgent' | 'normal' | 'low';
  summary: string;
  smartReplies: string[];
}

export interface SystemBackupData {
  exportedAt: string;
  version: string;
  domains: Domain[];
  mailboxes: Mailbox[];
  messagesCount: number;
  teamUsersCount: number;
  securityLogsCount: number;
  templatesCount: number;
  cloudSqlStatus: string;
  firestoreStatus: string;
}

export type DomainStatus = 'verified' | 'pending' | 'failed';

export interface Domain {
  id: string;
  userId: string;
  domainName: string;
  status: DomainStatus;
  mxVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  mailboxesCount: number;
  maxMailboxes: number;
  resendApiKey?: string;
  createdAt: string;
}

export interface Mailbox {
  id: string;
  domainId: string;
  address: string; // e.g. contact@mycompany.com
  username: string; // e.g. contact
  domainName: string;
  displayName: string;
  quotaMb: number;
  usedMb: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash';

export interface EmailMessage {
  id: string;
  mailboxId: string;
  mailboxAddress: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  folder: EmailFolder;
  isRead: boolean;
  isStarred: boolean;
  date: string;
  hasAttachments?: boolean;
  ticketId?: string;
  ticketNumber?: string;
  ticketStatus?: TicketStatus;
  ticketCategory?: TicketCategory;
  ticketPriority?: TicketPriority;
  orderId?: string;
  customerPhone?: string;
  customerName?: string;
}

export interface HostingPlan {
  id: string;
  name: string;
  nameBn: string;
  priceMonthly: number;
  maxDomains: number;
  maxMailboxesPerDomain: number;
  storageMbPerMailbox: number;
  features: string[];
}

export interface IntegrationSettings {
  cloudflareApiToken?: string;
  cloudflareZoneId?: string;
  cpanelHost?: string;
  cpanelUsername?: string;
  cpanelApiToken?: string;
  resendApiKey?: string;
  resendApiKey2?: string;
  smtp2goApiKey?: string;
  brevoApiKey?: string;
  gmailUser?: string;
  gmailAppPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  bimiLogoUrl?: string;
  bimiSvgContent?: string;
  defaultLogoUrl?: string;
  googleSiteVerification?: string;
  adminPassword?: string;
  is2FAEnabled?: boolean;
}

export interface DnsRecord {
  type: 'MX' | 'TXT' | 'CNAME';
  host: string;
  value: string;
  priority?: number;
  ttl: string;
  purpose: string;
}

export interface DnsCheckResponse {
  domain: string;
  mxVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  mxRecords: string[];
  txtRecords: string[];
}

export type SetupMethod = 'cloudflare_gmail' | 'zoho_free' | 'improv_brevo' | 'self_host';

export interface DnsCheckResult {
  domain: string;
  mxVerified?: boolean;
  spfVerified?: boolean;
  dmarcVerified?: boolean;
  mxRecords?: string[];
  txtRecords?: string[];
  mx?: any;
  txt?: any;
}

export interface MethodDetails {
  id: SetupMethod;
  titleBn: string;
  titleEn: string;
  badge: string;
  cost: string;
  storage: string;
  difficultyBn: string;
  rating: number;
  summaryBn: string;
  prosBn: string[];
  consBn: string[];
  recommendedForBn: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'delivery_delay' | 'damaged_item' | 'refund_request' | 'exchange' | 'product_inquiry' | 'payment_issue' | 'other';

export interface CustomerNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string; // e.g. 'tk_17912384'
  ticketNumber: string; // e.g. 'TK-2026-1042'
  messageId?: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  orderId?: string; // e.g. 'GG-90214'
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  tags: string[];
  notes?: CustomerNote[];
  slaDueAt?: string;
  lastAutoReplyAt?: string;
  autoReplyCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTemplate {
  id: string;
  title: string;
  titleBn: string;
  category: TicketCategory;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface SupportSettings {
  autoReplyAcknowledgment: boolean;
  acknowledgmentSubject: string;
  acknowledgmentBody: string;
  businessName: string;
  supportHotline: string;
  supportWhatsapp: string;
  supportHours: string;
  signatureHtml: string;
  geminiAutoResponderEnabled?: boolean;
  geminiAutoResponderPrompt?: string;
}

export interface GeminiApiStatus {
  usagePercentage: number;
  requestsToday: number;
  dailyLimit: number;
  status: 'healthy' | 'warning' | 'critical' | 'exhausted';
  activeModel: string;
  isOverLimit: boolean;
  message?: string;
  lastUpdated: string;
}


