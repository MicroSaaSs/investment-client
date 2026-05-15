import React from "react";

const TABS = [
  {id: "dashboard", label: "DASHBOARD", short: "Home", icon: "📊"},
  {id: "positions", label: "POSITIONS", short: "Holdings", icon: "💼"},
  {id: "volatility", label: "VOLATILITY", short: "Risk", icon: "📉"},
];

export function TabNav({tab, onChange}) {
  return (
    <>
      <nav className="tab-nav">
        {TABS.map((item) => (
          <button
            className={item.id === tab ? "active" : ""}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
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
