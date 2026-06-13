import React from "react";
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {money, pct, pctNegative, shortDate} from "../utils/format";

function portfolioHint(position) {
  return String(position?.portfolioName || "").trim();
}

export function AvgDrawdownView({avgDrawdown}) {
  const tickerCounts = avgDrawdown.reduce((counts, position) => {
    const ticker = String(position?.ticker || "").toUpperCase();
    if (!ticker) return counts;
    counts.set(ticker, (counts.get(ticker) || 0) + 1);
    return counts;
  }, new Map());
  const sorted = [...avgDrawdown]
    .map((position) => {
      const ticker = String(position?.ticker || "").toUpperCase();
      const hint = portfolioHint(position);
      return {
        ...position,
        avgDrawdown: -Math.abs(Number(position.avgDrawdown || 0)),
        chartTicker: tickerCounts.get(ticker) > 1 && hint ? `${ticker} (${hint})` : position.ticker,
      };
    })
    .sort((left, right) => left.avgDrawdown - right.avgDrawdown);
  const chartHeight = Math.max(280, Math.min(680, sorted.length * 42 + 32));
  const maxDrawdownMagnitude = Math.max(12, ...sorted.map((position) => Math.abs(position.avgDrawdown || 0)));
  const domainFloor = -Math.ceil(maxDrawdownMagnitude / 5) * 5;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">AVRG DRAWDOWN</p>
          <h2>Risk snapshot by ticker</h2>
          <p className="panel-copy">See the average interval drawdown for each holding across its configured analysis window, together with the current peak and drawdown state.</p>
        </div>
      </div>
      <div style={{height: chartHeight}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d7e1ef" />
            <XAxis
              type="number"
              domain={[domainFloor, 0]}
              reversed
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="chartTicker"
              width={90}
              tickLine={false}
              axisLine={false}
              tick={{fontSize: 12}}
            />
            <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} labelFormatter={(value) => `${value} avg drawdown`} />
            <Bar dataKey="avgDrawdown" fill="#12305f" radius={[0, 10, 10, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="table-wrap desktop-table">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Company</th>
              <th className="table-center">Peak Price</th>
              <th className="table-center">Price</th>
              <th className="table-center">Drawdown</th>
              <th className="table-center">Avg Drawdown</th>
              <th className="table-center">Analysis Window</th>
              <th className="table-center">Interval</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((position) => (
              <tr key={`${position.portfolioContextId || position.portfolioId || "portfolio"}:${position.id}`} title={portfolioHint(position) ? `Portfolio: ${portfolioHint(position)}` : undefined}>
                <td><strong>{position.ticker}</strong></td>
                <td>{position.company || "—"}</td>
                <td className="table-center">
                  <div className="table-cell-stack table-cell-stack-center">
                    <span>{money(position.peak, 2)}</span>
                    {position.peakDate ? <small>{shortDate(position.peakDate)}</small> : null}
                  </div>
                </td>
                <td className="table-center">{money(position.price, 2)}</td>
                <td className="table-center">{pct(position.dd)}</td>
                <td className="table-center">{pctNegative(position.avgDrawdown)}</td>
                <td className="table-center">{position.avgDrawdownPeriod} mo</td>
                <td className="table-center">{position.avgDrawdownInterval} mo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-list">
        {sorted.map((position) => (
          <article className="mobile-card mobile-card-position" key={`${position.portfolioContextId || position.portfolioId || "portfolio"}:${position.id}`}>
            <div className="mobile-card-top">
              <div>
                <div className="mobile-transaction-title-block">
                  <strong>{position.ticker}</strong>
                  {portfolioHint(position) ? <span className="portfolio-row-hint mobile-portfolio-row-hint">{portfolioHint(position)}</span> : null}
                </div>
                <small>{position.company || "—"}</small>
              </div>
              <div className="mobile-card-top-meta">
                <strong>{pctNegative(position.avgDrawdown)}</strong>
                <small>Avg drawdown</small>
              </div>
            </div>
            <div className="mobile-card-summary">
              <span><strong>Peak</strong>{position.peakDate ? `${money(position.peak, 2)} · ${shortDate(position.peakDate)}` : money(position.peak, 2)}</span>
              <span><strong>Price</strong>{money(position.price, 2)}</span>
              <span><strong>Drawdown</strong>{pct(position.dd)}</span>
              <span><strong>Window</strong>{position.avgDrawdownPeriod} mo</span>
              <span><strong>Interval</strong>{position.avgDrawdownInterval} mo</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
