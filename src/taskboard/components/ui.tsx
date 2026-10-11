"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  ChevronDown,
  MoreHorizontal,
  ArrowDown,
  Minus,
  ChevronsUp,
  ArrowUp,
  CircleAlert,
  Inbox,
} from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import type { Priority, User } from "@/lib/types";

type TooltipPlacement = "top" | "bottom" | "left" | "right" | "bottom-end";

export function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button {...props} className={`btn btn-${variant} ${className}`}>
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  className = "",
  tooltipPlacement = "bottom",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tooltipPlacement?: TooltipPlacement;
}) {
  return (
    <button
      {...props}
      aria-label={label}
      data-tooltip={label}
      data-tooltip-placement={tooltipPlacement}
      className={`icon-button ${className}`}
    >
      {children}
    </button>
  );
}
type ActiveTooltip = {
  target: HTMLElement;
  content: string;
  placement: TooltipPlacement;
  x: number;
  y: number;
  ready: boolean;
};

export function TooltipLayer() {
  const [active, setActive] = useState<ActiveTooltip | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeTarget = useRef<HTMLElement | null>(null);
  const showTimer = useRef<number | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (showTimer.current !== null) window.clearTimeout(showTimer.current);
      showTimer.current = null;
    };
    const hide = () => {
      clearTimer();
      activeTarget.current = null;
      setActive(null);
    };
    const anchorFrom = (target: EventTarget | null) =>
      target instanceof Element
        ? (target.closest("[data-tooltip]") as HTMLElement | null)
        : null;
    const show = (target: HTMLElement) => {
      if (activeTarget.current === target) return;
      clearTimer();
      activeTarget.current = target;
      setActive(null);
      showTimer.current = window.setTimeout(() => {
        if (activeTarget.current !== target || !target.isConnected) return;
        const content = target.dataset.tooltip?.trim();
        if (!content) return;
        setActive({
          target,
          content,
          placement: (target.dataset.tooltipPlacement || "bottom") as TooltipPlacement,
          x: 0,
          y: 0,
          ready: false,
        });
      }, 280);
    };
    const onMouseOver = (event: MouseEvent) => {
      const target = anchorFrom(event.target);
      if (target) show(target);
    };
    const onMouseOut = (event: MouseEvent) => {
      const target = anchorFrom(event.target);
      if (!target || target !== activeTarget.current) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      hide();
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = anchorFrom(event.target);
      if (target) show(target);
    };
    const onFocusOut = (event: FocusEvent) => {
      const target = anchorFrom(event.target);
      if (!target || target !== activeTarget.current) return;
      if (event.relatedTarget instanceof Node && target.contains(event.relatedTarget)) return;
      hide();
    };

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("resize", hide);
    window.addEventListener("scroll", hide, true);
    return () => {
      clearTimer();
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("resize", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);

  useLayoutEffect(() => {
    if (!active || active.ready || !tooltipRef.current) return;
    if (!active.target.isConnected) {
      setActive(null);
      return;
    }
    const gap = 8;
    const edge = 8;
    const target = active.target.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    let placement = active.placement;
    if (placement === "bottom" && target.bottom + gap + tooltip.height > window.innerHeight)
      placement = "top";
    else if (placement === "top" && target.top - gap - tooltip.height < edge)
      placement = "bottom";
    else if (placement === "right" && target.right + gap + tooltip.width > window.innerWidth)
      placement = "left";
    else if (placement === "left" && target.left - gap - tooltip.width < edge)
      placement = "right";

    let x = target.left + (target.width - tooltip.width) / 2;
    let y = target.bottom + gap;
    if (placement === "top") y = target.top - tooltip.height - gap;
    if (placement === "right") {
      x = target.right + gap;
      y = target.top + (target.height - tooltip.height) / 2;
    }
    if (placement === "left") {
      x = target.left - tooltip.width - gap;
      y = target.top + (target.height - tooltip.height) / 2;
    }
    if (placement === "bottom-end") x = target.right - tooltip.width;
    x = Math.min(Math.max(edge, x), window.innerWidth - tooltip.width - edge);
    y = Math.min(Math.max(edge, y), window.innerHeight - tooltip.height - edge);
    setActive((current) =>
      current?.target === active.target
        ? { ...current, placement, x, y, ready: true }
        : current,
    );
  }, [active]);

  if (!active || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      className={`app-tooltip ${active.ready ? "visible" : ""}`}
      style={{ left: active.x, top: active.y }}
    >
      {active.content}
    </div>,
    document.body,
  );
}
export function Select({
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`custom-select ${className ? `${className}-shell` : ""}`}>
      <select {...props} className={className}>
        {children}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </span>
  );
}
export function AutoResizeTextarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    const height = Math.min(element.scrollHeight, 280);
    element.style.height = `${height}px`;
    element.style.overflowY = element.scrollHeight > 280 ? "auto" : "hidden";
  }, [props.value]);
  return <textarea {...props} ref={ref} className={`auto-resize-textarea ${className}`} />;
}
export function Badge({
  children,
  color,
  className = "",
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`badge ${className}`}
      style={
        color
          ? {
              color,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${color} 18%, transparent)`,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}
export function Avatar({
  user,
  size = 30,
  onClick,
  showStatus = false,
}: {
  user?: User;
  size?: number;
  onClick?: () => void;
  showStatus?: boolean;
}) {
  const name = user?.name || user?.username || "Unknown";
  const content = (
    <>
      <span
        className="avatar-image"
        style={{ background: user?.color || "#6b5b87" }}
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" />
        ) : (
          name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
        )}
      </span>
      {showStatus && (
        <span
          className={`presence presence-${user?.presence.replaceAll(" ", "-").toLowerCase()}`}
          aria-label={user?.presence}
        />
      )}
    </>
  );
  const style = { width: size, height: size, fontSize: size * 0.34 };
  return onClick ? (
    <button
      className="avatar"
      data-tooltip={`${name} · ${user?.role} · ${user?.presence}`}
      data-tooltip-placement="top"
      aria-label={`View ${name}'s profile`}
      style={style}
      onClick={onClick}
    >
      {content}
    </button>
  ) : (
    <span
      className="avatar"
      data-tooltip={`${name} · ${user?.role} · ${user?.presence}`}
      data-tooltip-placement="top"
      style={style}
    >
      {content}
    </span>
  );
}
export function AvatarGroup({
  users,
  onSelect,
  max = 4,
}: {
  users: User[];
  onSelect?: (id: string) => void;
  max?: number;
}) {
  return (
    <div className="avatar-group">
      {users.slice(0, max).map((user) => (
        <Avatar
          key={user.id}
          user={user}
          size={27}
          onClick={onSelect ? () => onSelect(user.id) : undefined}
        />
      ))}
      {users.length > max && (
        <span className="avatar avatar-extra">+{users.length - max}</span>
      )}
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const descriptionId = useId();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal ${className}`}
          aria-describedby={description ? descriptionId : undefined}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description id={descriptionId}>
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close dialog" tooltipPlacement="left">
                <X size={18} />
              </IconButton>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      className="confirm-modal"
    >
      <div className="modal-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
export function Menu({
  children,
  label = "More options",
  trigger,
}: {
  children: ReactNode;
  label?: string;
  trigger?: ReactNode;
}) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        {trigger ? (
          <button className="btn btn-secondary">
            {trigger}
            <ChevronDown size={13} />
          </button>
        ) : (
          <button
            className="icon-button"
            aria-label={label}
            data-tooltip={label}
            data-tooltip-placement="bottom-end"
          >
            <MoreHorizontal size={18} />
          </button>
        )}
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content className="dropdown" sideOffset={6} align="end">
          {children}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
export function MenuItem({
  children,
  onSelect,
  danger,
  disabled,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Dropdown.Item
      className={`menu-item ${danger ? "danger-text" : ""}`}
      onSelect={onSelect}
      disabled={disabled}
    >
      {children}
    </Dropdown.Item>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon || <Inbox size={28} />}</span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item}
          role="tab"
          tabIndex={item === value ? 0 : -1}
          onKeyDown={(event) => {
            const offset =
              event.key === "ArrowRight"
                ? 1
                : event.key === "ArrowLeft"
                  ? -1
                  : 0;
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : offset
                    ? (items.indexOf(item) + offset + items.length) %
                      items.length
                    : -1;
            if (next < 0) return;
            event.preventDefault();
            onChange(items[next]);
            (
              event.currentTarget.parentElement?.children[
                next
              ] as HTMLButtonElement
            )?.focus();
          }}
          aria-selected={item === value}
          className={item === value ? "active" : ""}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Task completion"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function PriorityBadge({
  priority,
  compact = false,
}: {
  priority: Priority;
  compact?: boolean;
}) {
  const Icon = {
    None: Minus,
    Low: ArrowDown,
    Medium: Minus,
    High: ArrowUp,
    Urgent: ChevronsUp,
  }[priority];
  return (
    <span
      className={`priority priority-${priority.toLowerCase()}`}
      aria-label={`${priority} priority`}
    >
      <Icon size={13} />
      {!compact && priority}
    </span>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? "on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span>{checked && <Check size={10} />}</span>
    </button>
  );
}
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <div className="inline-error" role="alert">
      <CircleAlert size={16} />
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}
