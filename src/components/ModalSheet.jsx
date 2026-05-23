import React from "react";
import { createPortal } from "react-dom";

export function ModalSheet({
  title,
  subtitle,
  children,
  headerActions,
  onClose,
  backdropClassName = "",
  className = "",
  hideDefaultClose = false,
}) {
  const content = (
    <div className={`modal-backdrop ${backdropClassName}`.trim()} onClick={onClose}>
      <div className={`modal-sheet ${className}`.trim()} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="modal-kicker">{title}</p>
            {subtitle ? <h3>{subtitle}</h3> : null}
          </div>
          <div className="modal-header-actions">
            {headerActions}
            {!hideDefaultClose ? <button className="modal-close" onClick={onClose} type="button">Close</button> : null}
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}
