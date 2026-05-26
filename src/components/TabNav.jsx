import React from "react";

const TABS = [
  {id: "portfolios", label: "PORTFOLIOS", short: "Port", icon: "🗂️"},
  {id: "dashboard", label: "DASHBOARD", short: "Home", icon: "📊"},
  {id: "positions", label: "HOLDINGS", short: "Holdings", icon: "💼"},
  {id: "watchlist", label: "WATCH LIST", short: "Watch", icon: "👀"},
  {id: "avg-drawdown", label: "AVRG DRAWDOWN", short: "Risk", icon: "📉"},
  {id: "ai", label: "AI", short: "AI", icon: "🤖"},
];

export function TabNav({tab, onChange, visible = true}) {
  return (
    <>
      <nav className="tab-nav">
        {TABS.map((item) => {
          return (
            <button
              className={`tab-nav-item ${item.id === tab ? "active" : ""}`.trim()}
              key={item.id}
              onClick={() => onChange(item.id)}
              type="button"
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <nav className={`tab-nav-mobile ${visible ? "is-visible" : "is-hidden"}`}>
        {TABS.map((item) => (
          <div className="tab-nav-mobile-item-wrap" key={item.id}>
            <button
              className={item.id === tab ? "active" : ""}
              onClick={() => onChange(item.id)}
              type="button"
            >
              <span className="tab-nav-mobile-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.short}</span>
            </button>
          </div>
        ))}
      </nav>
    </>
  );
}
