export function isCompanyOwner(
  company: { submitted_by: string | null; claimed_by: string | null },
  userId: string
): boolean {
  if (company.claimed_by) return company.claimed_by === userId;
  return company.submitted_by === userId;
}

export function canEditDirectly(
  company: { claimed_by: string | null },
  userId: string
): boolean {
  return company.claimed_by === userId;
}
