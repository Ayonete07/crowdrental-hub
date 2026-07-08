import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) || "" }),
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useSearch();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenInput, setTokenInput] = useState(token);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      const t = tokenInput || token;
      await api("/admin/auth/reset-password", {
        method: "POST",
        auth: false,
        body: { password, confirm_password: confirm, token: t || undefined },
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      toast.success("Password updated. You can sign in now.");
      nav({ to: "/login", replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Use the token from your reset email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {!token && (
              <div className="space-y-2">
                <Label htmlFor="token">Reset token</Label>
                <Input id="token" required value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-xs text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
