import fs from 'fs';
import path from 'path';
import { Domain, Mailbox, EmailMessage, IntegrationSettings, TeamUser } from '../types';

interface FirebaseConfig {
  projectId: string;
  apiKey: string;
  databaseId: string;
}

const DEFAULT_DB_ID = 'ai-studio-mailcloudsaasbus-bea0a0d7-85d2-4e65-a3ea-588d40c8e5b9';

function getFirebaseConfig(): FirebaseConfig | null {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const rawData = fs.readFileSync(configPath, 'utf-8');
      const json = JSON.parse(rawData);
      if (json && json.projectId && json.apiKey) {
        return {
          projectId: json.projectId,
          apiKey: json.apiKey,
          databaseId: json.firestoreDatabaseId || DEFAULT_DB_ID
        };
      }
    }

    if (
      (process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID) &&
      (process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY)
    ) {
      return {
        projectId: (process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID)!,
        apiKey: (process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY)!,
        databaseId: process.env.FIREBASE_DATABASE_ID || DEFAULT_DB_ID
      };
    }

    // Default static fallback for Render & external container deployments
    return {
      projectId: 'watchful-balm-dtgzl',
      apiKey: 'AIzaSyCJD6t3ZjijLR-Nst5Z2cnCC3yaIkqlztc',
      databaseId: DEFAULT_DB_ID
    };
  } catch (err: any) {
    console.warn('Firebase config read notice:', err.message);
  }
  return null;
}

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      fields[key] = toFirestoreValue(val);
    }
  }
  return fields;
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    return { mapValue: { fields: toFirestoreFields(val) } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (!fields) return result;
  for (const [key, val] of Object.entries(fields)) {
    result[key] = fromFirestoreValue(val);
  }
  return result;
}

function fromFirestoreValue(field: any): any {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return parseFloat(field.doubleValue);
  if ('nullValue' in field) return null;
  if ('mapValue' in field) {
    return fromFirestoreFields(field.mapValue.fields || {});
  }
  if ('arrayValue' in field) {
    const values = field.arrayValue.values || [];
    return values.map(fromFirestoreValue);
  }
  return null;
}

// REST GET Helper
async function restGet(endpoint: string): Promise<any> {
  const cfg = getFirebaseConfig();
  if (!cfg) return null;

  const dbId = cfg.databaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${dbId}/documents/${endpoint}?key=${cfg.apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      const text = await res.text();
      console.warn(`Firestore GET warning (${res.status}):`, text.slice(0, 150));
      return null;
    }
    return await res.json();
  } catch (err: any) {
    console.warn('Firestore REST fetch network notice:', err.message);
    return null;
  }
}

