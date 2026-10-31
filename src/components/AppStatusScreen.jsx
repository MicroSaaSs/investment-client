import React from "react";

export function AppStatusScreen({title, description, loading = false, onRetry}) {
  return (
    <main className="app-status-screen">
      <section className="app-status-card" role={loading ? "status" : "alert"} aria-live="polite" aria-busy={loading}>
        <p className="eyebrow">INVESTMENT PLATFORM</p>
        {loading ? <div className="app-loading-spinner app-loading-spinner-large" aria-hidden="true" /> : null}
        <h1>{title}</h1>
        <p className="app-status-description">{description}</p>
        {onRetry ? <button className="primary" onClick={onRetry} type="button">Try again</button> : null}
      </section>
    </main>
  );
}
