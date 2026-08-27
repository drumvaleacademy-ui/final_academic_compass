export function normalizeAdmissionNo(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function deduplicateStudents<T extends { admissionNo?: unknown }>(students: T[]): T[] {
  const seen = new Set<string>();
  return students.filter((student) => {
    const admissionNo = normalizeAdmissionNo(student.admissionNo);
    if (!admissionNo || seen.has(admissionNo)) return false;
    seen.add(admissionNo);
    return true;
  });
}