// REST Commit (Atomic Upsert) Helper
async function restCommitUpsert(collectionName: string, documentId: string, dataObject: Record<string, any>): Promise<boolean> {
  const cfg = getFirebaseConfig();
  if (!cfg) return false;

  const dbId = cfg.databaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${dbId}/documents:commit?key=${cfg.apiKey}`;
  const docPath = `projects/${cfg.projectId}/databases/${dbId}/documents/${collectionName}/${documentId}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: docPath,
              fields: toFirestoreFields(dataObject)
            }
          }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Firestore commit upsert warning (${res.status}) on ${collectionName}/${documentId}:`, errText.slice(0, 150));
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`Firestore commit network error on ${collectionName}/${documentId}:`, err.message);
    return false;
  }
}

// REST Commit Delete Helper
async function restCommitDelete(collectionName: string, documentId: string): Promise<boolean> {
  const cfg = getFirebaseConfig();
  if (!cfg) return false;

  const dbId = cfg.databaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${dbId}/documents:commit?key=${cfg.apiKey}`;
  const docPath = `projects/${cfg.projectId}/databases/${dbId}/documents/${collectionName}/${documentId}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            delete: docPath
          }
        ]
      })
    });
    return res.ok;
  } catch (err: any) {
    return false;
  }
}

// --- DOMAINS ---
export async function getFirestoreDomains(): Promise<Domain[]> {
  try {
    const data = await restGet('system_data/all_domains');
    if (data && data.fields) {
      const parsed = fromFirestoreFields(data.fields);
      if (Array.isArray(parsed.list)) return parsed.list as Domain[];
    }

    const colData = await restGet('domains');
    if (!colData || !colData.documents) return [];
    return colData.documents.map((doc: any) => fromFirestoreFields(doc.fields) as Domain);
  } catch (err: any) {
    return [];
  }
}

export async function saveFirestoreDomain(domain: Domain): Promise<void> {
  if (!domain.id) return;
  await restCommitUpsert('domains', domain.id, domain);

  // Sync to all_domains aggregate document
  const current = await getFirestoreDomains();
  const idx = current.findIndex((d) => d.id === domain.id);
  if (idx >= 0) {
    current[idx] = domain;
  } else {
    current.push(domain);
  }
  await restCommitUpsert('system_data', 'all_domains', { list: current });
}

export async function deleteFirestoreDomain(id: string): Promise<void> {
  await restCommitDelete('domains', id);
  const current = await getFirestoreDomains();
  const filtered = current.filter((d) => d.id !== id);
  await restCommitUpsert('system_data', 'all_domains', { list: filtered });
}

// --- MAILBOXES ---
export async function getFirestoreMailboxes(): Promise<Mailbox[]> {
  try {
    const data = await restGet('system_data/all_mailboxes');
    if (data && data.fields) {
      const parsed = fromFirestoreFields(data.fields);
      if (Array.isArray(parsed.list)) return parsed.list as Mailbox[];
    }

    const colData = await restGet('mailboxes');
    if (!colData || !colData.documents) return [];
    return colData.documents.map((doc: any) => fromFirestoreFields(doc.fields) as Mailbox);
  } catch (err: any) {
    return [];
  }
}

export async function saveFirestoreMailbox(mailbox: Mailbox): Promise<void> {
  if (!mailbox.id) return;
  await restCommitUpsert('mailboxes', mailbox.id, mailbox);

  // Sync to all_mailboxes aggregate document
  const current = await getFirestoreMailboxes();
  const idx = current.findIndex((m) => m.id === mailbox.id);
  if (idx >= 0) {
    current[idx] = mailbox;
  } else {
    current.push(mailbox);
  }
  await restCommitUpsert('system_data', 'all_mailboxes', { list: current });
}

export async function deleteFirestoreMailbox(id: string): Promise<void> {
  await restCommitDelete('mailboxes', id);
  const current = await getFirestoreMailboxes();
  const filtered = current.filter((m) => m.id !== id);
  await restCommitUpsert('system_data', 'all_mailboxes', { list: filtered });
}

// --- MESSAGES ---
export async function getFirestoreMessages(): Promise<EmailMessage[]> {
  try {
    const data = await restGet('system_data/all_messages');
    if (data && data.fields) {
      const parsed = fromFirestoreFields(data.fields);
      if (Array.isArray(parsed.list)) return parsed.list as EmailMessage[];
    }

    const colData = await restGet('messages');
    if (!colData || !colData.documents) return [];
    const list = colData.documents.map((doc: any) => fromFirestoreFields(doc.fields) as EmailMessage);
    list.sort((a: EmailMessage, b: EmailMessage) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  } catch (err: any) {
    return [];
  }
}

export async function saveFirestoreMessage(message: EmailMessage): Promise<void> {
  if (!message.id) return;
  await restCommitUpsert('messages', message.id, message);

  // Sync top 100 messages to all_messages aggregate document
  const current = await getFirestoreMessages();
  const idx = current.findIndex((m) => m.id === message.id);
  if (idx >= 0) {
    current[idx] = message;
  } else {
    current.unshift(message);
  }
  const sliced = current.slice(0, 100);
  await restCommitUpsert('system_data', 'all_messages', { list: sliced });
}

// --- INTEGRATION SETTINGS ---
export async function getFirestoreIntegrations(): Promise<IntegrationSettings | null> {
  try {
    const data = await restGet('integrations/global_settings');
    if (!data || !data.fields) return null;
    return fromFirestoreFields(data.fields) as IntegrationSettings;
  } catch (err: any) {
    return null;
  }
}

export async function saveFirestoreIntegrations(settings: IntegrationSettings): Promise<void> {
  await restCommitUpsert('integrations', 'global_settings', settings);
}

// --- TEAM USERS ---
export async function getFirestoreTeamUsers(): Promise<TeamUser[]> {
  try {
    const data = await restGet('system_data/all_team_users');
    if (data && data.fields) {
      const parsed = fromFirestoreFields(data.fields);
      if (Array.isArray(parsed.list)) return parsed.list as TeamUser[];
    }

    const colData = await restGet('team_users');
    if (!colData || !colData.documents) return [];
    return colData.documents.map((doc: any) => fromFirestoreFields(doc.fields) as TeamUser);
  } catch (err: any) {
    return [];
  }
}

export async function saveFirestoreTeamUser(user: TeamUser): Promise<void> {
  if (!user.id) return;
  await restCommitUpsert('team_users', user.id, user);

  // Sync to all_team_users aggregate document
  const current = await getFirestoreTeamUsers();
  const idx = current.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    current[idx] = user;
  } else {
    current.push(user);
  }
  await restCommitUpsert('system_data', 'all_team_users', { list: current });
}

export async function deleteFirestoreTeamUser(id: string): Promise<void> {
  await restCommitDelete('team_users', id);
  const current = await getFirestoreTeamUsers();
  const filtered = current.filter((u) => u.id !== id);
  await restCommitUpsert('system_data', 'all_team_users', { list: filtered });
}
