import React, { useState } from "react";

export function AuthScreen({
  authMode,
  authBusy,
  authForm,
  error,
  googleClientId,
  hasTelegramInitData,
  telegramMode,
  onAuthModeChange,
  onFieldChange,
  onSubmit,
  telegramLinkCode,
  onTelegramLinkCodeChange,
  onTelegramLogin,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const ctaLabel = authMode === "register" ? "Create account" : "Log in";

  if (telegramMode) {
    return (
      <div className="auth-shell auth-shell-telegram">
        <section className="auth-card auth-card-telegram">
          <div className="auth-telegram-direct">
            <p className="eyebrow">TELEGRAM MINI APP</p>
            <h1>Continue with Telegram</h1>
            <p>We detected your Telegram Mini App session and will sign you in directly.</p>
            <button className="primary auth-submit" disabled={authBusy} onClick={onTelegramLogin} type="button">
              {authBusy ? "Signing you in..." : "Continue with Telegram"}
            </button>
            <p className="auth-footnote">Need to combine this Telegram account with a browser account later? Open Account settings after sign-in and enter a connect code from the browser.</p>
            {error ? <div className="error">{error}</div> : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-layout">
          <div className="auth-hero">
            <p className="eyebrow">INVESTMENT PLATFORM</p>
            <h1>One account across every session.</h1>
          </div>

          <div className="auth-copy">
            <p>Use Google for the fast path, or sign in with email to keep your portfolios, transactions, and analytics in one place.</p>
            <div className="auth-badges">
              <span>MINI APP READY</span>
              <span>LIVE API SYNC</span>
              <span>MOBILE FIRST</span>
            </div>
            <div className="auth-note-card">
              <strong>One workspace across browser and Telegram</strong>
              <span>Link or merge accounts later in Account settings whenever you want both entry points on the same data.</span>
            </div>
          </div>

          <div className="auth-panel">
            {googleClientId ? (
              <div className="auth-google-primary">
                <div className="auth-google-heading">
                  <p className="eyebrow">FASTEST PATH</p>
                  <h2>Continue with Google</h2>
                  <span>Best for quick browser sign-in and registration.</span>
                </div>
                <div className="google-signin-wrap">
                  <div id="google-signin-button"></div>
                </div>
              </div>
            ) : null}

            <div className="auth-divider"><span>OR USE EMAIL</span></div>

            <div className="auth-email-section">
              <div className="auth-email-heading">
                <div>
                  <p className="eyebrow">EMAIL ACCESS</p>
                  <h2>{authMode === "register" ? "Create your account" : "Log in with email"}</h2>
                </div>
                <div className="auth-switch">
                  <button className={authMode === "login" ? "active" : ""} onClick={() => onAuthModeChange("login")} type="button">Log in</button>
                  <button className={authMode === "register" ? "active" : ""} onClick={() => onAuthModeChange("register")} type="button">Register</button>
                </div>
              </div>

              <form className="auth-form" onSubmit={onSubmit}>
                {authMode === "register" ? (
                  <div className="auth-grid">
                    <label className="auth-field">
                      <span>First name</span>
                      <input placeholder="Maks" value={authForm.firstName} onChange={(e) => onFieldChange("firstName", e.target.value)} />
                    </label>
                    <label className="auth-field">
                      <span>Last name</span>
                      <input placeholder="Ivanov" value={authForm.lastName} onChange={(e) => onFieldChange("lastName", e.target.value)} />
                    </label>
                  </div>
                ) : null}

                <label className="auth-field">
                  <span>Email</span>
                  <input type="email" placeholder="you@example.com" value={authForm.email} onChange={(e) => onFieldChange("email", e.target.value)} required />
                </label>

                <label className="auth-field">
                  <span>Password</span>
                  <div className="auth-password-wrap">
                    <input type={showPassword ? "text" : "password"} placeholder={authMode === "register" ? "Create a password" : "Enter your password"} value={authForm.password} onChange={(e) => onFieldChange("password", e.target.value)} required />
                    <button className="password-toggle" onClick={() => setShowPassword((current) => !current)} type="button">
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <button className="primary auth-submit" disabled={authBusy} type="submit">
                  {authBusy ? "Please wait..." : ctaLabel}
                </button>
              </form>
            </div>

            {!googleClientId ? (
              <div className="error">Set `VITE_GOOGLE_CLIENT_ID` to enable browser Google login.</div>
            ) : null}
            {hasTelegramInitData ? (
              <div className="auth-dev-row">
                <div className="auth-telegram-panel">
                  <div className="auth-google-heading">
                    <p className="eyebrow">TELEGRAM MINI APP</p>
                    <h2>Open in Telegram for direct sign-in</h2>
                    <span>Inside the Mini App, Telegram users sign in automatically. Use Account settings later if you want to merge that identity with a browser account.</span>
                  </div>
                </div>
              </div>
            ) : null}
            {error ? <div className="error">{error}</div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
