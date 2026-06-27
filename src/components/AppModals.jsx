import React from "react";
import {PortfolioModal} from "./PortfolioModal";
import {PortfolioSelectionModal} from "./PortfolioSelectionModal";
import {AccountModal} from "./AccountModal";
import {ConfirmModal} from "./ConfirmModal";
import {PositionModal} from "./PositionModal";
import {TransactionModal} from "./TransactionModal";
import {TransactionUploadModal} from "./TransactionUploadModal";

export function AppModals({
  activeRawPositions,
  activeRawPositionsByPortfolio,
  authBusy,
  canWritePortfolio = () => true,
  currentUser,
  emailLinkForm,
  googleClientId,
  hasTelegramInitData,
  linkSession,
  modal,
  onClose,
  onCreateLinkCode,
  onCreatePortfolio,
  onCreatePosition,
  onCreateTransaction,
  onUploadTransactions,
  onDeletePortfolio,
  onDeletePosition,
  onDeleteTransaction,
  onEditPosition,
  onEditTransaction,
  onEmailLinkFieldChange,
  onGoogleCredential,
  onFamilyAccessChanged,
  onLinkEmail,
  onLinkTelegram,
  onRenamePortfolio,
  onApplyPortfolioSelection,
  portfolios,
  portfolioOptions,
  positionModalPositions,
  positionModalPositionsByPortfolio,
  portfolioId,
  portfolioName,
  selectedPortfolioIds,
  telegramLinkCode,
  onTelegramLinkCodeChange,
}) {
  const modalPortfolioId = modal?.data?.portfolioId || modal?.data?.portfolioContextId || portfolioId;
  const modalPortfolioLocked = Boolean(modal?.data?.lockedPortfolioId);
  const writablePortfolioOptions = portfolioOptions.filter((portfolio) => canWritePortfolio(portfolio.id));
  const modalPortfolioOptions = modalPortfolioLocked
    ? portfolioOptions
    : writablePortfolioOptions;

  return (
    <>
      {modal === "create-portfolio" ? <PortfolioModal mode="create" onClose={onClose} onSubmit={onCreatePortfolio} /> : null}
      {modal === "switch-portfolio" ? (
        <PortfolioSelectionModal
          onApply={onApplyPortfolioSelection}
          onClose={onClose}
          portfolioId={portfolioId}
          portfolios={portfolios}
          selectedPortfolioIds={selectedPortfolioIds}
        />
      ) : null}
      {modal === "account" ? (
        <AccountModal
          authBusy={authBusy}
          currentUser={currentUser}
          emailLinkForm={emailLinkForm}
          googleClientId={googleClientId}
          hasTelegramInitData={hasTelegramInitData}
          linkSession={linkSession}
          onClose={onClose}
          onCreateLinkCode={onCreateLinkCode}
          onFamilyAccessChanged={onFamilyAccessChanged}
          onEmailLinkFieldChange={onEmailLinkFieldChange}
          onGoogleCredential={onGoogleCredential}
          onLinkEmail={onLinkEmail}
          onLinkTelegram={onLinkTelegram}
          onTelegramLinkCodeChange={onTelegramLinkCodeChange}
          portfolios={portfolios}
          telegramLinkCode={telegramLinkCode}
        />
      ) : null}
      {modal?.type === "rename-portfolio" && modal.data ? (
        <PortfolioModal
          mode="edit"
          onClose={onClose}
          onSubmit={(payload) => onRenamePortfolio(payload, modal.data)}
          portfolio={modal.data}
        />
      ) : null}
      {modal?.type === "delete-portfolio" && modal.data ? (
        <ConfirmModal
          confirmLabel="Delete portfolio"
          onClose={onClose}
          onConfirm={() => onDeletePortfolio(modal.data)}
          subtitle={`Delete "${modal.data.name}" together with its positions and transactions?`}
          title="Delete portfolio"
        />
      ) : null}
      {modal === "position" ? (
        <PositionModal
          defaultPortfolioId={modalPortfolioId}
          mode="create"
          onClose={onClose}
          onSubmit={onCreatePosition}
          portfolioLocked={modalPortfolioLocked}
          portfolioOptions={modalPortfolioOptions}
          positions={positionModalPositions}
          positionsByPortfolio={positionModalPositionsByPortfolio}
        />
      ) : null}
      {modal === "watchlist" ? (
        <PositionModal
          defaultPortfolioId={modalPortfolioId}
          mode="create"
          onClose={onClose}
          onSubmit={onCreatePosition}
          portfolioLocked={modalPortfolioLocked}
          portfolioOptions={modalPortfolioOptions}
          positions={positionModalPositions}
          positionsByPortfolio={positionModalPositionsByPortfolio}
          variant="watchlist"
        />
      ) : null}
      {modal === "transaction" || modal?.type === "transaction" ? (
        <TransactionModal
          defaultPortfolioId={modalPortfolioId}
          mode="create"
          onClose={onClose}
          onSubmit={onCreateTransaction}
          positions={activeRawPositions}
          positionsByPortfolio={activeRawPositionsByPortfolio}
          portfolioLocked={modalPortfolioLocked}
          portfolioOptions={modalPortfolioOptions}
          transaction={modal?.type === "transaction" ? modal.data : null}
        />
      ) : null}
      {modal === "transaction-upload" ? (
        <TransactionUploadModal
          onClose={onClose}
          onSubmit={onUploadTransactions}
          portfolioId={portfolioId}
          portfolioName={portfolioName}
          positions={activeRawPositions}
        />
      ) : null}
      {modal?.type === "edit-position" ? (
        <PositionModal
          defaultPortfolioId={modalPortfolioId}
          mode="edit"
          onClose={onClose}
          onSubmit={onEditPosition}
          portfolioLocked={true}
          portfolioOptions={portfolioOptions}
          position={modal.data}
          positions={positionModalPositions}
          positionsByPortfolio={positionModalPositionsByPortfolio}
        />
      ) : null}
      {modal?.type === "delete-position" ? (
        <ConfirmModal
          confirmLabel="Delete position"
          onClose={onClose}
          onConfirm={() => onDeletePosition(modal.data)}
          subtitle={`Archive ${modal.data.ticker} from this portfolio?`}
          title="Delete position"
        />
      ) : null}
      {modal?.type === "edit-transaction" ? (
        <TransactionModal
          defaultPortfolioId={modalPortfolioId}
          mode="edit"
          onClose={onClose}
          onSubmit={onEditTransaction}
          positions={activeRawPositions}
          positionsByPortfolio={activeRawPositionsByPortfolio}
          portfolioLocked={true}
          portfolioOptions={portfolioOptions}
          transaction={modal.data}
        />
      ) : null}
      {modal?.type === "delete-transaction" ? (
        <ConfirmModal
          confirmLabel="Delete transaction"
          onClose={onClose}
          onConfirm={() => onDeleteTransaction(modal.data)}
          subtitle={`Delete ${modal.data.type} ${modal.data.ticker} from the transaction history?`}
          title="Delete transaction"
        />
      ) : null}
    </>
  );
}
