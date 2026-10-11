"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Orbit, Sparkles } from "lucide-react";
import { Badge, Button, Field, InlineError } from "@/components/ui";
import { createInitialState } from "@/data/initial-state";
import { ApiError } from "@/lib/api/client";
import { workspaceApi } from "@/lib/api/workspace";
import { useWorkspace, workspaceForUser } from "@/lib/store";
import "./management.css";

export function AuthScreen() {
  const { setState, setAuthMode, authMode, notify, navigate, loginEmail, rememberAccount } = useWorkspace();
  const registering = authMode === "register";
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loginEmail) setEmail(loginEmail);
  }, [loginEmail]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const cleanEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail) || cleanEmail.length > 254) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password || password.length > 1024 || (registering && password.length < 12)) {
      setError(registering ? "Use a password of at least 12 characters." : "Enter your password to continue.");
      return;
    }
    if (registering && (!name.trim() || !accessKey.trim())) {
      setError("Enter your name and activation key.");
      return;
    }
    if (registering && !/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) {
      setError("Use a username of 3–30 letters, numbers, periods, hyphens, or underscores.");
      return;
    }
    setSubmitting(true);
    try {
      const result = registering
        ? await workspaceApi.register(name.trim(), username.trim(), cleanEmail, password, accessKey.trim().toUpperCase())
        : await workspaceApi.login(cleanEmail, password, remember);
      const snapshot = await workspaceApi.getWorkspace();
      const next = workspaceForUser(snapshot || createInitialState(), result.user);
      setState(next);
      rememberAccount(cleanEmail);
      setPassword("");
      setAccessKey("");
      setAuthMode(null);
      // Preserve an existing board, settings, or task deep link after sign-in.
      if (/\/taskboard\/(login|register|setup)\/?$/.test(window.location.pathname)) navigate("home");
      notify(registering ? `Welcome, ${result.user.name}` : `Welcome back, ${result.user.name}`);
    } catch (failure) {
      await workspaceApi.logout().catch(() => undefined);
      setError(
        failure instanceof ApiError
          ? failure.message
          : "Authentication failed. Check the backend connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-story" aria-label="About Enigma Taskboard">
        <div className="auth-brand">
          <span className="auth-brand-mark">
            <Orbit size={27} />
          </span>
          ENIGMA<span>TASKBOARD</span>
        </div>
        <div className="auth-story-content">
          <Badge color="#c4b5fd">
            <Sparkles size={12} /> A little order. A lot of possibility.
          </Badge>
          <h1>
            Great things
            <br />
            start with
            <br />
            <em>a clear space.</em>
          </h1>
          <p>Bring your ideas, your team, and your next big release into focus.</p>
        </div>
        <footer className="auth-story-footer">
          <span>Built for the way your team thinks.</span>
          <span>© 2026 Enigma</span>
        </footer>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-form-icon">
            <LockKeyhole size={25} />
          </div>
          <span className="management-eyebrow">YOUR NEXT CHAPTER</span>
          <h2>{registering ? "Join the workspace." : "Welcome back."}</h2>
          <p className="auth-intro">
            {registering ? "Create your account with an activation key from an administrator." : "Sign in to your Enigma Taskboard account."}
          </p>
          <form onSubmit={submit} className="management-form auth-form">
            {registering && (
              <Field label="Name">
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                  autoFocus
                  maxLength={80}
                />
              </Field>
            )}
            {registering && (
              <Field label="Username" hint="This is your public @mention name.">
                <input
                  type="text"
                  autoComplete="nickname"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Your username"
                  required
                  minLength={3}
                  maxLength={30}
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={registering ? "you@enigma.com" : "you@example.com"}
                pattern={registering ? "[^@\\s]+@enigma\\.com" : undefined}
                title={registering ? "Use an @enigma.com email address" : undefined}
                required
                autoFocus={!registering}
                maxLength={254}
              />
            </Field>
            <Field label="Password">
              <span className="password-field">
                <input
                  aria-label="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={registering ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  maxLength={1024}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </Field>
            {registering && (
              <Field label="Activation key">
                <input
                  type="text"
                  autoComplete="off"
                  value={accessKey}
                  onChange={(event) => setAccessKey(event.target.value)}
                  placeholder="ENIGMA-…"
                  required
                  maxLength={39}
                />
              </Field>
            )}
            {!registering && (
              <label className="management-checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Remember me on this device</span>
              </label>
            )}
            {error && <InlineError>{error}</InlineError>}
            <Button
              variant="primary"
              className="auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (registering ? "Creating account…" : "Signing in…") : (registering ? "Create account" : "Sign in")}
              <ArrowRight size={17} />
            </Button>
          </form>
          <p className="auth-switch">
            <a href="/">Enigma website</a><br />
            <button
              type="button"
              onClick={() => {
                setError("");
                setAuthMode(registering ? "login" : "register");
                window.history.replaceState(
                  {},
                  "",
                  registering ? "/taskboard/login" : "/taskboard/register",
                );
              }}
            >
              {registering ? "Already have an account? Sign in" : "Have an activation key? Register"}
            </button>
          </p>
        </div>
        <div className="auth-form-footer">
          <LockKeyhole size={12} /> Your focus belongs here.
        </div>
      </section>
    </main>
  );
}
