const UNIVERSITY_DOMAINS = new Set(["siddhartha.edu.in", "vrsiddhartha.edu.in"]);

export function normalizeUniversityEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return null;

  const domain = email.slice(email.lastIndexOf("@") + 1);
  return UNIVERSITY_DOMAINS.has(domain) ? email : null;
}
