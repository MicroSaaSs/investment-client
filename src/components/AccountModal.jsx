import React, {useEffect} from "react";
import {ModalSheet} from "./ModalSheet";

function formatExpiry(value) {
  if (!value) return "";
  return new Date(value * 1000).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
}

export function AccountModal({
  authBusy,
  currentUser,
  emailLinkForm,
  googleClientId,
  hasTelegramInitData,
  linkSession,
  onClose,
  onCreateLinkCode,
  onGoogleCredential,
  onLinkEmail,
  onLinkTelegram,
  onEmailLinkFieldChange,
  onTelegramLinkCodeChange,
  telegramLinkCode,
}) {
  const googleLinked = currentUser?.googleLinked ?? currentUser?.authProvider === "GOOGLE";
  const emailLinked = currentUser?.emailLinked ?? Boolean(currentUser?.email && currentUser?.hasPassword);
  const linkedLabel = currentUser?.telegramLinked
    ? `Linked as @${currentUser.telegramUsername || "telegram-user"}`
    : "Not linked yet";

  useEffect(() => {
    if (!googleClientId || googleLinked) return;
    let cancelled = false;

    async function renderGoogleButton() {
      for (let i = 0; i < 40; i += 1) {
        if (window.google?.accounts?.id) break;
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      if (cancelled || !window.google?.accounts?.id) return;
      const button = document.getElementById("account-google-link-button");
      if (!button) return;
      button.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          await onGoogleCredential(response.credential);
        }
      });
      window.google.accounts.id.renderButton(button, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 280
      });
    }

    renderGoogleButton();
    return () => { cancelled = true; };
  }, [googleClientId, googleLinked, onGoogleCredential]);

  return (
    <ModalSheet onClose={onClose} subtitle="Manage how this account works across browser and Telegram." title="Account">
      <div className="account-stack">
        <section className="account-panel">
          <p className="eyebrow">PROFILE</p>
          <h4>{[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") || currentUser?.email || "Investment user"}</h4>
          <div className="account-grid">
            <div><span>Email</span><strong>{currentUser?.email || "Not set"}</strong></div>
            <div><span>Primary auth</span><strong>{currentUser?.authProvider || "Unknown"}</strong></div>
            <div><span>Email login</span><strong>{emailLinked ? "Linked" : "Not linked"}</strong></div>
            <div><span>Google</span><strong>{googleLinked ? "Linked" : "Not linked"}</strong></div>
            <div><span>Telegram</span><strong>{linkedLabel}</strong></div>
          </div>
        </section>

        <section className="account-panel">
          <p className="eyebrow">LINK EMAIL</p>
          <h4>{emailLinked ? "Update email login" : "Add email login"}</h4>
          <p className="account-copy">Use this to attach email and password to the same account. If that email already belongs to another account, we verify the password and combine both accounts into one workspace.</p>
          <div className="account-merge-box">
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={emailLinkForm.email}
                onChange={(e) => onEmailLinkFieldChange("email", e.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                placeholder={emailLinked ? "Set or replace password" : "Create or confirm password"}
                value={emailLinkForm.password}
                onChange={(e) => onEmailLinkFieldChange("password", e.target.value)}
              />
            </label>
            <button className="primary" disabled={authBusy || !emailLinkForm.email.trim() || !emailLinkForm.password.trim()} onClick={onLinkEmail} type="button">
              {authBusy ? "Saving..." : emailLinked ? "Save email login" : "Link email login"}
            </button>
          </div>
        </section>

        <section className="account-panel">
          <p className="eyebrow">LINK GOOGLE</p>
          <h4>{googleLinked ? "Google already linked" : "Add Google sign-in"}</h4>
          <p className="account-copy">Connect Google to this same user. If that Google identity already belongs to another account, both accounts will be combined into one workspace.</p>
          {googleLinked ? (
            <div className="link-code-card">
              <span>Google</span>
              <strong>Linked</strong>
            </div>
          ) : (
            <div className="google-signin-wrap">
              <div id="account-google-link-button"></div>
            </div>
          )}
        </section>

        <section className="account-panel">
          <p className="eyebrow">LINK TELEGRAM</p>
          <h4>Combine browser and Telegram into one workspace</h4>
          <p className="account-copy">Linking combines both accounts into one user and merges portfolios, positions, transactions, and the rest of the saved workspace.</p>

          {hasTelegramInitData ? (
            <div className="account-merge-box">
              <label className="auth-field">
                <span>Connect code from browser</span>
                <input
                  maxLength="8"
                  placeholder="Paste 8-character code"
                  value={telegramLinkCode}
                  onChange={(e) => onTelegramLinkCodeChange(e.target.value.toUpperCase())}
                />
              </label>
              <button className="primary" disabled={authBusy || !telegramLinkCode.trim()} onClick={onLinkTelegram} type="button">
                {authBusy ? "Merging..." : "Merge with browser account"}
              </button>
              <p className="auth-footnote">Open Account settings in the browser version first, generate a connect code there, then enter it here.</p>
            </div>
          ) : (
            <>
              <ol className="account-steps">
                <li>Generate a short connect code here.</li>
                <li>Open the Telegram Mini App.</li>
                <li>Open Account settings there and enter the code.</li>
              </ol>

              {linkSession ? (
                <div className="link-code-card">
                  <span>Connect code</span>
                  <strong>{linkSession.code}</strong>
                  <small>Expires at {formatExpiry(linkSession.expiresAtEpochSeconds)}</small>
                </div>
              ) : null}

              <button className="primary" onClick={onCreateLinkCode} type="button">
                {linkSession ? "Generate new code" : "Generate connect code"}
              </button>
            </>
          )}
        </section>
      </div>
    </ModalSheet>
  );
}
