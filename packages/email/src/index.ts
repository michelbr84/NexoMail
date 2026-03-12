// Types & interface
export * from "./types";
export * from "./driver";

// Drivers
export { GmailDriver } from "./drivers/gmail";
export type { GmailConnectionData } from "./drivers/gmail";

export { OutlookDriver } from "./drivers/outlook";
export type { OutlookConnectionData } from "./drivers/outlook";

export { ImapDriver } from "./drivers/imap";
export type { ImapConnectionData } from "./drivers/imap";

// Utilities
export { encrypt, decrypt } from "./utils/crypto";
export {
  parseEmailAddress,
  parseAddressList,
  htmlToText,
  extractSnippet,
  parseDate,
  decodeBase64Url,
  decodeBase64UrlBuffer,
} from "./utils/parse";
