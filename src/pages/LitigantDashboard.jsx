
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";


const styles = `
:root {
  --lit-navy-900: #0f2038;
  --lit-navy-800: #142943;
  --lit-navy-700: #1b3656;
  --lit-navy-600: #2a4d76;
  --lit-blue-600: #234f87;
  --lit-blue-700: #193d6c;
  --lit-blue-100: #e9eff8;
  --lit-blue-50: #f3f7fc;
  --lit-ink: #182b45;
  --lit-ink-soft: #475569;
  --lit-muted: #718096;
  --lit-border: #dfe6ef;
  --lit-bg: #f5f7fb;
  --lit-surface: #ffffff;
  --lit-danger: #d94848;
  --lit-success: #187346;
  --lit-warning: #946200;
  --lit-focus: #93baf0;
  --lit-shadow-sm: 0 1px 2px rgb(24 43 69 / 4%), 0 3px 12px rgb(24 43 69 / 4%);
  --lit-shadow-md: 0 6px 20px rgb(24 43 69 / 10%);
  --lit-shadow-lg: 0 18px 48px rgb(20 35 63 / 20%);
  --lit-radius: 14px;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

.lit-page {
  min-height: 100vh;
  display: flex;
  background:
    radial-gradient(1200px 400px at 100% -10%, #e6eefb 0%, transparent 60%),
    var(--lit-bg);
  color: var(--lit-ink);
  font-family: "Inter", "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ---------- Sidebar ---------- */
.lit-sidebar {
  width: 250px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  background: linear-gradient(180deg, var(--lit-navy-800) 0%, var(--lit-navy-900) 100%);
  color: #fff;
  padding: 30px 18px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #233b59;
}

.lit-brand {
  font-size: 21px;
  font-weight: 750;
  line-height: 1.4;
  padding: 0 12px 28px;
  margin-bottom: 18px;
  letter-spacing: -0.4px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.lit-brand small {
  display: block;
  margin-top: 5px;
  color: #aebfd5;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
}

.lit-nav {
  display: grid;
  gap: 6px;
}

.lit-nav a {
  position: relative;
  display: block;
  padding: 12px 14px 12px 18px;
  border: 1px solid transparent;
  border-radius: 10px;
  text-decoration: none;
  color: #c4d3e6;
  font-size: 14px;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.lit-nav a:hover {
  background: rgb(255 255 255 / 7%);
  color: #fff;
  transform: translateX(2px);
}

.lit-nav a.active {
  background: linear-gradient(90deg, #2f5784 0%, var(--lit-navy-600) 100%);
  border-color: #3d618c;
  color: #fff;
  font-weight: 650;
  box-shadow: 0 4px 12px rgb(0 0 0 / 18%);
}

.lit-nav a.active::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 50%;
  width: 3px;
  height: 18px;
  border-radius: 3px;
  background: #8fc0ff;
  transform: translateY(-50%);
}

.lit-sidebar-note {
  margin-top: auto;
  padding: 18px 12px 0;
  border-top: 1px solid rgb(255 255 255 / 8%);
  color: #aebfd5;
  font-size: 12px;
  line-height: 1.8;
}

/* ---------- Main ---------- */
.lit-main {
  flex: 1;
  min-width: 0;
  padding: 34px;
  max-width: 1400px;
}

.lit-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}

.lit-heading h1 {
  margin: 0;
  color: #183653;
  font-size: 29px;
  font-weight: 750;
  letter-spacing: -0.8px;
}

.lit-heading p {
  margin: 8px 0 0;
  color: var(--lit-muted);
  font-size: 14px;
}

.lit-profile {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--lit-surface);
  border: 1px solid var(--lit-border);
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #40536d;
  box-shadow: var(--lit-shadow-sm);
}

/* ---------- Welcome panel ---------- */
.lit-welcome {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #ffffff 0%, #f4f8fe 100%);
  border: 1px solid var(--lit-border);
  border-radius: var(--lit-radius);
  padding: 27px 27px 27px 31px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 24px;
  box-shadow: var(--lit-shadow-sm);
}

.lit-welcome::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, #3b74c0, var(--lit-blue-600));
}

.lit-welcome h2 {
  margin: 0 0 8px;
  color: #193957;
  font-size: 21px;
}

.lit-welcome p {
  margin: 0;
  max-width: 560px;
  color: var(--lit-muted);
  font-size: 14px;
  line-height: 1.7;
}

/* ---------- Buttons ---------- */
.lit-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--lit-blue-600);
  border-radius: 10px;
  padding: 12px 18px;
  background: linear-gradient(180deg, #2a5a97, var(--lit-blue-600));
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 650;
  cursor: pointer;
  transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
}

.lit-button:hover {
  background: var(--lit-blue-700);
  color: #fff;
  box-shadow: 0 6px 14px rgb(35 79 135 / 24%);
  transform: translateY(-1px);
}

.lit-button:active {
  transform: translateY(0);
  box-shadow: none;
}

.lit-button.secondary {
  background: #fff;
  color: var(--lit-blue-600);
  border-color: #c9d7ea;
}

.lit-button.secondary:hover {
  background: var(--lit-blue-50);
  color: var(--lit-blue-700);
}

.lit-button:focus-visible,
.lit-view-link:focus-visible,
.lit-nav a:focus-visible {
  outline: 3px solid var(--lit-focus);
  outline-offset: 3px;
}

.lit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* ---------- Statistics ---------- */
.lit-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 17px;
  margin-bottom: 27px;
}

.lit-stat {
  position: relative;
  overflow: hidden;
  min-width: 0;
  background: var(--lit-surface);
  border: 1px solid var(--lit-border);
  border-radius: 13px;
  padding: 22px;
  box-shadow: var(--lit-shadow-sm);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.lit-stat::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b74c0, #8fc0ff);
  opacity: 0;
  transition: opacity 0.18s ease;
}

.lit-stat:hover {
  transform: translateY(-3px);
  box-shadow: var(--lit-shadow-md);
  border-color: #cddbee;
}

.lit-stat:hover::after {
  opacity: 1;
}

.lit-stat-label {
  color: var(--lit-muted);
  font-size: 13px;
  font-weight: 600;
}

.lit-stat-value {
  display: block;
  margin-top: 12px;
  color: #193957;
  font-size: 31px;
  font-weight: 750;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

/* ---------- Sections ---------- */
.lit-section {
  min-width: 0;
  background: var(--lit-surface);
  border: 1px solid var(--lit-border);
  border-radius: var(--lit-radius);
  overflow: hidden;
  box-shadow: var(--lit-shadow-sm);
}

.lit-section-header {
  padding: 22px 22px 17px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.lit-section-header h2 {
  margin: 0;
  color: #193957;
  font-size: 18px;
  font-weight: 700;
}

/* ---------- Search ---------- */
.lit-search {
  width: min(100%, 300px);
  min-height: 42px;
  border: 1px solid #d5deea;
  border-radius: 10px;
  padding: 10px 13px 10px 38px;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E") no-repeat 13px center;
  color: var(--lit-ink);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.lit-search::placeholder {
  color: #94a3b8;
}

.lit-search:hover {
  border-color: #b9c8dc;
}

.lit-search:focus {
  border-color: #426fae;
  box-shadow: 0 0 0 3px rgb(66 111 174 / 14%);
}

/* ---------- Table ---------- */
.lit-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.lit-table {
  width: 100%;
  min-width: 740px;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.lit-table th {
  position: sticky;
  top: 0;
  background: #f4f7fb;
  color: #61718a;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.55px;
  font-weight: 750;
}

.lit-table th,
.lit-table td {
  padding: 16px 20px;
  border-top: 1px solid #e9eef5;
  white-space: nowrap;
}

.lit-table td {
  color: var(--lit-ink-soft);
}

.lit-table tbody tr {
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.lit-table tbody tr:nth-child(even) {
  background: #fbfcfe;
}

.lit-table tbody tr:hover {
  background: #f1f7ff;
  box-shadow: inset 3px 0 0 var(--lit-blue-600);
}

.lit-case-id {
  color: var(--lit-blue-600) !important;
  font-weight: 750;
}

.lit-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  background: var(--lit-blue-100);
  color: #31578d;
}

.lit-status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.lit-status.completed {
  background: #e3f6eb;
  color: var(--lit-success);
}

.lit-status.rejected {
  background: #fde9e9;
  color: #a52b2b;
}

.lit-status.pending {
  background: #fff2d7;
  color: var(--lit-warning);
}

.lit-view-link {
  display: inline-block;
  color: #245ca6;
  text-decoration: none;
  font-weight: 750;
  padding: 4px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.lit-view-link:hover {
  color: #173f78;
  border-bottom-color: currentColor;
}

/* ---------- Loading, empty, error ---------- */
.lit-message {
  padding: 36px 20px;
  text-align: center;
  color: var(--lit-muted);
  font-size: 14px;
  line-height: 1.7;
}

.lit-error {
  color: #b42318;
}

.lit-empty-action {
  margin-top: 15px;
}

.lit-skeleton {
  display: block;
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #eef2f8 25%, #f8fafd 50%, #eef2f8 75%);
  background-size: 200% 100%;
  animation: lit-shimmer 1.3s infinite linear;
}

@keyframes lit-shimmer {
  to {
    background-position: -200% 0;
  }
}

/* ---------- Privacy notice ---------- */
.lit-privacy {
  display: flex;
  gap: 10px;
  margin-top: 22px;
  padding: 16px 18px;
  border: 1px solid #d7e4f3;
  border-left: 4px solid #5b8ccc;
  background: #edf4fc;
  border-radius: 11px;
  color: #425b7d;
  font-size: 12px;
  line-height: 1.8;
}

.lit-section button {
  font-family: inherit;
}

.lit-section [role="alert"] {
  margin: 12px 18px;
  padding: 13px 15px;
  background: #fff0f0;
  border: 1px solid #f4cccc;
  border-radius: 9px;
  color: #8f2323;
}

.lit-section button:focus-visible,
.lit-search:focus-visible {
  outline: 3px solid var(--lit-focus);
  outline-offset: 2px;
}

/* =========================================================
   Header actions + Notifications
   ========================================================= */
.lit-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;
}

.lit-notification-wrap {
  position: relative;
  flex-shrink: 0;
}

/* Bell button */
.lit-bell-button {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px solid #dce4ef;
  border-radius: 12px;
  background: #fff;
  color: #234c89;
  font-size: 19px;
  cursor: pointer;
  box-shadow: 0 2px 5px rgb(20 35 63 / 6%);
  transition: background 0.18s ease, border-color 0.18s ease,
    box-shadow 0.18s ease, transform 0.12s ease;
}

.lit-bell-button:hover {
  background: #f0f5fc;
  border-color: #b3c8e6;
  box-shadow: 0 4px 12px rgb(35 79 135 / 14%);
}

.lit-bell-button:active {
  transform: scale(0.95);
}

.lit-bell-button[aria-expanded="true"],
.lit-bell-button.is-open {
  background: var(--lit-blue-600);
  border-color: var(--lit-blue-600);
  color: #fff;
  box-shadow: 0 6px 16px rgb(35 79 135 / 30%);
}

.lit-bell-button:focus-visible {
  outline: 3px solid var(--lit-focus);
  outline-offset: 3px;
}

/* Ring the bell when there is something new (add .has-new) */
.lit-bell-button.has-new {
  animation: lit-bell-ring 1.4s ease 0.3s 2;
  transform-origin: 50% 10%;
}

@keyframes lit-bell-ring {
  0%, 100% { transform: rotate(0); }
  10% { transform: rotate(14deg); }
  20% { transform: rotate(-12deg); }
  30% { transform: rotate(9deg); }
  40% { transform: rotate(-6deg); }
  50% { transform: rotate(3deg); }
  60% { transform: rotate(0); }
}

/* Unread badge */
.lit-notification-count {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  border-radius: 20px;
  background: linear-gradient(180deg, #ef5b5b, #d03a3a);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 2px 6px rgb(208 58 58 / 40%);
  animation: lit-badge-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.lit-notification-count::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  border: 2px solid rgb(217 72 72 / 50%);
  animation: lit-badge-pulse 2s ease-out infinite;
  pointer-events: none;
}

@keyframes lit-badge-pop {
  from { transform: scale(0); }
  to { transform: scale(1); }
}

@keyframes lit-badge-pulse {
  0% { transform: scale(1); opacity: 0.9; }
  70%, 100% { transform: scale(1.7); opacity: 0; }
}

/* Dropdown */
.lit-notification-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 50;
  width: min(390px, calc(100vw - 32px));
  max-height: 460px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--lit-border);
  border-radius: 16px;
  box-shadow: var(--lit-shadow-lg);
  transform-origin: top right;
  animation: lit-dropdown-in 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.1);
}

.lit-notification-dropdown::before {
  content: "";
  position: absolute;
  top: -6px;
  right: 15px;
  width: 12px;
  height: 12px;
  background: #fff;
  border-top: 1px solid var(--lit-border);
  border-left: 1px solid var(--lit-border);
  transform: rotate(45deg);
  z-index: 2;
}

@keyframes lit-dropdown-in {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.lit-notification-heading {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  background: #fff;
  border-bottom: 1px solid #edf0f5;
}

.lit-notification-heading strong {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #193957;
  font-size: 15px;
  font-weight: 700;
}

/* Small count chip next to the title */
.lit-notification-chip {
  padding: 2px 8px;
  border-radius: 20px;
  background: #fdeaea;
  color: #b42323;
  font-size: 11px;
  font-weight: 700;
}

.lit-notification-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.lit-clear-button,
.lit-mark-read-button {
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.lit-clear-button {
  color: #a52b2b;
}

.lit-clear-button:hover {
  background: #fff0f0;
}

.lit-mark-read-button {
  color: var(--lit-blue-600);
}

.lit-mark-read-button:hover {
  background: var(--lit-blue-100);
}

.lit-mark-read-button:disabled,
.lit-clear-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: transparent;
}

/* Optional filter tabs: All / Unread */
.lit-notification-tabs {
  display: flex;
  gap: 6px;
  padding: 10px 18px;
  background: #fafbfd;
  border-bottom: 1px solid #edf0f5;
}

.lit-notification-tab {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 20px;
  background: transparent;
  color: var(--lit-muted);
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.lit-notification-tab:hover {
  background: #eef3fa;
  color: #31578d;
}

.lit-notification-tab.active {
  background: var(--lit-blue-100);
  border-color: #cfdcf0;
  color: #1f4a82;
}

/* Scrollable list wrapper (optional; item list can sit directly too) */
.lit-notification-list {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #c5d2e4 transparent;
}

.lit-notification-list::-webkit-scrollbar,
.lit-notification-dropdown::-webkit-scrollbar {
  width: 8px;
}

.lit-notification-list::-webkit-scrollbar-thumb,
.lit-notification-dropdown::-webkit-scrollbar-thumb {
  background: #c5d2e4;
  border-radius: 8px;
  border: 2px solid #fff;
}

/* Notification item */
.lit-notification-item {
  position: relative;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  column-gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #edf0f5;
  cursor: default;
  transition: background 0.15s ease;
}

.lit-notification-item:hover {
  background: #f6f9fe;
}

.lit-notification-item:last-child {
  border-bottom: 0;
}

/* Fallback when markup has no icon element: content spans full width */
.lit-notification-item:not(:has(.lit-notification-icon)) {
  display: block;
}

.lit-notification-item.is-unread {
  background: #f3f8ff;
}

.lit-notification-item.is-unread::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 50%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2f6fd0;
  transform: translateY(-50%);
}

.lit-notification-icon {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--lit-blue-100);
  color: #31578d;
  font-size: 16px;
}

.lit-notification-icon.success { background: #e3f6eb; color: var(--lit-success); }
.lit-notification-icon.warning { background: #fff2d7; color: var(--lit-warning); }
.lit-notification-icon.danger { background: #fde9e9; color: #a52b2b; }

.lit-notification-item strong {
  display: block;
  color: #263b55;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.lit-notification-item p {
  margin: 4px 0 6px;
  color: #5f6f84;
  font-size: 12px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lit-notification-item small {
  color: #8491a3;
  font-size: 11px;
}

/* Per-item dismiss, appears on hover (optional markup) */
.lit-notification-dismiss {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #8a97a9;
  font-size: 15px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease;
}

.lit-notification-item:hover .lit-notification-dismiss,
.lit-notification-dismiss:focus-visible {
  opacity: 1;
}

.lit-notification-dismiss:hover {
  background: #e8eef7;
  color: #a52b2b;
}

.lit-notification-footer {
  padding: 11px 18px;
  border-top: 1px solid #edf0f5;
  background: #fafbfd;
  text-align: center;
}

.lit-notification-footer a {
  color: #245ca6;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.lit-notification-footer a:hover {
  text-decoration: underline;
}

.lit-notification-empty {
  padding: 38px 20px;
  color: var(--lit-muted);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

.lit-notification-empty::before {
  content: "\\1F514";
  display: block;
  margin-bottom: 8px;
  font-size: 28px;
  opacity: 0.45;
}

/* Register button */
.lit-register-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border: 1px solid var(--lit-blue-600);
  border-radius: 10px;
  background: linear-gradient(180deg, #2a5a97, #234c89);
  color: #fff;
  text-decoration: none;
  font-size: 13px;
  font-weight: 650;
  white-space: nowrap;
  transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
}

.lit-register-button:hover {
  background: #193b70;
  box-shadow: 0 6px 14px rgb(35 79 135 / 24%);
  transform: translateY(-1px);
}

.lit-register-button:active {
  transform: translateY(0);
}

.lit-register-button:focus-visible,
.lit-clear-button:focus-visible,
.lit-mark-read-button:focus-visible,
.lit-notification-tab:focus-visible {
  outline: 3px solid var(--lit-focus);
  outline-offset: 2px;
}

/* ---------- Responsive ---------- */
@media (max-width: 1000px) {
  .lit-sidebar {
    width: 220px;
  }

  .lit-main {
    padding: 25px;
  }

  .lit-stats {
    gap: 12px;
  }

  .lit-stat {
    padding: 18px;
  }
}

@media (max-width: 700px) {
  .lit-page {
    display: block;
  }

  .lit-sidebar {
    position: static;
    width: 100%;
    height: auto;
    padding: 18px;
  }

  .lit-brand {
    padding: 0 5px 16px;
    margin-bottom: 14px;
  }

  .lit-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lit-sidebar-note {
    display: none;
  }

  .lit-main {
    padding: 20px 14px;
  }

  .lit-heading h1 {
    font-size: 24px;
  }

  .lit-topbar {
    align-items: flex-start;
  }

  .lit-stats {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .lit-stat {
    padding: 18px;
  }

  .lit-stat-value {
    font-size: 26px;
  }

  .lit-welcome {
    padding: 20px 20px 20px 24px;
  }

  .lit-section-header {
    padding: 18px;
  }

  .lit-search {
    width: 100%;
  }
}

@media (max-width: 650px) {
  .lit-header-actions {
    width: 100%;
    justify-content: space-between;
    margin-left: 0;
  }

  /* On phones the dropdown becomes a bottom-anchored sheet */
  .lit-notification-wrap {
    position: static;
  }

  .lit-notification-dropdown {
    position: fixed;
    left: 12px;
    right: 12px;
    top: auto;
    bottom: 12px;
    width: auto;
    max-height: 70vh;
    transform-origin: bottom center;
  }

  .lit-notification-dropdown::before {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`;




