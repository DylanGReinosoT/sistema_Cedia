"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchSession, logout as logoutRequest } from "@/lib/auth/client";
import { hasRole, type RoleCode } from "@/lib/auth/roles";

export const SESSION_QUERY_KEY = ["session"] as const;

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useHasRole(allowed: RoleCode[]) {
  const { data: user } = useSession();
  return hasRole(user?.roles, allowed);
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    await logoutRequest();
    queryClient.setQueryData(SESSION_QUERY_KEY, null);
    queryClient.clear();
    router.push("/login");
  };
}