import React from "react";
import { compactMoney, money, pct, pctMagnitude, pctNegative, pctPlain, shortDate, sourceLabel } from "../utils/format";
import { ModalSheet } from "./ModalSheet";
import { getPositionSummaryMetricConfig, MobilePositionCard, normalizePositionSummaryMetricIds, PositionSummaryMetricControl } from "./MobilePositionCard";
import { PortfolioBar } from "./PortfolioBar";
import { TrashIcon } from "./icons/TrashIcon";
import { moveItemAfter, moveItemBefore, moveManualOrderItem, sortPositions } from "../utils/positionSort";

function SignalBadge({ signal }) {
  const normalized = signal || "HOLD";
  return <span className={`signal-pill signal-${normalized.toLowerCase()}`}>{normalized}</span>;
}

function SourceBadge({ source, type }) {
  const normalized = (source || "UNAVAILABLE").toLowerCase();
  return <span className={`data-source-badge data-source-${normalized}`}>{sourceLabel(source, type)}</span>;
}

function isCashPosition(position) {
  return position?.type === "CASH";
}

function companyLabel(position) {
  if (position?.type === "CASH") return "Uninvested cash";
  return (position.company || "").trim() || "—";
}

function PortfolioOverviewBreakdownModal({entries, title, subtitle, onClose, renderValue}) {
  if (!entries?.length) return null;
  return (
    <ModalSheet title={title} subtitle={subtitle} onClose={onClose}>
      <div className="metric-detail-stack">
        {entries.map((entry) => (
          <div className="metric-detail-row" key={entry.id}>
            <div className="metric-detail-company">
              <div className="metric-detail-title">
                <strong>{entry.name}</strong>
              </div>
              <span>{entry.subtitle}</span>
            </div>
            <div className="metric-detail-value">
              {renderValue(entry)}
            </div>
          </div>
        ))}
      </div>
    </ModalSheet>
  );
}

