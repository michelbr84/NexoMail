import { parse as parseHtml } from "node-html-parser";

/**
 * Parse an RFC 5322 address string like "John Doe <john@example.com>"
 * or a bare "john@example.com" into a structured object.
 */
export function parseEmailAddress(raw: string): { name?: string; email: string } {
  if (!raw) return { email: "" };

  const angleMatch = raw.match(/^(.+?)\s*<([^>]+)>\s*$/);
  if (angleMatch) {
    const name = angleMatch[1]!.trim().replace(/^["']|["']$/g, "");
    const email = angleMatch[2]!.trim().toLowerCase();
    return name ? { name, email } : { email };
  }

  // bare address
  const email = raw.trim().toLowerCase();
  return { email };
}

/**
 * Parse a comma-separated list of RFC 5322 addresses.
 * Handles quoted display names that may contain commas.
 */
export function parseAddressList(raw: string): Array<{ name?: string; email: string }> {
  if (!raw) return [];

  // Split on commas that are NOT inside angle brackets or quotes
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let start = 0;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (!inQuote) {
      if (ch === "<") depth++;
      else if (ch === ">") depth--;
      else if (ch === "," && depth === 0) {
        parts.push(raw.slice(start, i).trim());
        start = i + 1;
      }
    }
  }
  parts.push(raw.slice(start).trim());

  return parts.filter(Boolean).map(parseEmailAddress);
}

/**
 * Convert an HTML string to plain text by stripping tags and decoding
 * common HTML entities. Preserves meaningful whitespace/newlines.
 */
export function htmlToText(html: string): string {
  if (!html) return "";

  try {
    const root = parseHtml(html);

    // Replace block elements with newlines before stripping
    const blockTags = new Set([
      "p", "div", "br", "li", "tr", "blockquote",
      "h1", "h2", "h3", "h4", "h5", "h6",
    ]);

    // Walk and build text
    function extractText(node: ReturnType<typeof parseHtml>): string {
      let text = "";
      for (const child of node.childNodes) {
        if (child.nodeType === 3 /* TEXT_NODE */) {
          text += child.rawText;
        } else if (child.nodeType === 1 /* ELEMENT_NODE */) {
          const tagName = (child as any).tagName?.toLowerCase() ?? "";
          if (tagName === "style" || tagName === "script") continue;
          if (blockTags.has(tagName)) {
            text += "\n" + extractText(child as any) + "\n";
          } else if (tagName === "a") {
            text += extractText(child as any);
          } else {
            text += extractText(child as any);
          }
        }
      }
      return text;
    }

    let text = extractText(root);

    // Decode common HTML entities
    text = text
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      );

    // Normalise whitespace: collapse multiple blank lines, trim each line
    text = text
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return text;
  } catch {
    // Fallback: naive tag stripping
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&nbsp;/gi, " ")
      .trim();
  }
}

/**
 * Extract a plain-text snippet from a body string (HTML or plain text).
 * Strips HTML tags first, then truncates.
 */
export function extractSnippet(body: string, maxLength = 200): string {
  if (!body) return "";
  const text = body.includes("<") ? htmlToText(body) : body;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Parse an RFC 2822 / ISO date string into a Date object.
 * Returns null if the string is empty or unparseable.
 */
export function parseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Decode a base64url-encoded string to a UTF-8 string.
 * Gmail uses base64url (with - and _ instead of + and /).
 */
export function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Decode a base64url-encoded string to a Buffer (for binary payloads).
 */
export function decodeBase64UrlBuffer(encoded: string): Buffer {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}
