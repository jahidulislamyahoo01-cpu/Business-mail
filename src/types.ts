export type UserRole = 'admin' | 'client' | 'super_admin' | 'sub_admin';

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

export type AccessRole = 'super_admin' | 'sub_admin';

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
