// Super-Admin E-Mails - kann client-seitig verwendet werden
const SUPER_ADMIN_EMAILS = ["michi.mauch@netnode.ch"];

export function isSuperAdmin(email: string | null | undefined): boolean {
  return email ? SUPER_ADMIN_EMAILS.includes(email) : false;
}