function PositionDetailsModal({ position, onClose, onEditPosition, onDeletePosition, onAddTransaction }) {
  if (!position) return null;
  const isCash = isCashPosition(position);
  const avgPrice = Number(position.shares || 0) > 0 ? Number(position.invested || 0) / Number(position.shares || 0) : 0;
  const pnlValue = Number(position.current || 0) - Number(position.invested || 0);

  return (
    <ModalSheet
      className="position-details-modal"
      title="Position details"
      onClose={onClose}
      headerActions={onAddTransaction ? (
        <button
          aria-label={`Add transaction for ${position.ticker}`}
          className="toolbar-icon-button txn-toolbar-icon-button"
          onClick={() => onAddTransaction(position)}
          title="Add transaction"
          type="button"
        >
          <span aria-hidden="true" className="txn-icon-stack">
            <i>🧾</i>
            <b>Txn</b>
          </span>
        </button>
      ) : null}
    >
      <div className="position-detail-sheet">
        <div className="position-detail-hero">
          <div className="position-detail-hero-main">
            <div className="position-detail-title">
              <strong>{position.ticker}</strong>
              <SignalBadge signal={position.signal} />
            </div>
            <p>{companyLabel(position)}</p>
          </div>
          <div className="position-detail-title-actions">
            <button
              aria-label={`Edit ${position.ticker}`}
              className="toolbar-icon-button"
              onClick={() => onEditPosition(position)}
              title="Edit"
              type="button"
            >
              <span aria-hidden="true">✎</span>
            </button>
            <button
              aria-label={`Delete ${position.ticker}`}
              className="toolbar-icon-button toolbar-icon-button-danger"
              onClick={() => {
                onClose();
                onDeletePosition(position);
              }}
              title="Delete"
              type="button"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
        <div className="position-detail-grid">
          <div className="position-detail-grid-card">
            <span>Value</span>
            <div className="position-detail-lines">
              {isCash ? (
                <strong>Balance {money(position.current, 0)}</strong>
              ) : (
                <>
                  <strong>Invest {money(position.invested, 0)}</strong>
                  <strong>Curr {money(position.current, 0)}</strong>
                </>
              )}
            </div>
          </div>
          {!isCash ? (
            <>
              <div className="position-detail-grid-card">
                <span>Allocation</span>
                <div className="position-detail-lines">
                  <strong>Target {pctPlain(position.target)}</strong>
                  <strong>Curr {pctPlain(position.weight)}</strong>
                </div>
              </div>
              <div className="position-detail-grid-card">
                <span>Shares</span>
                <div className="position-detail-lines">
                  <strong>{Number(position.shares || 0).toLocaleString()} sh</strong>
                  <strong>Avg {money(avgPrice, 2)}</strong>
                </div>
              </div>
              <div className="position-detail-grid-card">
                <span>Price</span>
                <div className="position-detail-price-line">
                  <strong>{money(position.price, 2)}</strong>
                  <small><SourceBadge source={position.priceSource} type={position.type} /></small>
                </div>
                <strong className="position-detail-secondary-value">
                  Peak {money(position.peak, 2)}{position.peakDate ? ` · ${shortDate(position.peakDate)}` : ""}
                </strong>
              </div>
              <div className="position-detail-grid-card">
                <span>PnL</span>
                <div className="position-detail-lines">
                  <strong>{money(pnlValue, 0)}</strong>
                  <strong>{pct(position.pnlPct)}</strong>
                </div>
              </div>
              <div className="position-detail-grid-card">
                <span>Drawdown</span>
                <strong>{pct(position.dd)}</strong>
              </div>
              <div className="position-detail-grid-card">
                <span>Avg Drawdown</span>
                <strong>{pctNegative(position.avgDrawdown)}</strong>
              </div>
              <div className="position-detail-grid-card">
                <span>Triggers</span>
                <div className="position-detail-trigger-lines">
                  <div className="position-detail-trigger-row">
                    <strong>CORR</strong>
                    <strong>{pctMagnitude(Math.abs(position.corr))}</strong>
                    <strong>{money(position.correctionTrigger, 0)}</strong>
                  </div>
                  <div className="position-detail-trigger-row">
                    <strong>DD_P</strong>
                    <strong>{pctMagnitude(Math.abs(position.ddPlan))}</strong>
                    <strong>{money(position.drawdownTrigger, 0)}</strong>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </ModalSheet>
  );
}

export function PortfolioView({
  portfolios,
  portfolioId,
  selectedPortfolioIds,
  metrics,
  portfolioTabDataById,
  portfolioTabBusy,
  mobilePositionSummaryMetrics,
  onEditPosition,
  onDeletePosition,
  onAddTransaction,
  onMobilePositionSummaryMetricsChange,
  onReorderPositions,
  onApplySelection,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}) {
  const dragPositionIdRef = React.useRef(null);
  const [detailPosition, setDetailPosition] = React.useState(null);
  const [overviewDetailType, setOverviewDetailType] = React.useState(null);
  const [expandedMobileCard, setExpandedMobileCard] = React.useState(null);
  const [dragPositionId, setDragPositionId] = React.useState(null);
  const [dropTargetId, setDropTargetId] = React.useState(null);
  const [expandedPortfolioIds, setExpandedPortfolioIds] = React.useState({});
  const selected = portfolios.find((portfolio) => portfolio.id === portfolioId) || null;
  const portfolioGroups = React.useMemo(() => {
    const effectiveIds = (selectedPortfolioIds?.length ? selectedPortfolioIds : [portfolioId]).filter(Boolean);
    return effectiveIds
      .map((id) => {
        const portfolio = portfolios.find((item) => item.id === id);
        if (!portfolio) return null;
        const data = portfolioTabDataById?.[id] || (id === portfolioId ? {metrics, rawPositions: []} : null);
        const portfolioMetrics = data?.metrics || (id === portfolioId ? metrics : null);
        const active = sortPositions((portfolioMetrics?.positions || []).filter((position) => position.mode !== "WATCHLIST"));
        return {
          id,
          portfolio,
          metrics: portfolioMetrics,
          rawPositions: data?.rawPositions || [],
          activePositions: active,
          includedCount: active.filter((position) => position.includeInAllocation).length,
          cashCount: active.filter((position) => position.type === "CASH" || position.type === "CASH_ETF").length,
        };
      })
      .filter(Boolean);
  }, [metrics, portfolioId, portfolioTabDataById, portfolios, selectedPortfolioIds]);
  const primaryGroup = portfolioGroups.find((group) => group.id === portfolioId) || portfolioGroups[0] || null;
  const activePositions = primaryGroup?.activePositions || [];
  const sortedPositions = activePositions;
  const summaryMetricIds = normalizePositionSummaryMetricIds(mobilePositionSummaryMetrics);
  const includedCount = primaryGroup?.includedCount || 0;
  const cashCount = primaryGroup?.cashCount || 0;
  const pnlPctValue = Number(primaryGroup?.metrics?.pnlPct || 0);
  const pnlTrendArrow = pnlPctValue < 0 ? "↓" : "↑";
  const multiPortfolioMode = portfolioGroups.length > 1;
  const overviewEntries = React.useMemo(() => portfolioGroups.map((group) => ({
    id: group.id,
    name: group.portfolio.name,
    subtitle: `${group.activePositions.length} holdings · ${group.includedCount} in model`,
    totalValue: Number(group.metrics?.totalValue || 0),
    invested: Number(group.metrics?.invested || 0),
    pnl: Number(group.metrics?.pnl || 0),
    pnlPct: Number(group.metrics?.pnlPct || 0),
    activeSignals: Number(group.metrics?.activeSignals || 0),
    activePositions: group.activePositions.length,
    cashPositions: group.cashCount,
  })), [portfolioGroups]);
  const aggregateOverview = React.useMemo(() => {
    const totalValue = overviewEntries.reduce((sum, entry) => sum + entry.totalValue, 0);
    const invested = overviewEntries.reduce((sum, entry) => sum + entry.invested, 0);
    const pnl = overviewEntries.reduce((sum, entry) => sum + entry.pnl, 0);
    return {
      totalValue,
      invested,
      pnl,
      pnlPct: invested > 0 ? (pnl / invested) * 100 : 0,
      activeSignals: overviewEntries.reduce((sum, entry) => sum + entry.activeSignals, 0),
      activePositions: overviewEntries.reduce((sum, entry) => sum + entry.activePositions, 0),
      cashPositions: overviewEntries.reduce((sum, entry) => sum + entry.cashPositions, 0),
      includedCount: portfolioGroups.reduce((sum, group) => sum + group.includedCount, 0),
    };
  }, [overviewEntries, portfolioGroups]);

  React.useEffect(() => {
    if (!portfolioGroups.length) return;
    setExpandedPortfolioIds((current) => {
      const next = {};
      portfolioGroups.forEach((group) => {
        next[group.id] = current[group.id] ?? true;
      });
      return next;
    });
  }, [portfolioGroups]);

  function openPositionDetail(position, contextPortfolioId = portfolioId) {
    setDetailPosition({...position, portfolioContextId: contextPortfolioId});
  }

  function togglePortfolioGroup(groupId) {
    setExpandedPortfolioIds((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  async function handleDropOnPosition(targetPositionId, sourcePositionId = null, placement = "after") {
    if (multiPortfolioMode) return;
    const movingId = sourcePositionId || dragPositionIdRef.current || dragPositionId;
    if (!movingId || !targetPositionId || movingId === targetPositionId) return;
    const orderIds = sortedPositions.map((position) => position.id);
    const nextOrderIds = placement === "before"
      ? moveItemBefore(orderIds, movingId, targetPositionId)
      : moveItemAfter(orderIds, movingId, targetPositionId);
    setDragPositionId(null);
    dragPositionIdRef.current = null;
    setDropTargetId(null);
    await onReorderPositions?.(nextOrderIds);
  }

  async function movePositionByStep(positionId, direction) {
    if (multiPortfolioMode) return;
    const orderIds = sortedPositions.map((position) => position.id);
    const nextOrderIds = moveManualOrderItem(orderIds, positionId, direction);
    if (nextOrderIds.join(",") === orderIds.join(",")) return;
    await onReorderPositions?.(nextOrderIds);
  }

  return (
    <main className="portfolio-view">
      <div className="portfolio-view-layout">
        <PortfolioBar
          onApplySelection={onApplySelection}
          portfolios={portfolios}
          portfolioId={portfolioId}
          selectedPortfolioIds={selectedPortfolioIds}
          onCreate={onCreate}
          onDelete={onDelete}
          onRename={onRename}
          onSelect={onSelect}
        />
        {primaryGroup ? (
          <section className="panel portfolio-preview-panel">
            <div className="panel-heading panel-heading-inline positions-heading-row">
              <div>
                <p className="eyebrow">POSITIONS</p>
                {multiPortfolioMode ? <p className="panel-copy">Selected portfolios shown as separate expandable blocks.</p> : null}
              </div>
              <PositionSummaryMetricControl
                className="positions-heading-settings"
                onChange={onMobilePositionSummaryMetricsChange}
                onReorderPositions={multiPortfolioMode ? null : onReorderPositions}
                positions={portfolioGroups.flatMap((group) => group.activePositions)}
                selectedMetricIds={summaryMetricIds}
              />
            </div>
            <div className={multiPortfolioMode ? "portfolio-group-stack" : ""}>
              {portfolioGroups.map((group) => {
                const expanded = expandedPortfolioIds[group.id] ?? true;
                const content = (
                  <>
                    <div className="portfolio-bar-summary portfolio-preview-desktop-list">
                      <div className="portfolio-bar-summary-list">
                        {group.activePositions.map((position) => (
                          <button
                            className={`portfolio-bar-position${dropTargetId === position.id ? " is-drop-target" : ""}`}
                            draggable={!multiPortfolioMode}
                            onDragEnd={() => {
                              setDragPositionId(null);
                              dragPositionIdRef.current = null;
                              setDropTargetId(null);
                            }}
                            onDragOver={(event) => {
                              if (multiPortfolioMode) return;
                              event.preventDefault();
                              setDropTargetId(position.id);
                            }}
                            onDragStart={(event) => {
                              if (multiPortfolioMode) return;
                              setDragPositionId(position.id);
                              dragPositionIdRef.current = position.id;
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", position.id);
                              event.dataTransfer.setData("text", position.id);
                            }}
                            onDrop={async (event) => {
                              if (multiPortfolioMode) return;
                              event.preventDefault();
                              const sourceId = dragPositionIdRef.current || dragPositionId || event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text");
                              if (!sourceId) return;
                              const rect = event.currentTarget.getBoundingClientRect();
                              const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                              await handleDropOnPosition(position.id, sourceId, placement);
                            }}
                            onDragLeave={() => setDropTargetId((current) => (current === position.id ? null : current))}
                            key={position.id}
                            onClick={() => openPositionDetail(position, group.id)}
                            type="button"
                          >
                            <div className="portfolio-bar-position-main">
                              <div className="portfolio-bar-position-title-row">
                                <div className="portfolio-bar-position-title-main">
                                  <div className="portfolio-bar-position-head">
                                    <strong>{position.ticker}</strong>
                                    <SignalBadge signal={position.signal} />
                                  </div>
                                  <span className="portfolio-bar-position-company">{companyLabel(position)}</span>
                                </div>
                                <div className="portfolio-bar-position-values">
                                  {(isCashPosition(position) ? ["valueCurrent"] : summaryMetricIds).map((metricId) => {
                                    const metric = getPositionSummaryMetricConfig(metricId, position);
                                    return <strong key={metric.id}>{metric.summary}</strong>;
                                  })}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                        {!group.activePositions.length ? <div className="portfolio-bar-summary-empty">No active positions in this portfolio yet.</div> : null}
                      </div>
                    </div>
                    <div className="portfolio-preview-mobile-list">
                      <div className="mobile-list">
                        {group.activePositions.map((position) => (
                          <MobilePositionCard
                            compactStyle="inline"
                            draggable={!multiPortfolioMode}
                            expanded={expandedMobileCard === `${group.id}:${position.id}`}
                            key={position.id}
                            onDragOver={(event) => {
                              if (multiPortfolioMode) return;
                              event.preventDefault();
                            }}
                            onDragStart={(event) => {
                              if (multiPortfolioMode) return;
                              setDragPositionId(position.id);
                              dragPositionIdRef.current = position.id;
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", position.id);
                              event.dataTransfer.setData("text", position.id);
                            }}
                            onDragEnd={() => {
                              setDragPositionId(null);
                              dragPositionIdRef.current = null;
                            }}
                            onDrop={async (event) => {
                              if (multiPortfolioMode) return;
                              event.preventDefault();
                              const sourceId = dragPositionIdRef.current || dragPositionId || event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text");
                              if (!sourceId) return;
                              const rect = event.currentTarget.getBoundingClientRect();
                              const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
                              await handleDropOnPosition(position.id, sourceId, placement);
                            }}
                            onDragOverCapture={() => {
                              if (multiPortfolioMode) return;
                              setDropTargetId(position.id);
                            }}
                            onDragLeave={() => setDropTargetId((current) => (current === position.id ? null : current))}
                            onAddTransaction={(item) => onAddTransaction?.(item, group.id)}
                            onDelete={(item) => onDeletePosition?.(item, group.id)}
                            onEdit={(item) => onEditPosition?.(item, group.id)}
                            canMoveUp={!multiPortfolioMode && group.activePositions.findIndex((item) => item.id === position.id) > 0}
                            canMoveDown={!multiPortfolioMode && group.activePositions.findIndex((item) => item.id === position.id) < group.activePositions.length - 1}
                            onMoveUp={() => movePositionByStep(position.id, "up")}
                            onMoveDown={() => movePositionByStep(position.id, "down")}
                            onToggle={() => setExpandedMobileCard((current) => current === `${group.id}:${position.id}` ? null : `${group.id}:${position.id}`)}
                            position={position}
                            summaryMetricIds={summaryMetricIds}
                            dropTarget={dropTargetId === position.id}
                          />
                        ))}
                        {!group.activePositions.length ? <div className="portfolio-bar-summary-empty">No active positions in this portfolio yet.</div> : null}
                      </div>
                    </div>
                  </>
                );

                if (!multiPortfolioMode) {
                  return <React.Fragment key={group.id}>{content}</React.Fragment>;
                }

                return (
                  <section className="portfolio-group-panel" key={group.id}>
                    <button className="portfolio-group-toggle" onClick={() => togglePortfolioGroup(group.id)} type="button">
                      <div className="portfolio-group-toggle-copy">
                        <strong>{group.portfolio.name}</strong>
                        <span>{group.activePositions.length} positions · {compactMoney(group.metrics?.totalValue)} · {pct(group.metrics?.pnlPct || 0)}</span>
                      </div>
                      <i>{expanded ? "−" : "+"}</i>
                    </button>
                    {expanded ? content : null}
                  </section>
                );
              })}
              {portfolioTabBusy ? (
                <div className="app-loading-overlay portfolio-tab-loading">
                  <div className="app-loading-spinner" />
                  <div className="app-loading-copy">
                    <strong>Refreshing selected portfolios</strong>
                    <span>Loading positions and overview for the active selection.</span>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
        {primaryGroup ? (
          <section className="panel portfolio-overview-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">OVERVIEW</p>
                <h2>{multiPortfolioMode ? "Selected portfolios at a glance" : `${primaryGroup.portfolio.name} at a glance`}</h2>
                <p className="panel-copy">
                  {multiPortfolioMode
                    ? "Combined context across the selected portfolios, with drill-down details per portfolio."
                    : "Quick portfolio context before you jump into holdings, watch ideas, or average drawdown analysis."}
                </p>
              </div>
            </div>
            <div className="portfolio-overview-grid">
              <button className="portfolio-overview-card portfolio-overview-card-button" onClick={() => setOverviewDetailType("holdings")} type="button">
                <span>Active holdings</span>
                <strong>{multiPortfolioMode ? aggregateOverview.activePositions : activePositions.length}</strong>
                <small>{multiPortfolioMode ? `${aggregateOverview.includedCount} included in target model` : `${includedCount} included in target model`}</small>
              </button>
              <button className="portfolio-overview-card portfolio-overview-card-button" onClick={() => setOverviewDetailType("cash")} type="button">
                <span>Cash positions</span>
                <strong>{multiPortfolioMode ? aggregateOverview.cashPositions : cashCount}</strong>
                <small>Cash buckets and treasury ETF sleeves</small>
              </button>
              <button className="portfolio-overview-card portfolio-overview-card-button" onClick={() => setOverviewDetailType("value")} type="button">
                <span>Portfolio value</span>
                <div className="portfolio-overview-value-row">
                  <strong>{compactMoney(multiPortfolioMode ? aggregateOverview.totalValue : primaryGroup.metrics?.totalValue)}</strong>
                  <i className={`portfolio-overview-trend ${(multiPortfolioMode ? aggregateOverview.pnlPct : pnlPctValue) < 0 ? "down" : "up"}`}>
                    {`· ${(multiPortfolioMode ? aggregateOverview.pnlPct : pnlPctValue) < 0 ? "↓" : "↑"} ${compactMoney(Math.abs(multiPortfolioMode ? aggregateOverview.pnl : primaryGroup.metrics?.pnl || 0))} · ${pct(Math.abs(multiPortfolioMode ? aggregateOverview.pnlPct : pnlPctValue), 1).replace("+", "")}`}
                  </i>
                </div>
                <small>Current marked-to-market value</small>
              </button>
              <button className="portfolio-overview-card portfolio-overview-card-button" onClick={() => setOverviewDetailType("signals")} type="button">
                <span>Active signals</span>
                <strong>{multiPortfolioMode ? aggregateOverview.activeSignals : primaryGroup.metrics?.activeSignals || 0}</strong>
                <small>BUY1 / BUY2 opportunities now</small>
              </button>
            </div>
          </section>
        ) : null}
      </div>
      <PositionDetailsModal
        onAddTransaction={(position) => {
          setDetailPosition(null);
          onAddTransaction?.(position, position.portfolioContextId);
        }}
        onClose={() => setDetailPosition(null)}
        onDeletePosition={(position) => onDeletePosition?.(position, position.portfolioContextId)}
        onEditPosition={(position) => onEditPosition?.(position, position.portfolioContextId)}
        position={detailPosition}
      />
      {overviewDetailType === "value" ? (
        <PortfolioOverviewBreakdownModal
          entries={overviewEntries}
          onClose={() => setOverviewDetailType(null)}
          renderValue={(entry) => `${compactMoney(entry.totalValue)} · ${pct(entry.pnlPct)}`}
          subtitle="Per-portfolio value and result across the current selection."
          title="Portfolio value breakdown"
        />
      ) : null}
      {overviewDetailType === "signals" ? (
        <PortfolioOverviewBreakdownModal
          entries={overviewEntries}
          onClose={() => setOverviewDetailType(null)}
          renderValue={(entry) => `${entry.activeSignals} active`}
          subtitle="BUY1 / BUY2 counts by portfolio."
          title="Signal breakdown"
        />
      ) : null}
      {overviewDetailType === "holdings" ? (
        <PortfolioOverviewBreakdownModal
          entries={overviewEntries}
          onClose={() => setOverviewDetailType(null)}
          renderValue={(entry) => `${entry.activePositions} holdings`}
          subtitle="Active holdings and inclusion footprint by portfolio."
          title="Holdings breakdown"
        />
      ) : null}
      {overviewDetailType === "cash" ? (
        <PortfolioOverviewBreakdownModal
          entries={overviewEntries}
          onClose={() => setOverviewDetailType(null)}
          renderValue={(entry) => `${entry.cashPositions} cash positions`}
          subtitle="Cash buckets and treasury sleeves by portfolio."
          title="Cash breakdown"
        />
      ) : null}
    </main>
  );
}
