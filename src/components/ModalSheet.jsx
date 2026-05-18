import React from "react";

export function ModalSheet({title, subtitle, children, headerActions, onClose}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-kicker">{title}</p>
            {subtitle ? <h3>{subtitle}</h3> : null}
          </div>
          <div className="modal-header-actions">
            {headerActions}
            <button className="modal-close" onClick={onClose} type="button">Close</button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
