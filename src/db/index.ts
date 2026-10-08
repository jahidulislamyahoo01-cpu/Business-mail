import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

declare global {
  var _postgresPool: pg.Pool | undefined;
}

export const getConnectionString = (): string | null => {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.PGURI ||
    process.env.PGCONNECTSTRING ||
    null
  );
};

export const createPool = (): pg.Pool | null => {
  const connString = getConnectionString();

  if (!connString) {
    return null;
  }

  if (!global._postgresPool) {
    const isProduction = process.env.NODE_ENV === 'production' || !!connString;
    const poolConfig: pg.PoolConfig = {
      connectionString: connString,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: 10,
      connectionTimeoutMillis: 3000,
    };

    try {
      global._postgresPool = new Pool(poolConfig);
      global._postgresPool.on('error', (err) => {
        console.error('PostgreSQL Pool Error:', err.message);
      });
    } catch (err) {
      console.error('Failed to create PostgreSQL Pool:', err);
      return null;
    }
  }

  return global._postgresPool;
};

const pool = createPool();
export const db = pool ? drizzle(pool, { schema }) : null;

export async function initPostgresTables() {
  const activePool = createPool();
  if (!activePool) return false;

  try {
    const client = await activePool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS domains (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          domain_name TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'pending',
          mx_verified BOOLEAN NOT NULL DEFAULT FALSE,
          spf_verified BOOLEAN NOT NULL DEFAULT FALSE,
          dmarc_verified BOOLEAN NOT NULL DEFAULT FALSE,
          mailboxes_count INTEGER NOT NULL DEFAULT 0,
          max_mailboxes INTEGER NOT NULL DEFAULT 50,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS mailboxes (
          id TEXT PRIMARY KEY,
          domain_id TEXT NOT NULL,
          address TEXT NOT NULL UNIQUE,
          username TEXT NOT NULL,
          domain_name TEXT NOT NULL,
          display_name TEXT NOT NULL,
          quota_mb INTEGER NOT NULL DEFAULT 5000,
          used_mb INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          mailbox_id TEXT NOT NULL,
          mailbox_address TEXT NOT NULL,
          from_address TEXT NOT NULL,
          to_address TEXT NOT NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          folder TEXT NOT NULL DEFAULT 'inbox',
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          is_starred BOOLEAN NOT NULL DEFAULT FALSE,
          date TIMESTAMP DEFAULT NOW(),
          has_attachments BOOLEAN NOT NULL DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS integrations (
          id TEXT PRIMARY KEY DEFAULT 'global_settings',
          cloudflare_api_token TEXT,
          cloudflare_zone_id TEXT,
          cpanel_host TEXT,
          cpanel_username TEXT,
          cpanel_api_token TEXT,
          resend_api_key TEXT,
          bimi_logo_url TEXT,
          bimi_svg_content TEXT,
          admin_password TEXT,
          is_2fa_enabled BOOLEAN DEFAULT TRUE
        );
        ALTER TABLE integrations ADD COLUMN IF NOT EXISTS admin_password TEXT;
        ALTER TABLE integrations ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT TRUE;
      `);
      console.log('PostgreSQL tables verified and created successfully.');
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('PostgreSQL table initialization notice:', err.message);
    return false;
  }
}
