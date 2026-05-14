import React from "react";
import {ModalSheet} from "./ModalSheet";

function formatExpiry(value) {
  if (!value) return "";
  return new Date(value * 1000).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
}

export function AccountModal({currentUser, linkSession, onClose, onCreateLinkCode}) {
  const googleLinked = currentUser?.googleLinked ?? currentUser?.authProvider === "GOOGLE";
  const linkedLabel = currentUser?.telegramLinked
    ? `Linked as @${currentUser.telegramUsername || "telegram-user"}`
    : "Not linked yet";

  return (
    <ModalSheet onClose={onClose} subtitle="Manage how this account works across browser and Telegram." title="Account">
      <div className="account-stack">
        <section className="account-panel">
          <p className="eyebrow">PROFILE</p>
          <h4>{[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") || currentUser?.email || "Investment user"}</h4>
          <div className="account-grid">
            <div><span>Email</span><strong>{currentUser?.email || "Not set"}</strong></div>
            <div><span>Primary auth</span><strong>{currentUser?.authProvider || "Unknown"}</strong></div>
            <div><span>Google</span><strong>{googleLinked ? "Linked" : "Not linked"}</strong></div>
            <div><span>Telegram</span><strong>{linkedLabel}</strong></div>
          </div>
        </section>

        <section className="account-panel">
          <p className="eyebrow">CONNECT TELEGRAM</p>
          <h4>Use one account in browser and Mini App</h4>
          <ol className="account-steps">
            <li>Generate a short connect code here.</li>
            <li>Open the Telegram Mini App.</li>
            <li>Paste the code into the Telegram section and continue.</li>
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
        </section>
      </div>
    </ModalSheet>
  );
}
