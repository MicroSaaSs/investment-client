import React from "react";
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";

export function VolatilityView({volatility}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">VOLATILITY</p>
          <h2>Risk snapshot by ticker</h2>
          <p className="panel-copy">See the average interval drawdown for each holding across its configured volatility lookback window.</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={volatility}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e1ef" />
          <XAxis dataKey="ticker" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} labelFormatter={(value) => `${value} volatility`} />
          <Bar dataKey="volatility" fill="#12305f" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
