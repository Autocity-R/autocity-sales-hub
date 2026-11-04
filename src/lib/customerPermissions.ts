import type { UserRole } from "@/types/auth";

/** UI affordances only; contacts RLS remains the authority for every write. */
export function canEditContact(role: UserRole | null, type: string) {
  if (role === "operationeel_directeur" || role === "aftersales_manager") return type === "b2b" || type === "b2c";
  return role !== "administratie";
}