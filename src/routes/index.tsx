import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getToken } from "@/lib/api";

export const Route = createFileRoute("/")({
  ssr: false,
  component: () => {
    const t = typeof window !== "undefined" ? getToken() : null;
    return <Navigate to={t ? "/dashboard" : "/login"} replace />;
  },
});
