import React from "react";
import {ModalSheet} from "./ModalSheet";

export function ConfirmModal({title, subtitle, confirmLabel, onClose, onConfirm}) {
  return (
    <ModalSheet title={title} subtitle={subtitle} onClose={onClose}>
      <div className="modal-actions">
        <button className="ghost" onClick={onClose} type="button">Cancel</button>
        <button className="danger" onClick={onConfirm} type="button">{confirmLabel}</button>
      </div>
    </ModalSheet>
  );
}
