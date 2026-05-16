import React from "react";

const TABS = [
  {id: "portfolios", label: "PORTFOLIOS", short: "Port", icon: "🗂️"},
  {id: "dashboard", label: "DASHBOARD", short: "Home", icon: "📊"},
  {id: "positions", label: "POSITIONS", short: "Holdings", icon: "💼"},
  {id: "watchlist", label: "WATCH LIST", short: "Watch", icon: "👀"},
  {id: "volatility", label: "VOLATILITY", short: "Risk", icon: "📉"},
];

export function TabNav({tab, onChange, selectedPortfolioName, onOpenPortfolioSwitch}) {
  return (
    <>
      <nav className="tab-nav">
        {TABS.map((item) => {
          const isPortfolioTab = item.id === "portfolios";
          return (
            <div className={isPortfolioTab ? "tab-nav-portfolio-wrap" : ""} key={item.id}>
              <button
                className={`tab-nav-item ${item.id === tab ? "active" : ""} ${isPortfolioTab ? "tab-nav-portfolio" : ""}`.trim()}
                onClick={() => onChange(item.id)}
                type="button"
              >
                <span>{item.label}</span>
              </button>
              {isPortfolioTab && selectedPortfolioName ? (
                <span className="tab-nav-portfolio-label">{selectedPortfolioName}</span>
              ) : null}
              {isPortfolioTab && onOpenPortfolioSwitch ? (
                <button
                  aria-label="Change portfolio"
                  className="tab-nav-portfolio-switch"
                  onClick={onOpenPortfolioSwitch}
                  title="Change portfolio"
                  type="button"
                >
                  ⇄
                </button>
              ) : null}
            </div>
          );
        })}
      </nav>
      <nav className="tab-nav-mobile">
        {TABS.map((item) => (
          <button
            className={item.id === tab ? "active" : ""}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <span className="tab-nav-mobile-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.short}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
