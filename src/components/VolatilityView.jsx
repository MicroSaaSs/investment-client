import React from "react";
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {money, pct, pctNegative} from "../utils/format";

export function VolatilityView({volatility}) {
  const sorted = [...volatility]
    .map((position) => ({ ...position, avgDrawdown: -Math.abs(Number(position.avgDrawdown || 0)) }))
    .sort((left, right) => left.avgDrawdown - right.avgDrawdown);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">AVRG DRAWDOWN</p>
          <h2>Risk snapshot by ticker</h2>
          <p className="panel-copy">See the average interval drawdown for each holding across its configured analysis window, together with the current peak and drawdown state.</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={sorted} margin={{ top: 8, right: 8, left: 12, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e1ef" />
          <XAxis dataKey="ticker" tickLine={false} axisLine={false} />
          <YAxis width={84} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} labelFormatter={(value) => `${value} avg drawdown`} />
          <Bar dataKey="avgDrawdown" fill="#12305f" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="table-wrap desktop-table">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Company</th>
              <th className="table-center">Peak Price</th>
              <th className="table-center">Drawdown</th>
              <th className="table-center">Avg Drawdown</th>
              <th className="table-center">Analysis Window</th>
              <th className="table-center">Interval</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((position) => (
              <tr key={position.id}>
                <td><strong>{position.ticker}</strong></td>
                <td>{position.company || "—"}</td>
                <td className="table-center">{money(position.peak, 2)}</td>
                <td className="table-center">{pct(position.dd)}</td>
                <td className="table-center">{pctNegative(position.avgDrawdown)}</td>
                <td className="table-center">{position.avgDrawdownPeriod} mo</td>
                <td className="table-center">{position.avgDrawdownInterval} mo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
