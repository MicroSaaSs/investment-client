import React from "react";

export function AppHeader({
  middle = null,
  onAccount,
  onLogout,
  showLogout = true,
}) {
  return (
    <header className="app-header">
      <div className="app-heading">
        <h1>Investment Platform</h1>
      </div>
      {middle ? <div className="app-header-middle">{middle}</div> : null}
      <div className="header-actions">
        <button className="action-button action-button-secondary" onClick={onAccount} type="button">Account</button>
        {showLogout ? <button className="ghost action-button-ghost" onClick={onLogout} type="button">Log out</button> : null}
      </div>
    </header>
  );
}
