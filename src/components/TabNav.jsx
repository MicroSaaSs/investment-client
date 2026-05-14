import React from "react";

const TABS = [
  {id: "dashboard", label: "DASHBOARD"},
  {id: "positions", label: "POSITIONS"},
  {id: "volatility", label: "VOLATILITY"},
];

export function TabNav({tab, onChange}) {
  return (
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
  );
}
