"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSession } from "@/hooks/use-session";
import { LoadingState } from "@/components/ui/feedback";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: user, isLoading, isFetched } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Respaldo: src/proxy.ts ya redirige sin cookie, esto cubre cookie presente pero inválida.
    if (isFetched && user === null) {
      router.replace("/login");
    }
  }, [isFetched, user, router]);

  if (isLoading || !user) {
    return <LoadingState label="Cargando sesión…" />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}