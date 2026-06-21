import React, {useEffect, useState} from "react";
import {ModalSheet} from "./ModalSheet";
import {api} from "../services/api";

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
  onFamilyAccessChanged,
  onGoogleCredential,
  onLinkEmail,
  onLinkTelegram,
  onEmailLinkFieldChange,
  onTelegramLinkCodeChange,
  portfolios = [],
  telegramLinkCode,
}) {
  const [familyShares, setFamilyShares] = useState([]);
  const [familyShareForm, setFamilyShareForm] = useState({email: "", accessLevel: "READ", canManageSharing: false, portfolioIds: []});
  const [familyShareBusy, setFamilyShareBusy] = useState(false);
  const [familyShareError, setFamilyShareError] = useState("");
  const [copiedShareId, setCopiedShareId] = useState("");
  const [auditEvents, setAuditEvents] = useState([]);
  const [managedOwnerId, setManagedOwnerId] = useState(currentUser?.userId || "");
  const ownedPortfolios = portfolios.filter((portfolio) => portfolio.userId === managedOwnerId);
  const googleLinked = currentUser?.googleLinked ?? currentUser?.authProvider === "GOOGLE";
  const emailLinked = currentUser?.emailLinked ?? Boolean(currentUser?.email && currentUser?.hasPassword);
  const linkedLabel = currentUser?.telegramLinked
    ? `Linked as @${currentUser.telegramUsername || "telegram-user"}`
    : "Not linked yet";
  const managedAccounts = React.useMemo(() => {
    const byId = new Map();
    if (currentUser?.userId) {
      byId.set(currentUser.userId, {id: currentUser.userId, label: "My account"});
    }
    portfolios
      .filter((portfolio) => portfolio.shared && portfolio.canManageSharing && portfolio.userId)
      .forEach((portfolio) => {
        byId.set(portfolio.userId, {
          id: portfolio.userId,
          label: portfolio.ownerEmail ? `Shared account: ${portfolio.ownerEmail}` : `Shared account: ${portfolio.userId}`,
        });
      });
    return [...byId.values()];
  }, [currentUser?.userId, portfolios]);

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

  useEffect(() => {
    if (!managedOwnerId && currentUser?.userId) setManagedOwnerId(currentUser.userId);
  }, [currentUser?.userId, managedOwnerId]);

  useEffect(() => {
    let cancelled = false;
    async function loadShares() {
      try {
        const [shares, audit] = await Promise.all([
          api.getAccountShares(managedOwnerId),
          api.getAccountAudit(),
        ]);
        if (!cancelled) {
          setFamilyShares(shares || []);
          setAuditEvents(audit || []);
        }
      } catch (error) {
        if (!cancelled) setFamilyShareError(String(error.message || error));
      }
    }
    loadShares();
    return () => { cancelled = true; };
  }, [managedOwnerId]);

  async function saveFamilyShare() {
    const email = familyShareForm.email.trim();
    if (!email) return;
    setFamilyShareBusy(true);
    setFamilyShareError("");
    try {
      const saved = await api.saveAccountShare({
        email,
        accessLevel: familyShareForm.accessLevel,
        canManageSharing: familyShareForm.canManageSharing,
        portfolioIds: familyShareForm.portfolioIds,
        ownerUserId: managedOwnerId,
      });
      setFamilyShares((current) => {
        const withoutExisting = current.filter((share) => share.id !== saved.id && share.email?.toLowerCase() !== saved.email?.toLowerCase());
        return [saved, ...withoutExisting];
      });
      setFamilyShareForm({email: "", accessLevel: "READ", canManageSharing: false, portfolioIds: []});
      setAuditEvents(await api.getAccountAudit());
      await onFamilyAccessChanged?.();
    } catch (error) {
      setFamilyShareError(String(error.message || error));
    } finally {
      setFamilyShareBusy(false);
    }
  }

  async function revokeFamilyShare(share) {
    if (!share?.id) return;
    setFamilyShareBusy(true);
    setFamilyShareError("");
    try {
      await api.deleteAccountShare(share.id, managedOwnerId);
      setFamilyShares((current) => current.filter((item) => item.id !== share.id));
      setAuditEvents(await api.getAccountAudit());
      await onFamilyAccessChanged?.();
    } catch (error) {
      setFamilyShareError(String(error.message || error));
    } finally {
      setFamilyShareBusy(false);
    }
  }

  async function copyInviteLink(share) {
    if (!share?.inviteToken) return;
    const link = `${window.location.origin}${window.location.pathname}?shareInvite=${encodeURIComponent(share.inviteToken)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedShareId(share.id);
      window.setTimeout(() => setCopiedShareId((current) => current === share.id ? "" : current), 1600);
    } catch (error) {
      setFamilyShareError("Unable to copy invite link");
    }
  }

  function toggleSharePortfolio(portfolioId) {
    setFamilyShareForm((current) => {
      const allPortfolioIds = ownedPortfolios.map((portfolio) => portfolio.id);
      const currentIds = current.portfolioIds.length ? current.portfolioIds : allPortfolioIds;
      const nextIds = currentIds.includes(portfolioId)
        ? currentIds.filter((id) => id !== portfolioId)
        : [...currentIds, portfolioId];
      const normalizedNextIds = nextIds.length === allPortfolioIds.length ? [] : nextIds;
      return {...current, portfolioIds: normalizedNextIds};
    });
  }

  function scopeLabel(share) {
    if (!share.portfolioIds?.length) return "All portfolios";
    return `${share.portfolioIds.length} selected portfolio${share.portfolioIds.length === 1 ? "" : "s"}`;
  }

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
          <p className="eyebrow">FAMILY ACCESS</p>
          <h4>Share this account</h4>
          <p className="account-copy">Give another user access to all portfolios or selected portfolios. Share the invite link after creating access; the invited user must sign in with that email and accept it.</p>
          {managedAccounts.length > 1 ? (
            <label className="auth-field">
              <span>Manage sharing for</span>
              <select value={managedOwnerId} onChange={(event) => setManagedOwnerId(event.target.value)}>
                {managedAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="account-share-form">
            <label className="auth-field">
              <span>User email</span>
              <input
                type="email"
                placeholder="family@example.com"
                value={familyShareForm.email}
                onChange={(e) => setFamilyShareForm((current) => ({...current, email: e.target.value}))}
              />
            </label>
            <label className="auth-field">
              <span>Access</span>
              <select
                value={familyShareForm.accessLevel}
                onChange={(e) => setFamilyShareForm((current) => ({...current, accessLevel: e.target.value}))}
              >
                <option value="READ">Read only</option>
                <option value="FULL">Full access</option>
              </select>
            </label>
            <button className="primary" disabled={familyShareBusy || !familyShareForm.email.trim()} onClick={saveFamilyShare} type="button">
              {familyShareBusy ? "Saving..." : "Grant access"}
            </button>
          </div>
          <label className="checkbox-row account-share-manage-row">
            <input
              checked={familyShareForm.canManageSharing}
              onChange={(event) => setFamilyShareForm((current) => ({...current, canManageSharing: event.target.checked}))}
              type="checkbox"
            />
            <span>Can manage sharing</span>
          </label>
          <div className="account-share-scope">
            <div className="account-share-scope-head">
              <strong>Portfolio scope</strong>
              <button className="ghost" onClick={() => setFamilyShareForm((current) => ({...current, portfolioIds: []}))} type="button">
                All portfolios
              </button>
            </div>
            <div className="account-share-scope-list">
              {ownedPortfolios.map((portfolio) => (
                <label className="checkbox-row" key={portfolio.id}>
                  <input
                    checked={!familyShareForm.portfolioIds.length || familyShareForm.portfolioIds.includes(portfolio.id)}
                    onChange={() => toggleSharePortfolio(portfolio.id)}
                    type="checkbox"
                  />
                  <span>{portfolio.name}</span>
                </label>
              ))}
            </div>
          </div>
          {familyShareError ? <p className="account-inline-error">{familyShareError}</p> : null}
          <div className="account-share-list">
            {familyShares.length ? familyShares.map((share) => (
              <div className="account-share-row" key={share.id}>
                <div>
                  <strong>{share.email}</strong>
                  <span>{share.status === "ACTIVE" ? "Active user" : "Pending acceptance"} | {share.accessLevel === "FULL" ? "Full access" : "Read only"} | {scopeLabel(share)}{share.canManageSharing ? " | Can manage sharing" : ""}</span>
                </div>
                <div className="account-share-row-actions">
                  {share.inviteToken ? (
                    <button className="ghost" disabled={familyShareBusy} onClick={() => copyInviteLink(share)} type="button">
                      {copiedShareId === share.id ? "Copied" : "Copy invite"}
                    </button>
                  ) : null}
                  <button className="ghost" disabled={familyShareBusy} onClick={() => revokeFamilyShare(share)} type="button">
                    Revoke
                  </button>
                </div>
              </div>
            )) : (
              <p className="account-empty-note">No family access yet.</p>
            )}
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
          <p className="eyebrow">AUDIT LOG</p>
          <h4>Recent account activity</h4>
          <div className="account-audit-list">
            {auditEvents.length ? auditEvents.slice(0, 12).map((event) => (
              <div className="account-audit-row" key={event.id || `${event.createdAt}:${event.summary}`}>
                <strong>{event.summary || `${event.action} ${event.entityType}`}</strong>
                <span>{event.createdAt ? new Date(event.createdAt).toLocaleString() : "Just now"} | Actor {event.actorUserId || "unknown"}</span>
              </div>
            )) : (
              <p className="account-empty-note">No account activity recorded yet.</p>
            )}
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
