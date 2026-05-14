import React, {useEffect, useState} from "react";
import {ModalSheet} from "./ModalSheet";

export function PortfolioModal({mode, portfolio, onClose, onSubmit}) {
  const [name, setName] = useState(portfolio?.name || "");

  useEffect(() => {
    setName(portfolio?.name || "");
  }, [portfolio]);

  const title = mode === "edit" ? "Portfolio settings" : "New portfolio";
  const subtitle = mode === "edit" ? "Rename this portfolio and keep the workspace tidy." : "Create a new workspace for a strategy, account, or watchlist.";

  function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit({name: name.trim()});
  }

  return (
    <ModalSheet title={title} subtitle={subtitle} onClose={onClose}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input autoFocus placeholder="Portfolio MAKS" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button className="ghost" onClick={onClose} type="button">Cancel</button>
          <button className="primary" type="submit">{mode === "edit" ? "Save changes" : "Create portfolio"}</button>
        </div>
      </form>
    </ModalSheet>
  );
}
