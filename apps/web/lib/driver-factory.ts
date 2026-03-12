import { GmailDriver, OutlookDriver, ImapDriver } from "@nexomail/email";
import { decrypt } from "@nexomail/email";
import type { EmailDriver } from "@nexomail/email";
import type { EmailProvider } from "@nexomail/db";

// Connection type from DB
export interface ConnectionRow {
  id: string;
  provider: EmailProvider;
  email: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  imapHost: string | null;
  imapPort: string | null;
  smtpHost: string | null;
  smtpPort: string | null;
  imapPassword: string | null;
}

export function createDriver(connection: ConnectionRow): EmailDriver {
  switch (connection.provider) {
    case "gmail":
      return new GmailDriver({
        accessToken: decrypt(connection.accessToken!),
        refreshToken: decrypt(connection.refreshToken!),
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      });
    case "outlook":
      return new OutlookDriver({
        accessToken: decrypt(connection.accessToken!),
        refreshToken: decrypt(connection.refreshToken!),
        clientId: process.env.AZURE_CLIENT_ID!,
        clientSecret: process.env.AZURE_CLIENT_SECRET!,
        tenantId: process.env.AZURE_TENANT_ID,
      });
    case "imap":
      return new ImapDriver({
        email: connection.email,
        password: decrypt(connection.imapPassword!),
        imapHost: connection.imapHost!,
        imapPort: parseInt(connection.imapPort ?? "993"),
        smtpHost: connection.smtpHost!,
        smtpPort: parseInt(connection.smtpPort ?? "587"),
        tls: true,
      });
    default:
      throw new Error(`Unknown provider: ${connection.provider}`);
  }
}
