import React from "react";

const WEEKDAYS = [
  {value: "MONDAY", label: "Monday"},
  {value: "TUESDAY", label: "Tuesday"},
  {value: "WEDNESDAY", label: "Wednesday"},
  {value: "THURSDAY", label: "Thursday"},
  {value: "FRIDAY", label: "Friday"},
  {value: "SATURDAY", label: "Saturday"},
  {value: "SUNDAY", label: "Sunday"},
];

export function AiView({
  aiSettings,
  aiSummary,
  currentUser,
  hasInvestedPosition,
  onFetchSummary,
  onSaveSettings,
  onSettingsChange,
  portfolios,
  portfolioName,
  portfolioId,
  summaryBusy,
  settingsBusy,
}) {
  const telegramLinked = currentUser?.telegramLinked;
  const selectedAiPortfolioId = aiSettings.portfolioId || portfolioId || "";
  const summaryLockActive = Boolean(aiSummary?.nextAvailableAt && !Number.isNaN(Date.parse(aiSummary.nextAvailableAt)) && Date.parse(aiSummary.nextAvailableAt) > Date.now());
  const canSchedule = Boolean(telegramLinked && selectedAiPortfolioId && hasInvestedPosition);
  const canFetchSummary = Boolean(selectedAiPortfolioId && hasInvestedPosition && !summaryLockActive);

  return (
    <main className="ai-layout">
      <section className="panel ai-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">AI</p>
            <h2>Telegram summary schedule</h2>
            <p className="panel-copy">Set the cadence for AI portfolio summaries and keep the selected portfolio tied to Telegram notifications.</p>
          </div>
        </div>

        {!telegramLinked ? (
          <div className="ai-notice">
            <strong>Telegram is not connected.</strong>
            <span>Link your Telegram account in Account settings first to enable scheduled AI summaries and bot notifications.</span>
          </div>
        ) : null}

        {telegramLinked && !hasInvestedPosition ? (
          <div className="ai-notice">
            <strong>At least one invested position is required.</strong>
            <span>Schedule and manual AI analysis become available after the portfolio has an invested position to analyze.</span>
          </div>
        ) : null}

        <div className="ai-settings-grid">
          <label className="auth-field ai-field">
            <span>Portfolio</span>
            <select
              disabled={!portfolios?.length || settingsBusy}
              onChange={(event) => onSettingsChange("portfolioId", event.target.value)}
              value={selectedAiPortfolioId}
            >
              <option disabled value="">Select portfolio</option>
              {(portfolios || []).map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
              ))}
            </select>
          </label>

          <label className="auth-field ai-field ai-field-toggle">
            <span>Notifications</span>
            <button
              className={`ai-toggle ${aiSettings.notificationsEnabled ? "active" : ""}`}
              disabled={!canSchedule || settingsBusy}
              onClick={() => onSettingsChange("notificationsEnabled", !aiSettings.notificationsEnabled)}
              type="button"
            >
              <i>{aiSettings.notificationsEnabled ? "Enabled" : "Disabled"}</i>
            </button>
          </label>

          <label className="auth-field ai-field">
            <span>Repeating</span>
            <select
              disabled={!canSchedule || settingsBusy}
              onChange={(event) => onSettingsChange("schedule", event.target.value)}
              value={aiSettings.schedule}
            >
              <option value="DAILY">Every day</option>
              <option value="WEEKLY">Every week</option>
              <option value="MONTHLY">Every month</option>
            </select>
          </label>

          {aiSettings.schedule === "WEEKLY" ? (
            <label className="auth-field ai-field">
              <span>Day</span>
              <select
                disabled={!canSchedule || settingsBusy}
                onChange={(event) => onSettingsChange("weekday", event.target.value)}
                value={aiSettings.weekday}
              >
                {WEEKDAYS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          ) : null}

          {aiSettings.schedule === "MONTHLY" ? (
            <label className="auth-field ai-field">
              <span>Day of month</span>
              <input
                disabled={!canSchedule || settingsBusy}
                max="31"
                min="1"
                onChange={(event) => onSettingsChange("monthDay", Math.max(1, Math.min(31, Number(event.target.value) || 1)))}
                step="1"
                type="number"
                value={String(aiSettings.monthDay)}
              />
              <small className="ai-field-note">If the month is shorter, we use the last calendar day.</small>
            </label>
          ) : null}

          <label className="auth-field ai-field">
            <span>Capture time</span>
            <input
              disabled={!canSchedule || settingsBusy}
              onChange={(event) => onSettingsChange("time", event.target.value)}
              type="time"
              value={aiSettings.time}
            />
          </label>
        </div>

        <div className="ai-toolbar">
          <button
            className="primary"
            disabled={!canSchedule || settingsBusy}
            onClick={onSaveSettings}
            type="button"
          >
            {settingsBusy ? "Saving..." : "Save schedule"}
          </button>
          <span className="ai-toolbar-note">Choose a post-close time in ET so daily history snapshots reflect closed market prices.</span>
        </div>
      </section>

      <section className="panel ai-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SUMMARY</p>
            <h2>Manual AI fetch</h2>
            <p className="panel-copy">Preview the current portfolio summary directly in the client before Telegram sends the scheduled version.</p>
          </div>
          <button
            className="action-button"
            disabled={!canFetchSummary || summaryBusy}
            onClick={onFetchSummary}
            type="button"
          >
            {summaryBusy ? "Fetching..." : "Fetch summary"}
          </button>
        </div>

        {summaryLockActive ? <div className="ai-notice"><strong>Daily limit reached.</strong><span>AI analysis is available once per day. Let the portfolio breathe and come back after 00:01 ET.</span></div> : null}

        <div className="ai-summary-card">
          <div className="ai-summary-head">
            <strong>{aiSummary?.portfolioName || portfolioName || "Selected portfolio"}</strong>
            <span>{summaryBusy ? "Updating..." : "Live preview"}</span>
          </div>
          {aiSummary?.text ? (
            <div className="ai-summary-text" dangerouslySetInnerHTML={{__html: aiSummary.text.replace(/\n/g, "<br />")}} />
          ) : (
            <div className="portfolio-bar-summary-empty">Fetch a summary to preview the current AI message for this portfolio.</div>
          )}
        </div>
      </section>
    </main>
  );
}
