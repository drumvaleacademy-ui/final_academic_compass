import { api } from "./api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface SchoolDataSnapshot {
  students: any[];
  teachers: any[];
  classes: any[];
  streams: any[];
  subjects: any[];
  exams: any[];
  sheets: any[];
  curricula: any[];
  entries: any[];
  timetable: any[];
  settings: any;
}

export async function fetchSchoolData(): Promise<SchoolDataSnapshot | null> {
  const result = await api.get<{ data: SchoolDataSnapshot | null }>("/v2/school-data");
  return result.data;
}

export const schoolDataQueryKey = ["school-data"] as const;

export function useSchoolDataQuery(enabled = true) {
  return useQuery({
    queryKey: schoolDataQueryKey,
    queryFn: fetchSchoolData,
    enabled: enabled && typeof window !== "undefined" && !!localStorage.getItem("ac_token"),
    staleTime: 30_000,
  });
}

export function useInvalidateSchoolData() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: schoolDataQueryKey });
}