function getStatusClass(status = "") {
  const value = String(status).toLowerCase();

  if (value.includes("complete") || value.includes("approved")) {
    return "completed";
  }

  if (value.includes("reject")) {
    return "rejected";
  }

  if (value.includes("pending") || value.includes("review")) {
    return "pending";
  }

  return "";
}

export default function LitigantDashboard() {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [clearingNotifications, setClearingNotifications] = useState(false);
 

  useEffect(() => {
    let cancelled = false;

    async function loadCases() {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const notificationResponse = await fetch(`${API_URL}/notifications`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (notificationResponse.ok) {
          const notificationData = await notificationResponse.json();

          if (!cancelled) {
            setNotifications(
              Array.isArray(notificationData)
                ? notificationData
                : notificationData.notifications || []
            );
            setNotificationError("");
          }
        } else if (
          notificationResponse.status !== 401 &&
          notificationResponse.status !== 403
        ) {
          if (!cancelled) {
            setNotificationError("Unable to load notifications.");
          }
        }

        const response = await fetch(`${API_URL}/cases`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("accessToken");

          if (!cancelled) {
            navigate("/login", { replace: true });
          }
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load your cases. Please try again.");
        }

        const data = await response.json();

        if (!cancelled) {
          setCases(Array.isArray(data) ? data : data.cases || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Something went wrong while loading cases.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCases();

    const refreshInterval = window.setInterval(() => {
      loadCases();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
    };
  }, [navigate]);


  async function clearNotifications() {
  const token = localStorage.getItem("accessToken");

  if (!token || clearingNotifications || notifications.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    "Clear all notifications from your account?"
  );

  if (!confirmed) return;

  try {
    setClearingNotifications(true);
    setNotificationError("");

    const response = await fetch(`${API_URL}/notifications`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unable to clear notifications. Please try again.");
    }

    setNotifications([]);
    setNotificationsOpen(false);
  } catch (err) {
    setNotificationError(
      err.message || "Unable to clear notifications."
    );
  } finally {
    setClearingNotifications(false);
  }
}

  const normalizedSearch = search.trim().toLowerCase();

  const filteredCases = cases.filter((item) => {
    const searchable = [
      item.case_id,
      item.caseId,
      item.id,
      item.case_type,
      item.caseType,
      item.petitioner,
      item.respondent,
      item.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });

  const totalCases = cases.length;

const completedCases = cases.filter((item) => {
  const status = String(item.status || "").trim().toLowerCase();
  const stage = String(item.workflowStage || "").trim().toLowerCase();

  return (
    status.includes("complete") ||
    stage === "completed" ||
    stage === "case closed"
  );
}).length;

const activeCases = cases.filter((item) => {
  const status = String(item.status || "").trim().toLowerCase();
  const stage = String(item.workflowStage || "").trim().toLowerCase();

  return !(
    status.includes("complete") ||
    stage === "completed" ||
    stage === "case closed"
  );
}).length;

  function getCaseId(item) {
    return item.case_id || item.caseId || item.id;
  }

  function getCaseType(item) {
    return item.case_type || item.caseType || "Not specified";
  }

  function getCreatedDate(item) {
    const date = item.created_at || item.createdAt || item.filing_date;

    if (!date) return "—";

    const parsed = new Date(date);

    return Number.isNaN(parsed.getTime())
      ? String(date)
      : parsed.toLocaleDateString("en-IN");
  }

  return (
    <>
      <style>{styles}</style>

      <div className="lit-page">
        <aside className="lit-sidebar">
          <div className="lit-brand">
            Case Portal
            <small>Litigant workspace</small>
          </div>

          <nav className="lit-nav">
            <Link to="/litigant" className="active">
              Overview
            </Link>

            <Link to="/cases">
              My Cases
            </Link>

            <Link to="/new-case">
              Register a Case
            </Link>

          </nav>

          <div className="lit-sidebar-note">
            Your cases and documents should remain accessible only to
            authorized users.
          </div>
        </aside>

        <main className="lit-main">
<header className="lit-topbar">
  <div className="lit-heading">
    <h1>Litigant Dashboard</h1>
    <p>Manage your registered cases and track their progress.</p>
  </div>

  <div className="lit-header-actions">
    <div className="lit-notification-wrap">
      <button
        type="button"
        className="lit-bell-button"
        onClick={() => setNotificationsOpen((open) => !open)}
        aria-expanded={notificationsOpen}
        aria-label={`Notifications, ${notifications.length} total`}
        title="Notifications"
      >
        <span aria-hidden="true">🔔</span>

        {notifications.length > 0 && (
          <span className="lit-notification-count">
            {notifications.length > 99 ? "99+" : notifications.length}
          </span>
        )}
      </button>

      {notificationsOpen && (
        <div className="lit-notification-dropdown">
          <div className="lit-notification-heading">
            <strong>Notifications</strong>

            {notifications.length > 0 && (
              <button
                type="button"
                className="lit-clear-button"
                onClick={clearNotifications}
                disabled={clearingNotifications}
              >
                {clearingNotifications ? "Clearing..." : "Clear all"}
              </button>
            )}
          </div>

          {notificationError && (
            <div className="lit-notification-empty" role="alert">
              {notificationError}
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="lit-notification-empty">
              No notifications yet. Case updates and hearing reminders will
              appear here.
            </div>
          ) : (
            notifications.map((notification, index) => (
              <div
                className="lit-notification-item"
                key={notification.id || index}
              >
                <strong>{notification.title || "Case update"}</strong>
                <p>
                  {notification.message ||
                    notification.body ||
                    "A case update is available."}
                </p>

                {(notification.createdAt || notification.created_at) && (
                  <small>
                    {new Date(
                      notification.createdAt || notification.created_at
                    ).toLocaleString("en-IN")}
                  </small>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>

    <div className="lit-profile">Litigant Account</div>
  </div>
</header>

<section className="lit-welcome">
  <div>
    <h2>Welcome to your case workspace</h2>
    <p>
      Register a new case and follow its progress from your dashboard.
    </p>
  </div>

  <Link className="lit-register-button" to="/new-case">
    <span aria-hidden="true">+</span>
    Register a Case
  </Link>
</section>


               

          <section className="lit-stats">
            <div className="lit-stat">
              <span className="lit-stat-label">Total Cases</span>
              <strong className="lit-stat-value">
                {loading ? "—" : totalCases}
              </strong>
            </div>

            <div className="lit-stat">
              <span className="lit-stat-label">Active Cases</span>
              <strong className="lit-stat-value">
                {loading ? "—" : activeCases}
              </strong>
            </div>

            <div className="lit-stat">
              <span className="lit-stat-label">Completed Cases</span>
              <strong className="lit-stat-value">
                {loading ? "—" : completedCases}
              </strong>
            </div>
          </section>

          <section className="lit-section">
            <div className="lit-section-header">
              <h2>My Cases</h2>

              <input
                className="lit-search"
                type="search"
                placeholder="Search cases..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search cases"
              />
            </div>

            {loading ? (
              <div className="lit-message">Loading your cases...</div>
            ) : error ? (
              <div className="lit-message lit-error">
                <p>{error}</p>
                <button
                  className="lit-button"
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="lit-message">
                {cases.length === 0 ? (
                  <>
                    <p>You have not registered any cases yet.</p>
                    <Link
                      className="lit-button lit-empty-action"
                      to="/new-case"
                    >
                      Register Your First Case
                    </Link>
                  </>
                ) : (
                  <p>No cases match your search.</p>
                )}
              </div>
            ) : (
              <div className="lit-table-wrap">
                <table className="lit-table">
                  <thead>
                    <tr>
                      <th>Case ID</th>
                      <th>Case Type</th>
                      <th>Petitioner</th>
                      <th>Respondent</th>
                      <th>Registered</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCases.map((item) => {
                      const caseId = getCaseId(item);
                      const status = item.status || "Registered";

                      return (
                        <tr key={caseId}>
                          <td className="lit-case-id">{caseId || "—"}</td>
                          <td>{getCaseType(item)}</td>
                          <td>{item.petitioner || "—"}</td>
                          <td>{item.respondent || "—"}</td>
                          <td>{getCreatedDate(item)}</td>
                          <td>
                            <span
                              className={`lit-status ${getStatusClass(status)}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td>
                            {caseId ? (
                              <Link
                                className="lit-view-link"
                                to={`/cases/${encodeURIComponent(caseId)}`}
                              >
                                View
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="lit-privacy">
            <strong>Privacy and human review:</strong> This dashboard displays
            cases returned by the backend for your authenticated account.
            AI-generated priority and hearing recommendations are advisory;
            authorized human review is required before final decisions.
          </div>
        </main>
      </div>
    </>
  );
}
