import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Film, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(80),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { mode?: "login" | "register"; redirect?: string } => ({
    ...(search["mode"] === "register" ? { mode: "register" as const } : { mode: "login" as const }),
    ...(typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Cineverse" },
      { name: "description", content: "Log in or create a Cineverse account to book movie tickets." },
      { property: "og:title", content: "Sign in — Cineverse" },
      { property: "og:description", content: "Log in or create an account to book movie tickets." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isRegister, setIsRegister] = useState(mode === "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  useEffect(() => setIsRegister(mode === "register"), [mode]);

  useEffect(() => {
    if (user) navigate({ to: redirect ?? "/", replace: true });
  }, [user, redirect, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const schema = isRegister ? registerSchema : loginSchema;
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmSent(true);
          toast.success("Account created — check your email to confirm it.");
        } else {
          toast.success("Welcome to Cineverse!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Film className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-4xl">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isRegister
            ? "Register to book seats and keep your ticket history."
            : "Log in to continue booking your seats."}
        </p>
      </div>

      {confirmSent ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="font-display text-2xl">Confirm your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Click it
            to activate your account, then come back and log in.
          </p>
          <Button variant="secondary" className="mt-5" onClick={() => setConfirmSent(false)}>
            Back to login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Riya Sharma"
              />
              {errors['name'] && <p className="text-xs text-destructive">{errors['name']}</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              placeholder="you@example.com"
            />
            {errors['email'] && <p className="text-xs text-destructive">{errors['email']}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={72}
              placeholder="At least 6 characters"
            />
            {errors['password'] && <p className="text-xs text-destructive">{errors['password']}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {isRegister ? "Create account" : "Log in"}
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="secondary" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            {isRegister ? "Already have an account?" : "New to Cineverse?"}{" "}
            <Link
              to="/auth"
              search={{ mode: isRegister ? "login" : "register", redirect }}
              className="font-medium text-primary hover:underline"
            >
              {isRegister ? "Log in" : "Register"}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
