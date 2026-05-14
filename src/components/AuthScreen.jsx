import React, { useState } from "react";

export function AuthScreen({
  authMode,
  authBusy,
  authForm,
  error,
  googleClientId,
  hasTelegramInitData,
  onAuthModeChange,
  onFieldChange,
  onSubmit,
  telegramLinkCode,
  onTelegramLinkCodeChange,
  onTelegramLogin,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const ctaLabel = authMode === "register" ? "Create account" : "Log in";

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <div className="auth-layout">
          <div className="auth-hero">
            <p className="eyebrow">INVESTMENT PLATFORM</p>
            <h1>One account across every session.</h1>
          </div>

          <div className="auth-copy">
            <p>Sign in with Google or email, then keep the same portfolio workspace in browser and Telegram.</p>
            <div className="auth-summary-list">
              <article className="auth-feature auth-feature-primary">
                <div className="auth-feature-mark">01</div>
                <div>
                  <strong>Fast browser entry</strong>
                  <span>Start with Google in one tap when you want the shortest path.</span>
                </div>
              </article>
              <article className="auth-feature">
                <div className="auth-feature-mark">02</div>
                <div>
                  <strong>Stable fallback</strong>
                  <span>Use email and password when you want a dependable browser login.</span>
                </div>
              </article>
              <article className="auth-feature">
                <div className="auth-feature-mark">03</div>
                <div>
                  <strong>Shared account</strong>
                  <span>Link Telegram later and keep the same data across browser and Mini App.</span>
                </div>
              </article>
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
                    <h2>{telegramLinkCode.trim() ? "Link Telegram to browser account" : "Continue with Telegram"}</h2>
                    <span>{telegramLinkCode.trim() ? "Enter the connect code created in browser settings, then finish the Telegram handshake." : "Telegram Mini App data was detected for this session."}</span>
                  </div>
                  <label className="auth-field">
                    <span>Connect code</span>
                    <input maxLength="8" placeholder="Optional 8-character code" value={telegramLinkCode} onChange={(e) => onTelegramLinkCodeChange(e.target.value.toUpperCase())} />
                  </label>
                  <button className="ghost auth-telegram" disabled={authBusy} onClick={onTelegramLogin} type="button">
                    {telegramLinkCode.trim() ? "Link and continue" : "Continue with Telegram"}
                  </button>
                  <p className="auth-footnote">Use the code only when you want this Telegram identity linked to an existing browser account.</p>
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
