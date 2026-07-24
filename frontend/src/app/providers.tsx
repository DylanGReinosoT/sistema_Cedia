"use client";

import { useState } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
import { SESSION_QUERY_KEY } from "@/hooks/use-session";

/**
 * Sesión expirada (401) en CUALQUIER query o mutation de la app: en vez de dejar cada
 * pantalla mostrando su propio mensaje de error genérico, se limpia todo el caché y se
 * manda a /login. Esto es lo único que se maneja de forma global — un 403 (permiso
 * denegado, sesión válida) se queda como error inline en la pantalla, tal como está
 * diseñado en cada página.
 */
function handleGlobalError(error: unknown, queryClient: QueryClient) {
  if (error instanceof ApiError && error.isUnauthorized) {
    // Evita loops: si ya estamos en /login o /register no hace falta redirigir de nuevo.
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register")
    ) {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.clear();
      window.location.href = "/login";
    }
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({
        onError: (error) => handleGlobalError(error, client),
      }),
      mutationCache: new MutationCache({
        onError: (error) => handleGlobalError(error, client),
      }),
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
          retry: (failureCount, error) => {
            if (error instanceof ApiError && error.status < 500) return false;
            return failureCount < 2;
          },
        },
        mutations: {
          retry: false,
        },
      },
    });
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}