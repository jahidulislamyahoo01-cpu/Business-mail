import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('admin'),
  companyName: text('company_name'),
  planId: text('plan_id').default('plan_pro'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const domains = pgTable('domains', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  domainName: text('domain_name').notNull().unique(),
  status: text('status').notNull().default('pending'),
  mxVerified: boolean('mx_verified').default(false).notNull(),
  spfVerified: boolean('spf_verified').default(false).notNull(),
  dmarcVerified: boolean('dmarc_verified').default(false).notNull(),
  mailboxesCount: integer('mailboxes_count').default(0).notNull(),
  maxMailboxes: integer('max_mailboxes').default(50).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mailboxes = pgTable('mailboxes', {
  id: text('id').primaryKey(),
  domainId: text('domain_id').references(() => domains.id, { onDelete: 'cascade' }).notNull(),
  address: text('address').notNull().unique(),
  username: text('username').notNull(),
  domainName: text('domain_name').notNull(),
  displayName: text('display_name').notNull(),
  quotaMb: integer('quota_mb').default(5000).notNull(),
  usedMb: integer('used_mb').default(0).notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  mailboxId: text('mailbox_id').notNull(),
  mailboxAddress: text('mailbox_address').notNull(),
  from: text('from_address').notNull(),
  to: text('to_address').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  folder: text('folder').default('inbox').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  isStarred: boolean('is_starred').default(false).notNull(),
  date: timestamp('date').defaultNow().notNull(),
  hasAttachments: boolean('has_attachments').default(false).notNull(),
});

export const integrations = pgTable('integrations', {
  id: text('id').primaryKey().default('global_settings'),
  cloudflareApiToken: text('cloudflare_api_token'),
  cloudflareZoneId: text('cloudflare_zone_id'),
  cpanelHost: text('cpanel_host'),
  cpanelUsername: text('cpanel_username'),
  cpanelApiToken: text('cpanel_api_token'),
  resendApiKey: text('resend_api_key'),
  adminPassword: text('admin_password'),
  is2FAEnabled: boolean('is_2fa_enabled').default(true),
});
