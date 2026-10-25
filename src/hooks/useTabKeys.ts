import type { KeyboardEvent } from 'react';

/**
 * Arrow-key navigation for a `role="tablist"`: Left/Right (and Up/Down) move to the next or previous tab, Home and End
 * jump to the first and last, and the tab that receives focus is selected (automatic activation). Pair it with
 * `tabIndex={selected ? 0 : -1}` on each tab so the list is one Tab stop.
 */
export function onTablistKeyDown(e: KeyboardEvent<HTMLElement>) {
  const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(e.key)) return;
  const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'));
  const at = tabs.indexOf(document.activeElement as HTMLElement);
  if (at < 0 || tabs.length === 0) return;
  let next = at;
  if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = tabs.length - 1;
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (at + 1) % tabs.length;
  else next = (at - 1 + tabs.length) % tabs.length;
  e.preventDefault();
  tabs[next].focus();
  tabs[next].click();
}
