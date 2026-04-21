/**
 * Email Validation + Auto-Cleansing
 * 
 * Validates email addresses and flags/deletes junk contacts.
 * Called before sending outbound email via MCP tools.
 */

// Known disposable/temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "dispostable.com", "10minutemail.com", "trashmail.com", "fakeinbox.com",
  "maildrop.cc", "harakirimail.com", "temp-mail.org", "mohmal.com",
]);

// Obvious fake patterns
const FAKE_PATTERNS = [
  /^test@/i,
  /^fake@/i,
  /^asdf/i,
  /^aaa+@/i,
  /^xxx+@/i,
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^admin@example/i,
  /^user@example/i,
];

export interface EmailValidation {
  valid: boolean;
  reason?: string;
  action?: "keep" | "flag" | "delete";
}

/**
 * Validate an email address — syntax, domain, and pattern checks.
 */
export function validateEmail(email: string | null | undefined): EmailValidation {
  if (!email || !email.trim()) {
    return { valid: false, reason: "No email provided", action: "flag" };
  }

  const cleaned = email.trim().toLowerCase();

  // Basic syntax check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return { valid: false, reason: "Invalid email format", action: "flag" };
  }

  // Extract domain
  const domain = cleaned.split("@")[1];

  // Check disposable domains
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: `Disposable email domain: ${domain}`, action: "delete" };
  }

  // Check fake patterns
  for (const pattern of FAKE_PATTERNS) {
    if (pattern.test(cleaned)) {
      return { valid: false, reason: `Matches fake email pattern`, action: "delete" };
    }
  }

  // Check for obviously incomplete domains
  if (domain.length < 4 || !domain.includes(".")) {
    return { valid: false, reason: "Invalid domain", action: "flag" };
  }

  return { valid: true, action: "keep" };
}

/**
 * Check a batch of contacts and return those that should be auto-deleted.
 */
export function findJunkContacts(
  contacts: { id: string; email: string | null; first_name: string; last_name: string }[]
): { id: string; email: string | null; name: string; reason: string }[] {
  const junk: { id: string; email: string | null; name: string; reason: string }[] = [];

  for (const c of contacts) {
    const validation = validateEmail(c.email);
    if (validation.action === "delete") {
      junk.push({
        id: c.id,
        email: c.email,
        name: `${c.first_name} ${c.last_name}`.trim(),
        reason: validation.reason ?? "Failed validation",
      });
    }

    // Also check for obvious junk names
    const name = `${c.first_name} ${c.last_name}`.trim().toLowerCase();
    if (name.length <= 1 || name === "test" || name === "asdf" || /^[a-z]{1}$/.test(name)) {
      junk.push({
        id: c.id,
        email: c.email,
        name: `${c.first_name} ${c.last_name}`.trim(),
        reason: "Junk name",
      });
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return junk.filter(j => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);
    return true;
  });
}
