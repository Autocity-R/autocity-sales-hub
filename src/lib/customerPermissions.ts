/** UI affordances only; contacts RLS remains the authority for every write. */
export function canEditContact(role: string | null, type: string) {
  if (role === "operationeel_directeur" || role === "aftersales_manager") return type === "b2b" || type === "b2c";
  return role !== null && role !== "administratie";
}