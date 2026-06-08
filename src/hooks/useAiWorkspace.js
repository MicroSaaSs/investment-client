import {useEffect, useState} from "react";
import {api} from "../services/api";
import {DEFAULT_AI_SETTINGS} from "../constants/appConstants";
import {DEFAULT_POSITION_SUMMARY_METRICS, normalizePositionSummaryMetricIds} from "../components/MobilePositionCard";
import {nextEtSummaryResetIso} from "../utils/appHelpers";

export function useAiWorkspace({isAuthenticated, metrics, onError, portfolioId, portfolios}) {
  const [aiSettings, setAiSettings] = useState(DEFAULT_AI_SETTINGS);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryBusy, setAiSummaryBusy] = useState(false);
  const [aiSettingsBusy, setAiSettingsBusy] = useState(false);
  const [aiPortfolioInvestedById, setAiPortfolioInvestedById] = useState({});
  const [portfolioPositionSummaryMetrics, setPortfolioPositionSummaryMetrics] = useState(DEFAULT_POSITION_SUMMARY_METRICS);
  const [holdingsPositionSummaryMetrics, setHoldingsPositionSummaryMetrics] = useState(DEFAULT_POSITION_SUMMARY_METRICS);

  const selectedAiPortfolioId = aiSettings.portfolioId || portfolioId;
  const selectedAiHasInvestedPosition = selectedAiPortfolioId
    ? (selectedAiPortfolioId === portfolioId
      ? Number(metrics?.invested || 0) > 0
      : Boolean(aiPortfolioInvestedById[selectedAiPortfolioId]))
    : false;

  useEffect(() => {
    const targetPortfolioId = aiSettings.portfolioId;
    if (!targetPortfolioId || targetPortfolioId === portfolioId) return;
    if (Object.prototype.hasOwnProperty.call(aiPortfolioInvestedById, targetPortfolioId)) return;
    let cancelled = false;
    api.getMetrics(targetPortfolioId)
      .then((portfolioMetrics) => {
        if (cancelled) return;
        setAiPortfolioInvestedById((current) => ({
          ...current,
          [targetPortfolioId]: Number(portfolioMetrics?.invested || 0) > 0,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setAiPortfolioInvestedById((current) => ({
          ...current,
          [targetPortfolioId]: false,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [aiPortfolioInvestedById, aiSettings.portfolioId, portfolioId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.getAiSettings()
      .then((settings) => {
        setAiSettings({
          notificationsEnabled: settings.notificationsEnabled,
          schedule: settings.schedule || "DAILY",
          weekday: settings.weekday || "MONDAY",
          monthDay: settings.monthDay || 1,
          time: settings.time || "17:45",
          portfolioId: settings.portfolioId || "",
        });
        setPortfolioPositionSummaryMetrics(normalizePositionSummaryMetricIds(settings.portfolioPositionSummaryMetricIds));
        setHoldingsPositionSummaryMetrics(normalizePositionSummaryMetricIds(settings.holdingsPositionSummaryMetricIds));
      })
      .catch((error) => onError?.(String(error.message || error)));
  }, [isAuthenticated, onError]);

  function updateAiSetting(key, value) {
    setAiSettings((current) => ({
      ...current,
      [key]: value,
      portfolioId: key === "portfolioId" ? value : current.portfolioId || portfolioId,
    }));
  }

  async function saveAiSettings() {
    const targetPortfolioId = aiSettings.portfolioId || portfolioId;
    if (!targetPortfolioId) return;
    onError?.("");
    setAiSettingsBusy(true);
    try {
      const saved = await api.updateAiSettings({
        notificationsEnabled: aiSettings.notificationsEnabled,
        schedule: aiSettings.schedule,
        weekday: aiSettings.weekday,
        monthDay: aiSettings.monthDay,
        time: aiSettings.time,
        portfolioId: targetPortfolioId,
        portfolioPositionSummaryMetricIds: portfolioPositionSummaryMetrics,
        holdingsPositionSummaryMetricIds: holdingsPositionSummaryMetrics,
      });
      setAiSettings({
        notificationsEnabled: saved.notificationsEnabled,
        schedule: saved.schedule || "DAILY",
        weekday: saved.weekday || "MONDAY",
        monthDay: saved.monthDay || 1,
        time: saved.time || "17:45",
        portfolioId: saved.portfolioId || "",
      });
      setPortfolioPositionSummaryMetrics(normalizePositionSummaryMetricIds(saved.portfolioPositionSummaryMetricIds));
      setHoldingsPositionSummaryMetrics(normalizePositionSummaryMetricIds(saved.holdingsPositionSummaryMetricIds));
    } catch (error) {
      onError?.(String(error.message || error));
    } finally {
      setAiSettingsBusy(false);
    }
  }

  async function updatePositionSummaryMetrics(kind, nextMetricIds) {
    const normalized = normalizePositionSummaryMetricIds(nextMetricIds);
    const currentNormalized = kind === "portfolio"
      ? normalizePositionSummaryMetricIds(portfolioPositionSummaryMetrics)
      : normalizePositionSummaryMetricIds(holdingsPositionSummaryMetrics);
    if (normalized.length === currentNormalized.length && normalized.every((id, index) => id === currentNormalized[index])) {
      return;
    }
    onError?.("");
    if (kind === "portfolio") setPortfolioPositionSummaryMetrics(normalized);
    else setHoldingsPositionSummaryMetrics(normalized);
    try {
      const saved = await api.updateAiSettings({
        notificationsEnabled: aiSettings.notificationsEnabled,
        schedule: aiSettings.schedule,
        weekday: aiSettings.weekday,
        monthDay: aiSettings.monthDay,
        time: aiSettings.time,
        portfolioId: aiSettings.portfolioId,
        portfolioPositionSummaryMetricIds: kind === "portfolio" ? normalized : portfolioPositionSummaryMetrics,
        holdingsPositionSummaryMetricIds: kind === "holdings" ? normalized : holdingsPositionSummaryMetrics,
      });
      setAiSettings({
        notificationsEnabled: saved.notificationsEnabled,
        schedule: saved.schedule || "DAILY",
        weekday: saved.weekday || "MONDAY",
        monthDay: saved.monthDay || 1,
        time: saved.time || "17:45",
        portfolioId: saved.portfolioId || "",
      });
      setPortfolioPositionSummaryMetrics(normalizePositionSummaryMetricIds(saved.portfolioPositionSummaryMetricIds));
      setHoldingsPositionSummaryMetrics(normalizePositionSummaryMetricIds(saved.holdingsPositionSummaryMetricIds));
    } catch (error) {
      onError?.(String(error.message || error));
    }
  }

  async function fetchAiSummary(selectedPortfolioName = "") {
    const targetPortfolioId = aiSettings.portfolioId || portfolioId;
    if (!targetPortfolioId) return;
    onError?.("");
    setAiSummaryBusy(true);
    try {
      const response = await api.getAiSummary(targetPortfolioId);
      setAiSummary(response);
    } catch (error) {
      const targetPortfolioName = portfolios.find((portfolio) => portfolio.id === targetPortfolioId)?.name || selectedPortfolioName || "";
      if (String(error.message || error).includes("once per day")) {
        setAiSummary((current) => ({
          ...current,
          portfolioId: targetPortfolioId,
          portfolioName: targetPortfolioName || current?.portfolioName || "",
          nextAvailableAt: nextEtSummaryResetIso(),
          text: current?.text || "",
        }));
      }
      onError?.(String(error.message || error));
    } finally {
      setAiSummaryBusy(false);
    }
  }

  function resetAiWorkspace() {
    setAiSettings(DEFAULT_AI_SETTINGS);
    setAiSummary(null);
    setAiSummaryBusy(false);
    setAiSettingsBusy(false);
    setAiPortfolioInvestedById({});
    setPortfolioPositionSummaryMetrics(DEFAULT_POSITION_SUMMARY_METRICS);
    setHoldingsPositionSummaryMetrics(DEFAULT_POSITION_SUMMARY_METRICS);
  }

  return {
    aiSettings,
    aiSettingsBusy,
    aiSummary,
    aiSummaryBusy,
    fetchAiSummary,
    holdingsPositionSummaryMetrics,
    portfolioPositionSummaryMetrics,
    resetAiWorkspace,
    selectedAiHasInvestedPosition,
    setAiSummary,
    updateAiSetting,
    updatePositionSummaryMetrics,
    saveAiSettings,
  };
}
