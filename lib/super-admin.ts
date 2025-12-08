// Fallback Super-Admin E-Mails (für client-seitige Checks und als Sicherheitsnetz)
const FALLBACK_SUPER_ADMIN_EMAILS = ["michi.mauch@netnode.ch"];

// Synchrone Version für Client-seitigen Check (Fallback auf E-Mail-Liste)
export function isSuperAdmin(email: string | null | undefined): boolean {
  return email ? FALLBACK_SUPER_ADMIN_EMAILS.includes(email) : false;
}

// Prüft ob ein User SuperAdmin ist basierend auf dem DB-Feld
export function isSuperAdminFromDb(isSuperAdminField: boolean | null | undefined): boolean {
  return isSuperAdminField === true;
}
