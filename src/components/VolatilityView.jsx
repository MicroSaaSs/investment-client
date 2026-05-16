import React from "react";
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {money, pct, pctMagnitude} from "../utils/format";

export function VolatilityView({volatility}) {
  const sorted = [...volatility].sort((left, right) => right.volatility - left.volatility);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">VOLATILITY</p>
          <h2>Risk snapshot by ticker</h2>
          <p className="panel-copy">See the average interval drawdown for each holding across its configured volatility window, together with the current peak and drawdown state.</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={sorted}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7e1ef" />
          <XAxis dataKey="ticker" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} labelFormatter={(value) => `${value} volatility`} />
          <Bar dataKey="volatility" fill="#12305f" radius={[10, 10, 0, 0]} />
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
              <th className="table-center">Volatility</th>
              <th className="table-center">Volatility Window</th>
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
                <td className="table-center">{pctMagnitude(position.volatility)}</td>
                <td className="table-center">{position.volatilityPeriod} mo</td>
                <td className="table-center">{position.volatilityInterval} mo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
