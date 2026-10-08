import { createPool } from '../db/index';
import { Domain, Mailbox, EmailMessage, IntegrationSettings } from '../types';

export async function getPostgresDomains(): Promise<Domain[]> {
  const pool = createPool();
  if (!pool) return [];
  try {
    const res = await pool.query('SELECT * FROM domains ORDER BY created_at ASC');
    return res.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      domainName: row.domain_name,
      status: row.status,
      mxVerified: row.mx_verified,
      spfVerified: row.spf_verified,
      dmarcVerified: row.dmarc_verified,
      mailboxesCount: row.mailboxes_count,
      maxMailboxes: row.max_mailboxes,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('PostgreSQL getDomains notice:', err.message);
    return [];
  }
}

export async function savePostgresDomain(d: Domain): Promise<void> {
  const pool = createPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO domains (id, user_id, domain_name, status, mx_verified, spf_verified, dmarc_verified, mailboxes_count, max_mailboxes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         domain_name = EXCLUDED.domain_name,
         status = EXCLUDED.status,
         mx_verified = EXCLUDED.mx_verified,
         spf_verified = EXCLUDED.spf_verified,
         dmarc_verified = EXCLUDED.dmarc_verified,
         mailboxes_count = EXCLUDED.mailboxes_count,
         max_mailboxes = EXCLUDED.max_mailboxes`,
      [
        d.id,
        d.userId,
        d.domainName,
        d.status,
        d.mxVerified,
        d.spfVerified,
        d.dmarcVerified,
        d.mailboxesCount,
        d.maxMailboxes,
        d.createdAt || new Date().toISOString(),
      ]
    );
  } catch (err: any) {
    console.warn('PostgreSQL saveDomain notice:', err.message);
  }
}

export async function getPostgresMailboxes(): Promise<Mailbox[]> {
  const pool = createPool();
  if (!pool) return [];
  try {
    const res = await pool.query('SELECT * FROM mailboxes ORDER BY created_at ASC');
    return res.rows.map((row) => ({
      id: row.id,
      domainId: row.domain_id,
      address: row.address,
      username: row.username,
      domainName: row.domain_name,
      displayName: row.display_name,
      quotaMb: row.quota_mb,
      usedMb: row.used_mb,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('PostgreSQL getMailboxes notice:', err.message);
    return [];
  }
}

export async function savePostgresMailbox(m: Mailbox): Promise<void> {
  const pool = createPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO mailboxes (id, domain_id, address, username, domain_name, display_name, quota_mb, used_mb, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         address = EXCLUDED.address,
         display_name = EXCLUDED.display_name,
         quota_mb = EXCLUDED.quota_mb,
         used_mb = EXCLUDED.used_mb,
         status = EXCLUDED.status`,
      [
        m.id,
        m.domainId,
        m.address,
        m.username,
        m.domainName,
        m.displayName,
        m.quotaMb,
        m.usedMb,
        m.status,
        m.createdAt || new Date().toISOString(),
      ]
    );
  } catch (err: any) {
    console.warn('PostgreSQL saveMailbox notice:', err.message);
  }
}

export async function deletePostgresMailbox(id: string): Promise<void> {
  const pool = createPool();
  if (!pool) return;
  try {
    await pool.query('DELETE FROM mailboxes WHERE id = $1', [id]);
  } catch (err: any) {
    console.warn('PostgreSQL deleteMailbox notice:', err.message);
  }
}

export async function getPostgresMessages(): Promise<EmailMessage[]> {
  const pool = createPool();
  if (!pool) return [];
  try {
    const res = await pool.query('SELECT * FROM messages ORDER BY date DESC');
    return res.rows.map((row) => ({
      id: row.id,
      mailboxId: row.mailbox_id,
      mailboxAddress: row.mailbox_address,
      from: row.from_address,
      to: row.to_address,
      subject: row.subject,
      body: row.body,
      folder: row.folder as any,
      isRead: row.is_read,
      isStarred: row.is_starred,
      date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      hasAttachments: row.has_attachments,
    }));
  } catch (err: any) {
    console.warn('PostgreSQL getMessages notice:', err.message);
    return [];
  }
}

export async function savePostgresMessage(msg: EmailMessage): Promise<void> {
  const pool = createPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO messages (id, mailbox_id, mailbox_address, from_address, to_address, subject, body, folder, is_read, is_starred, date, has_attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         folder = EXCLUDED.folder,
         is_read = EXCLUDED.is_read,
         is_starred = EXCLUDED.is_starred`,
      [
        msg.id,
        msg.mailboxId,
        msg.mailboxAddress,
        msg.from,
        msg.to,
        msg.subject,
        msg.body,
        msg.folder,
        msg.isRead,
        msg.isStarred,
        msg.date || new Date().toISOString(),
        msg.hasAttachments,
      ]
    );
  } catch (err: any) {
    console.warn('PostgreSQL saveMessage notice:', err.message);
  }
}

export async function getPostgresIntegrations(): Promise<IntegrationSettings | null> {
  const pool = createPool();
  if (!pool) return null;
  try {
    const res = await pool.query("SELECT * FROM integrations WHERE id = 'global_settings'");
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        cloudflareApiToken: row.cloudflare_api_token,
        cloudflareZoneId: row.cloudflare_zone_id,
        cpanelHost: row.cpanel_host,
        cpanelUsername: row.cpanel_username,
        cpanelApiToken: row.cpanel_api_token,
        resendApiKey: row.resend_api_key,
        resendApiKey2: row.resend_api_key_2 || undefined,
        bimiLogoUrl: row.bimi_logo_url,
        bimiSvgContent: row.bimi_svg_content,
        adminPassword: row.admin_password,
        is2FAEnabled: row.is_2fa_enabled === true,
      };
    }
  } catch (err: any) {
    console.warn('PostgreSQL getIntegrations notice:', err.message);
  }
  return null;
}

export async function savePostgresIntegrations(s: IntegrationSettings): Promise<void> {
  const pool = createPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO integrations (id, cloudflare_api_token, cloudflare_zone_id, cpanel_host, cpanel_username, cpanel_api_token, resend_api_key, bimi_logo_url, bimi_svg_content, admin_password, is_2fa_enabled)
       VALUES ('global_settings', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         cloudflare_api_token = EXCLUDED.cloudflare_api_token,
         cloudflare_zone_id = EXCLUDED.cloudflare_zone_id,
         cpanel_host = EXCLUDED.cpanel_host,
         cpanel_username = EXCLUDED.cpanel_username,
         cpanel_api_token = EXCLUDED.cpanel_api_token,
         resend_api_key = EXCLUDED.resend_api_key,
         bimi_logo_url = EXCLUDED.bimi_logo_url,
         bimi_svg_content = EXCLUDED.bimi_svg_content,
         admin_password = EXCLUDED.admin_password,
         is_2fa_enabled = EXCLUDED.is_2fa_enabled`,
      [
        s.cloudflareApiToken || null,
        s.cloudflareZoneId || null,
        s.cpanelHost || null,
        s.cpanelUsername || null,
        s.cpanelApiToken || null,
        s.resendApiKey || null,
        s.bimiLogoUrl || null,
        s.bimiSvgContent || null,
        s.adminPassword || null,
        s.is2FAEnabled === true,
      ]
    );
  } catch (err: any) {
    console.warn('PostgreSQL saveIntegrations notice:', err.message);
  }
}
