import { config } from "../config.js";
import type { PlatformCatalog, PublishedEndpoint, ServiceDefinition } from "./catalog.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function serviceIcon(id: string): string {
  switch (id) {
    case "weather":
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
    case "chat":
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.4V20l3-2 3 2v-2.6c2.9-1.1 5-4 5-7.4a8 8 0 0 0-8-8z"/><circle cx="10" cy="10" r="1"/><circle cx="14" cy="10" r="1"/></svg>`;
    case "image":
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
    default:
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}

function serviceAccentColor(id: string): string {
  switch (id) {
    case "weather":
      return "#7de2d1";
    case "chat":
      return "#a78bfa";
    case "image":
      return "#f472b6";
    default:
      return "#7de2d1";
  }
}

const sharedStyles = `
:root {
  color-scheme: dark;
  --bg: #06090f;
  --bg-elevated: #0c1219;
  --surface: rgba(14, 22, 33, 0.7);
  --surface-strong: rgba(18, 28, 42, 0.85);
  --border: rgba(126, 170, 194, 0.12);
  --border-hover: rgba(126, 170, 194, 0.25);
  --border-accent: rgba(125, 226, 209, 0.3);
  --text: #f0f6fc;
  --text-secondary: #8b9eb7;
  --text-tertiary: #5a6f87;
  --accent: #7de2d1;
  --accent-bright: #5eead4;
  --accent-warm: #fbbf24;
  --purple: #a78bfa;
  --pink: #f472b6;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: 'Space Grotesk', var(--font-sans);
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; }

html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }

body {
  font-family: var(--font-sans);
  color: var(--text);
  background: var(--bg);
  min-height: 100vh;
  line-height: 1.6;
  overflow-x: hidden;
}

/* Ambient background */
.bg-glow {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.bg-glow::before {
  content: '';
  position: absolute;
  top: -20%;
  left: -10%;
  width: 60%;
  height: 60%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(125, 226, 209, 0.08), transparent 65%);
  animation: drift 20s ease-in-out infinite alternate;
}
.bg-glow::after {
  content: '';
  position: absolute;
  bottom: -15%;
  right: -10%;
  width: 50%;
  height: 50%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.06), transparent 65%);
  animation: drift 25s ease-in-out infinite alternate-reverse;
}
@keyframes drift {
  0% { transform: translate(0, 0); }
  100% { transform: translate(40px, -30px); }
}

/* Grid overlay */
.bg-grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent);
}

a { color: inherit; text-decoration: none; }

.container {
  width: min(1200px, 100% - 32px);
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

/* ── Navigation ── */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(125, 226, 209, 0.15), rgba(167, 139, 250, 0.15));
  border: 1px solid var(--border-accent);
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--accent);
  line-height: 1;
  gap: 1px;
}

.logo-icon .logo-xlm {
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.logo-icon .logo-402 {
  font-size: 13px;
  letter-spacing: 0.02em;
}

.logo-text {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
}

.logo-text .logo-gradient {
  background: linear-gradient(135deg, var(--accent), var(--purple), var(--pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-text .logo-dot-com {
  color: var(--text);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-links a {
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 200ms var(--ease);
}

.nav-links a:hover {
  color: var(--text);
  background: rgba(255,255,255,0.04);
}

.nav-links a.active {
  color: var(--text);
  background: rgba(255,255,255,0.06);
}

/* ── Hero ── */
.hero {
  padding: 80px 0 60px;
  text-align: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px 6px 8px;
  border-radius: 999px;
  background: rgba(125, 226, 209, 0.08);
  border: 1px solid rgba(125, 226, 209, 0.2);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 28px;
}

.hero-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(125,226,209,0.4); }
  50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(125,226,209,0); }
}

.hero h1 {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.05;
  max-width: 800px;
  margin: 0 auto 24px;
}

.hero h1 .gradient-text {
  background: linear-gradient(135deg, var(--accent), var(--purple), var(--pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto 40px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.04);
  color: var(--text);
  cursor: pointer;
  transition: all 200ms var(--ease);
  text-decoration: none;
}

.btn:hover {
  transform: translateY(-1px);
  border-color: var(--border-hover);
  background: rgba(255,255,255,0.06);
  box-shadow: 0 4px 24px rgba(0,0,0,0.3);
}

.btn-primary {
  background: linear-gradient(135deg, rgba(125,226,209,0.2), rgba(167,139,250,0.15));
  border-color: rgba(125,226,209,0.35);
}

.btn-primary:hover {
  border-color: rgba(125,226,209,0.5);
  box-shadow: 0 4px 24px rgba(125,226,209,0.15);
}

/* ── Stats bar ── */
.stats-bar {
  display: flex;
  justify-content: center;
  gap: 48px;
  padding: 40px 0;
  margin: 20px 0 40px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.stat {
  text-align: center;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── Section ── */
.section {
  padding: 60px 0;
}

.section-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 16px;
}

.section-title {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin-bottom: 12px;
}

.section-subtitle {
  color: var(--text-secondary);
  max-width: 600px;
  margin-bottom: 36px;
  line-height: 1.7;
}

/* ── Service Cards (catalogue grid) ── */
.catalogue-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px;
}

.service-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 28px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  backdrop-filter: blur(16px);
  transition: all 300ms var(--ease);
  cursor: pointer;
  text-decoration: none;
  overflow: hidden;
}

.service-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--card-accent);
  opacity: 0;
  transition: opacity 300ms var(--ease);
}

.service-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(125,226,209,0.08);
}

.service-card:hover::before {
  opacity: 1;
}

.service-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  margin-bottom: 20px;
  border: 1px solid var(--border);
  color: var(--card-accent);
  background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
}

.service-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.service-card h3 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.service-card-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.65;
  flex: 1;
  margin-bottom: 20px;
}

.service-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.03);
  color: var(--text-secondary);
}

.tag-network {
  border-color: rgba(125,226,209,0.25);
  color: var(--accent);
  background: rgba(125,226,209,0.06);
}

.tag-price {
  border-color: rgba(251,191,36,0.25);
  color: var(--accent-warm);
  background: rgba(251,191,36,0.06);
}

.service-card-arrow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  transition: color 200ms var(--ease);
}

.service-card:hover .service-card-arrow {
  color: var(--accent);
}

.service-card-arrow svg {
  transition: transform 200ms var(--ease);
}

.service-card:hover .service-card-arrow svg {
  transform: translateX(4px);
}

/* ── How It Works ── */
.how-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.how-step {
  padding: 24px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
}

.how-step-number {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  background: rgba(125,226,209,0.1);
  border: 1px solid rgba(125,226,209,0.2);
  color: var(--accent);
  margin-bottom: 16px;
}

.how-step h4 {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.how-step p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* ── Integration panel ── */
.integration-panel {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 36px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: center;
}

.integration-panel h3 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.integration-panel p {
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 20px;
}

.integration-panel ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.integration-panel li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.integration-panel li::before {
  content: '';
  margin-top: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.code-block {
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: #080d14;
  overflow: hidden;
}

.code-block-header {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-block-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.code-block-label {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  margin-left: 4px;
}

.code-block pre {
  margin: 0;
  padding: 20px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.7;
  color: #b0c4de;
  overflow-x: auto;
}

.code-block .kw { color: var(--purple); }
.code-block .str { color: var(--accent); }
.code-block .comment { color: var(--text-tertiary); }
.code-block .num { color: var(--accent-warm); }

/* ── Footer ── */
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32px 0 48px;
  border-top: 1px solid var(--border);
  margin-top: 40px;
  gap: 16px;
  flex-wrap: wrap;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

.footer-links {
  display: flex;
  gap: 20px;
  font-size: 0.85rem;
}

.footer-links a {
  color: var(--text-tertiary);
  transition: color 200ms;
}

.footer-links a:hover { color: var(--text); }

/* ── Service Detail Page ── */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 24px;
  transition: color 200ms;
}

.back-link:hover { color: var(--text); }

.service-hero {
  padding: 48px 0 32px;
}

.service-hero-inner {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.service-hero-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.service-hero h1 {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  margin-bottom: 8px;
}

.service-hero p {
  color: var(--text-secondary);
  max-width: 600px;
  line-height: 1.7;
}

.service-highlights {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 16px;
}

/* ── Endpoint Cards ── */
.endpoints-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.endpoint-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  overflow: hidden;
  transition: border-color 200ms;
}

.endpoint-card:hover {
  border-color: var(--border-hover);
}

.endpoint-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  cursor: pointer;
  gap: 16px;
}

.endpoint-card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.method-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.method-GET {
  background: rgba(125,226,209,0.12);
  color: var(--accent);
  border: 1px solid rgba(125,226,209,0.2);
}

.method-POST {
  background: rgba(167,139,250,0.12);
  color: var(--purple);
  border: 1px solid rgba(167,139,250,0.2);
}

.endpoint-path {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.endpoint-card-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.endpoint-expand {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  transition: all 200ms;
}

.endpoint-card[open] .endpoint-expand {
  transform: rotate(180deg);
}

.endpoint-card-body {
  padding: 0 24px 24px;
  border-top: 1px solid var(--border);
}

.endpoint-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding-top: 20px;
  margin-bottom: 20px;
  line-height: 1.65;
}

.endpoint-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.endpoint-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.endpoint-params {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.endpoint-params li {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
}

.try-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.try-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(125,226,209,0.3);
  background: rgba(125,226,209,0.08);
  color: var(--accent);
  cursor: pointer;
  transition: all 200ms var(--ease);
  font-family: var(--font-sans);
}

.try-btn:hover {
  background: rgba(125,226,209,0.15);
  border-color: rgba(125,226,209,0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(125,226,209,0.1);
}

.try-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.try-result {
  margin-top: 16px;
  display: none;
}

.try-result.visible { display: block; }

.try-result pre {
  margin: 0;
  padding: 16px;
  border-radius: var(--radius-sm);
  background: #080d14;
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.6;
  color: #b0c4de;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.try-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

.try-status.status-402 { color: var(--accent-warm); }
.try-status.status-200 { color: var(--accent); }
.try-status.status-error { color: var(--pink); }

/* ── Docs page extras ── */
.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.filter-btn {
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.03);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 200ms;
  font-family: var(--font-sans);
}

.filter-btn:hover {
  border-color: var(--border-hover);
  color: var(--text);
}

.filter-btn[aria-pressed="true"] {
  border-color: rgba(125,226,209,0.35);
  background: rgba(125,226,209,0.08);
  color: var(--accent);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero { padding: 48px 0 40px; }
  .hero h1 { font-size: 2.2rem; }
  .stats-bar { gap: 24px; }
  .catalogue-grid { grid-template-columns: 1fr; }
  .integration-panel {
    grid-template-columns: 1fr;
    padding: 24px;
  }
  .endpoint-grid { grid-template-columns: 1fr; }
  .nav { flex-wrap: wrap; }
  .nav-links { display: none; }
  .mobile-menu-toggle { display: flex; }
  .endpoint-card-header { flex-direction: column; align-items: flex-start; }
  .endpoint-card-right { width: 100%; justify-content: space-between; }
  .how-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .container { width: calc(100% - 24px); }
  .service-card { padding: 20px; }
  .hero h1 { font-size: 1.9rem; }
  .hero-subtitle { font-size: 1rem; }
  .service-hero-inner { flex-direction: column; }
}

/* ── Hamburger / Mobile Menu ── */
.mobile-menu-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(255,255,255,0.03);
  color: var(--text-secondary);
  cursor: pointer;
}

@media (max-width: 768px) {
  .mobile-menu-toggle { display: flex; }
  .nav-links {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    flex-direction: column;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 8px;
    min-width: 180px;
    z-index: 100;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  }
  .nav-links.open { display: flex; }
  .nav { position: relative; }
}
`;

function renderNav(activePage: string) {
  return `
    <nav class="nav">
      <a class="logo" href="/">
        <div class="logo-icon"><span class="logo-xlm">xlm</span><span class="logo-402">402</span></div>
        <span class="logo-text"><span class="logo-gradient">xlm402</span><span class="logo-dot-com">.com</span></span>
      </a>
      <button class="mobile-menu-toggle" onclick="document.querySelector('.nav-links').classList.toggle('open')" aria-label="Toggle menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
      <div class="nav-links">
        <a href="/"${activePage === "home" ? ' class="active"' : ""}>Catalogue</a>
        <a href="/docs"${activePage === "docs" ? ' class="active"' : ""}>Docs</a>
        <a href="/api/catalog">API</a>
        <a href="/.well-known/x402">x402</a>
      </div>
    </nav>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-left">
        <span>xlm402.com</span>
        <span>&middot;</span>
        <span>x402 services on Stellar</span>
      </div>
      <div class="footer-links">
        <a href="/docs">Docs</a>
        <a href="/api/catalog">API</a>
        <a href="/health">Health</a>
      </div>
    </footer>
  `;
}

function layout({
  title,
  description,
  body,
}: {
  title: string;
  description: string;
  body: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/gh/jamesbachini/Stellar-Wallets-Kit-Boilerplate@main/vanilla/stellar-kit-bundle/dist/wallet-kit-bundle.umd.js"></script>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="bg-grid"></div>
    ${body}
  </body>
</html>`;
}

function renderServiceCard(service: ServiceDefinition, catalog: PlatformCatalog) {
  const endpoints = catalog.publishedEndpoints.filter(
    (ep) => ep.serviceId === service.id,
  );
  const networks = Array.from(new Set(endpoints.map((ep) => ep.network)));
  const prices = Array.from(new Set(endpoints.map((ep) => ep.priceUsd)));
  const accent = serviceAccentColor(service.id);

  return `
    <a href="/services/${escapeHtml(service.id)}" class="service-card" style="--card-accent: ${accent}">
      <div class="service-card-icon" style="color: ${accent}; background: linear-gradient(135deg, ${accent}15, ${accent}08);">
        ${serviceIcon(service.id)}
      </div>
      <div class="service-card-header">
        <h3>${escapeHtml(service.name)}</h3>
      </div>
      <p class="service-card-desc">${escapeHtml(service.tagline)}</p>
      <div class="service-card-meta">
        ${networks.map((n) => `<span class="tag tag-network">${escapeHtml(n)}</span>`).join("")}
        ${prices.map((p) => `<span class="tag tag-price">from $${escapeHtml(p)} USD</span>`).join("")}
        <span class="tag">${endpoints.length} endpoint${endpoints.length === 1 ? "" : "s"}</span>
      </div>
      <div class="service-card-arrow">
        <span>Explore &amp; purchase</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </a>
  `;
}

export function renderIndexPage(catalog: PlatformCatalog) {
  const liveServices = catalog.services;

  return layout({
    title: "xlm402.com | x402 Service Catalogue on Stellar",
    description:
      "Browse and purchase premium API services with x402 payments on Stellar. Weather intelligence, AI inference, and image generation.",
    body: `
      <div class="container">
        ${renderNav("home")}

        <section class="hero">
          <div class="hero-badge">
            <span class="dot"></span>
            Live on Stellar
          </div>
          <h1>The <span class="gradient-text">x402 service catalogue</span> for Stellar</h1>
          <p class="hero-subtitle">
            Browse premium APIs, pay with USDC or XLM on Stellar, and get instant access.
            Built for developers, AI agents, and automated workflows.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#catalogue">Browse catalogue</a>
            <a class="btn" href="/docs">Read the docs</a>
          </div>
        </section>

        <div class="stats-bar">
          <div class="stat">
            <div class="stat-value">${catalog.publishedEndpoints.length}</div>
            <div class="stat-label">Paid Endpoints</div>
          </div>
          <div class="stat">
            <div class="stat-value">${liveServices.length}</div>
            <div class="stat-label">Services</div>
          </div>
          <div class="stat">
            <div class="stat-value">2</div>
            <div class="stat-label">Networks</div>
          </div>
          <div class="stat">
            <div class="stat-value">USDC or XLM</div>
            <div class="stat-label">Payment Assets</div>
          </div>
        </div>

        <section class="section" id="catalogue">
          <div class="section-label">Service Catalogue</div>
          <h2 class="section-title">Premium APIs, pay-per-call</h2>
          <p class="section-subtitle">
            Each service is protected by the x402 payment protocol. Connect your Freighter wallet,
            call an endpoint, and pay only for what you use.
          </p>
          <div class="catalogue-grid">
            ${liveServices.map((s) => renderServiceCard(s, catalog)).join("")}
          </div>
        </section>

        <section class="section">
          <div class="section-label">How It Works</div>
          <h2 class="section-title">Three steps to paid API access</h2>
          <p class="section-subtitle">
            The x402 protocol turns HTTP 402 into a native payment flow. No API keys, no subscriptions.
          </p>
          <div class="how-grid">
            <div class="how-step">
              <div class="how-step-number">1</div>
              <h4>Call any endpoint</h4>
              <p>Make a standard HTTP request to any paid route. The server responds with 402 Payment Required and payment details.</p>
            </div>
            <div class="how-step">
              <div class="how-step-number">2</div>
              <h4>Sign with Freighter</h4>
              <p>Your wallet creates a USDC or XLM payment on Stellar. The signed transaction is attached to the retry request.</p>
            </div>
            <div class="how-step">
              <div class="how-step-number">3</div>
              <h4>Get your response</h4>
              <p>The facilitator verifies the payment and the server returns the API response. Instant, one-call settlement.</p>
            </div>
          </div>
        </section>

        <section class="section">
          <div class="integration-panel">
            <div>
              <div class="section-label">For Developers & AI Agents</div>
              <h3>Machine-readable discovery</h3>
              <p>Every service publishes structured metadata so AI agents and automation can discover, evaluate, and purchase API access programmatically.</p>
              <ul>
                <li><code>/.well-known/x402</code> &mdash; Full payment metadata for all routes</li>
                <li><code>/api/catalog</code> &mdash; Service definitions, pricing, and schemas</li>
                <li><code>/supported</code> &mdash; Facilitator capabilities per network</li>
                <li><code>/health</code> &mdash; Platform availability and status</li>
              </ul>
            </div>
            <div class="code-block">
              <div class="code-block-header">
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <span class="code-block-label">discovery.sh</span>
              </div>
              <pre><span class="comment"># Discover available services</span>
<span class="kw">curl</span> ${escapeHtml(config.publicBaseUrl)}/.well-known/x402

<span class="comment"># Machine-readable catalogue</span>
<span class="kw">curl</span> ${escapeHtml(config.publicBaseUrl)}/api/catalog

<span class="comment"># Check facilitator support</span>
<span class="kw">curl</span> ${escapeHtml(config.publicBaseUrl)}/supported</pre>
            </div>
          </div>
        </section>

        ${renderFooter()}
      </div>
    `,
  });
}

function renderEndpointDetail(endpoint: PublishedEndpoint, baseUrl: string) {
  const params = endpoint.bodySchema ?? endpoint.querySchema ?? [];
  const example = endpoint.requestBodyExample ?? endpoint.requestExample;
  const endpointId = `ep-${endpoint.id}-${endpoint.network}`.replace(/[^a-zA-Z0-9-]/g, "-");

  return `
    <details class="endpoint-card" data-network="${escapeHtml(endpoint.network)}">
      <summary class="endpoint-card-header">
        <div class="endpoint-card-left">
          <span class="method-badge method-${escapeHtml(endpoint.method)}">${escapeHtml(endpoint.method)}</span>
          <span class="endpoint-path">${escapeHtml(endpoint.fullPath)}</span>
        </div>
        <div class="endpoint-card-right">
          <span class="tag tag-network">${escapeHtml(endpoint.network)}</span>
          <span class="tag tag-price">$${escapeHtml(endpoint.priceUsd)} USD</span>
          <div class="endpoint-expand">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </div>
        </div>
      </summary>
      <div class="endpoint-card-body">
        <p class="endpoint-desc">${escapeHtml(endpoint.description)}</p>
        <div class="endpoint-grid">
          <div>
            <div class="endpoint-section-label">Example Request</div>
            <div class="code-block">
              <div class="code-block-header">
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <span class="code-block-label">request</span>
              </div>
              <pre>${escapeHtml(example)}</pre>
            </div>
          </div>
          <div>
            <div class="endpoint-section-label">${endpoint.bodySchema ? "Body Schema" : "Query Parameters"}</div>
            ${
              params.length > 0
                ? `<ul class="endpoint-params">${params.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
                : `<p style="color: var(--text-tertiary); font-size: 0.85rem;">No additional parameters</p>`
            }
          </div>
        </div>
        <div class="try-section">
          <button class="try-btn" data-endpoint-id="${endpointId}" data-method="${escapeHtml(endpoint.method)}" data-path="${escapeHtml(endpoint.fullPath)}" data-base-url="${escapeHtml(baseUrl)}" onclick="tryEndpoint(this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Try with Freighter
          </button>
          <div class="try-result" id="result-${endpointId}"></div>
        </div>
      </div>
    </details>
  `;
}

function renderCatalogueClientScript() {
  return `
      <script>
      const X402_CORE_CLIENT_URL = ${JSON.stringify("https://esm.sh/@x402/core@2.7.0/client?bundle")};
      const X402_STELLAR_CLIENT_URL = ${JSON.stringify("https://esm.sh/@x402/stellar@2.7.0/exact/client?bundle")};
      const STELLAR_RPC_URLS = {
        'stellar:pubnet': ${JSON.stringify(config.stellarRpcUrls.mainnet)},
        'stellar:testnet': ${JSON.stringify(config.stellarRpcUrls.testnet)},
      };

      let walletKitReady = false;
      let x402BrowserDepsPromise = null;

      function ensureWalletKit() {
        if (walletKitReady) return;
        if (!window.MyWalletKit) throw new Error('Wallet kit failed to load. Please refresh the page.');
        const { StellarWalletsKit, SwkAppDarkTheme, defaultModules } = window.MyWalletKit;
        StellarWalletsKit.init({ theme: SwkAppDarkTheme, modules: defaultModules() });
        walletKitReady = true;
      }

      function getNetworkPassphrase(network) {
        if (network === 'stellar:testnet') return 'Test SDF Network ; September 2015';
        if (network === 'stellar:pubnet') return 'Public Global Stellar Network ; September 2015';
        throw new Error('Unsupported Stellar network: ' + network);
      }

      function getSorobanRpcUrl(network) {
        const rpcUrl = STELLAR_RPC_URLS[network];
        if (!rpcUrl) {
          throw new Error('No Soroban RPC URL configured for ' + network + '.');
        }
        return rpcUrl;
      }

      function normalizeHeaders(headers) {
        const result = {};
        headers.forEach((value, key) => {
          result[key.toLowerCase()] = value;
        });
        return result;
      }

      function decodeBase64Json(value) {
        const binary = window.atob(value);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return JSON.parse(new TextDecoder().decode(bytes));
      }

      async function readResponseBody(response) {
        return response.json().catch(() => response.text());
      }

      function clearInlineError(btn) {
        const next = btn.parentElement && btn.parentElement.nextElementSibling;
        if (next && next.classList && next.classList.contains('wallet-error')) {
          next.remove();
        }
      }

      function showInlineError(btn, message) {
        clearInlineError(btn);
        btn.parentElement.insertAdjacentHTML(
          'afterend',
          '<p class="wallet-error" style="color: var(--pink); font-size: 0.85rem; margin-top: 8px;">' +
            escapeHtmlClient(String(message)) +
          '</p>',
        );
      }

      async function loadX402BrowserDeps() {
        if (!x402BrowserDepsPromise) {
          x402BrowserDepsPromise = Promise.all([
            import(X402_CORE_CLIENT_URL),
            import(X402_STELLAR_CLIENT_URL),
          ]).then(([core, stellar]) => ({ core, stellar }));
        }
        return x402BrowserDepsPromise;
      }

      async function connectFreighter(network) {
        ensureWalletKit();
        const { StellarWalletsKit } = window.MyWalletKit;
        StellarWalletsKit.setWallet('freighter');

        try {
          const existing = await StellarWalletsKit.getAddress();
          if (existing && existing.address) {
            return existing.address;
          }
        } catch (_err) {
          // Fall through to the wallet modal.
        }

        StellarWalletsKit.setNetwork(getNetworkPassphrase(network));
        const connected = await StellarWalletsKit.authModal();
        if (connected && connected.address) {
          return connected.address;
        }

        throw new Error('Freighter connection was cancelled.');
      }

      async function createStellarHttpClient(address, network) {
        ensureWalletKit();
        const { StellarWalletsKit } = window.MyWalletKit;
        const deps = await loadX402BrowserDeps();
        const { x402Client, x402HTTPClient } = deps.core;
        const { ExactStellarScheme } = deps.stellar;
        const networkPassphrase = getNetworkPassphrase(network);

        const signer = {
          address,
          signAuthEntry(authEntryXdr, options) {
            return StellarWalletsKit.signAuthEntry(authEntryXdr, {
              address,
              networkPassphrase: options && options.networkPassphrase
                ? options.networkPassphrase
                : networkPassphrase,
            });
          },
          signTransaction(transactionXdr, options) {
            return StellarWalletsKit.signTransaction(transactionXdr, {
              address,
              networkPassphrase: options && options.networkPassphrase
                ? options.networkPassphrase
                : networkPassphrase,
            });
          },
        };

        const coreClient = new x402Client().register(
          'stellar:*',
          new ExactStellarScheme(signer, { url: getSorobanRpcUrl(network) }),
        );

        return new x402HTTPClient(coreClient);
      }

      function findStellarRequirement(paymentRequired) {
        if (!paymentRequired || !Array.isArray(paymentRequired.accepts)) {
          return null;
        }

        return paymentRequired.accepts.find(requirement =>
          requirement &&
          requirement.scheme === 'exact' &&
          typeof requirement.network === 'string' &&
          requirement.network.indexOf('stellar:') === 0,
        ) || null;
      }

      function filterEndpoints(btn) {
        const value = btn.getAttribute('data-network-filter');
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        document.querySelectorAll('.endpoint-card').forEach(card => {
          const net = card.getAttribute('data-network');
          card.style.display = (value === 'all' || net === value) ? '' : 'none';
        });
      }

      async function tryEndpoint(btn) {
        const method = btn.dataset.method;
        const path = btn.dataset.path;
        const baseUrl = btn.dataset.baseUrl;
        const resultId = 'result-' + btn.dataset.endpointId;
        const resultEl = document.getElementById(resultId);

        btn.disabled = true;
        btn.textContent = 'Calling endpoint...';
        resultEl.classList.add('visible');
        resultEl.innerHTML = '<p style="color: var(--text-tertiary); font-size: 0.85rem;">Making request...</p>';

        try {
          const url = baseUrl + path;
          const fetchOpts = {
            method,
            headers: { 'Content-Type': 'application/json' },
          };
          let finalUrl = url;

          if (method === 'POST') {
            if (path.includes('/chat/')) {
              fetchOpts.body = JSON.stringify({ prompt: 'Hello, world!', reasoning_effort: 'minimal' });
            } else if (path.includes('/image/')) {
              fetchOpts.body = JSON.stringify({ prompt: 'A beautiful sunset over the ocean' });
            }
          } else {
            const sep = path.includes('?') ? '&' : '?';
            const params = 'latitude=51.5072&longitude=-0.1276&timezone=auto';
            if (path.includes('archive') || path.includes('history-summary')) {
              finalUrl = url + sep + params + '&start_date=2026-03-01&end_date=2026-03-07&daily=temperature_2m_max,temperature_2m_min';
            } else if (path.includes('forecast')) {
              finalUrl = url + sep + params + '&daily=temperature_2m_max,temperature_2m_min&forecast_days=3';
            } else {
              finalUrl = url + sep + params;
            }
          }

          const response = await fetch(finalUrl, fetchOpts);
          const body = await readResponseBody(response);

          if (response.status === 402) {
            const ctx = {
              method,
              url: finalUrl,
              fetchOpts,
              body,
              responseHeaders: normalizeHeaders(response.headers),
            };

            resultEl.innerHTML =
              '<div class="try-status status-402">&#9888; 402 Payment Required</div>' +
              '<pre>' + escapeHtmlClient(JSON.stringify(body, null, 2)) + '</pre>' +
              '<div style="margin-top: 16px;">' +
              '<button class="try-btn pay-freighter-btn">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
              'Pay with Freighter' +
              '</button>' +
              '</div>';

            const payBtn = resultEl.querySelector('.pay-freighter-btn');
            payBtn.__x402ctx = ctx;
            payBtn.addEventListener('click', function() { payWithFreighter(this, this.__x402ctx); });
          } else {
            resultEl.innerHTML =
              '<div class="try-status status-200">&#10003; ' + response.status + ' OK</div>' +
              '<pre>' + escapeHtmlClient(JSON.stringify(body, null, 2)) + '</pre>';
          }
        } catch (err) {
          resultEl.innerHTML =
            '<div class="try-status status-error">&#10007; Error</div>' +
            '<pre>' + escapeHtmlClient(String(err && err.message ? err.message : err)) + '</pre>';
        }

        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Try again';
      }

      async function payWithFreighter(btn, ctx) {
        const resultEl = btn.closest('.try-section').querySelector('.try-result');

        btn.disabled = true;
        btn.textContent = 'Reading payment requirements...';
        clearInlineError(btn);

        try {
          const paymentRequiredHeader = ctx && ctx.responseHeaders
            ? ctx.responseHeaders['payment-required']
            : null;

          if (!paymentRequiredHeader) {
            throw new Error('402 response is missing the PAYMENT-REQUIRED header.');
          }

          const paymentRequired = decodeBase64Json(paymentRequiredHeader);
          const stellarRequirement = findStellarRequirement(paymentRequired);

          if (!stellarRequirement) {
            throw new Error('No Stellar payment option was returned for this endpoint.');
          }

          btn.textContent = 'Connecting Freighter...';
          const address = await connectFreighter(stellarRequirement.network);
          if (!address) {
            throw new Error('No wallet address was returned from Freighter.');
          }

          btn.textContent = 'Building x402 payment...';
          const httpClient = await createStellarHttpClient(address, stellarRequirement.network);
          const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
          const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

          btn.textContent = 'Sending paid request...';
          const retryOpts = {
            method: ctx.method,
            headers: {
              'Content-Type': 'application/json',
              ...paymentHeaders,
            },
          };

          if (ctx.fetchOpts && ctx.fetchOpts.body) {
            retryOpts.body = ctx.fetchOpts.body;
          }

          const retryResponse = await fetch(ctx.url, retryOpts);
          const retryBody = await readResponseBody(retryResponse);
          let settlement = null;

          try {
            settlement = httpClient.getPaymentSettleResponse(name => retryResponse.headers.get(name));
          } catch (_err) {
            settlement = null;
          }

          if (retryResponse.ok) {
            let html =
              '<div class="try-status status-200">&#10003; ' + retryResponse.status + ' Paid &amp; Delivered</div>' +
              '<pre>' + escapeHtmlClient(JSON.stringify(retryBody, null, 2)) + '</pre>';

            if (settlement) {
              html +=
                '<div style="margin-top: 12px;">' +
                '<div class="section-label" style="margin-bottom: 8px;">Settlement</div>' +
                '<pre>' + escapeHtmlClient(JSON.stringify(settlement, null, 2)) + '</pre>' +
                '</div>';
            }

            resultEl.innerHTML = html;
          } else {
            resultEl.innerHTML =
              '<div class="try-status status-error">&#10007; ' + retryResponse.status + '</div>' +
              '<pre>' + escapeHtmlClient(JSON.stringify(retryBody, null, 2)) + '</pre>';
          }
        } catch (err) {
          showInlineError(btn, err && err.message ? err.message : String(err));
        }

        btn.disabled = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Retry Payment';
      }

      function escapeHtmlClient(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
      }
      </script>
  `;
}

export function renderServicePage(
  service: ServiceDefinition,
  catalog: PlatformCatalog,
) {
  const endpoints = catalog.publishedEndpoints.filter(
    (ep) => ep.serviceId === service.id,
  );
  const networks = Array.from(new Set(endpoints.map((ep) => ep.network)));
  const accent = serviceAccentColor(service.id);

  return layout({
    title: `${service.name} | xlm402.com`,
    description: service.description,
    body: `
      <div class="container">
        ${renderNav("")}

        <section class="service-hero">
          <a href="/" class="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to catalogue
          </a>
          <div class="service-hero-inner">
            <div class="service-hero-icon" style="color: ${accent}; background: linear-gradient(135deg, ${accent}15, ${accent}08); border-color: ${accent}30;">
              ${serviceIcon(service.id)}
            </div>
            <div>
              <h1>${escapeHtml(service.name)}</h1>
              <p>${escapeHtml(service.description)}</p>
              <div class="service-highlights">
                ${networks.map((n) => `<span class="tag tag-network">${escapeHtml(n)}</span>`).join("")}
                ${service.highlights.map((h) => `<span class="tag">${escapeHtml(h)}</span>`).join("")}
              </div>
            </div>
          </div>
        </section>

        <section class="section" style="padding-top: 0;">
          <div class="section-label">Endpoints</div>
          <h2 class="section-title">${endpoints.length} endpoint${endpoints.length === 1 ? "" : "s"} available</h2>
          <p class="section-subtitle">
            Click any endpoint to see details, example requests, and try it live with your Freighter wallet.
          </p>

          ${networks.length > 1 ? `
          <div class="filter-bar">
            <button class="filter-btn" data-network-filter="all" aria-pressed="true" onclick="filterEndpoints(this)">All</button>
            ${networks.map((n) => `<button class="filter-btn" data-network-filter="${escapeHtml(n)}" aria-pressed="false" onclick="filterEndpoints(this)">${escapeHtml(n)}</button>`).join("")}
          </div>
          ` : ""}

          <div class="endpoints-grid">
            ${endpoints.map((ep) => renderEndpointDetail(ep, config.publicBaseUrl)).join("")}
          </div>
        </section>

        ${renderFooter()}
      </div>
      ${renderCatalogueClientScript()}
    `,
  });
}

export function renderDocsPage(catalog: PlatformCatalog) {
  const endpoints = catalog.publishedEndpoints;
  const networks = Array.from(new Set(endpoints.map((ep) => ep.network)));

  return layout({
    title: "Docs | xlm402.com",
    description:
      "API documentation for xlm402.com x402 services on Stellar.",
    body: `
      <div class="container">
        ${renderNav("docs")}

        <section class="section" style="padding-top: 48px;">
          <div class="section-label">Documentation</div>
          <h2 class="section-title">API Reference</h2>
          <p class="section-subtitle">
            All routes are protected by x402. Mainnet routes live at the root path.
            Testnet mirrors weather under <code>/testnet</code>. AI services are mainnet only.
          </p>

          <div class="filter-bar">
            <button class="filter-btn" data-network-filter="all" aria-pressed="true" onclick="filterEndpoints(this)">All routes</button>
            ${networks.map((n) => `<button class="filter-btn" data-network-filter="${escapeHtml(n)}" aria-pressed="false" onclick="filterEndpoints(this)">${escapeHtml(n)}</button>`).join("")}
          </div>

          <div class="endpoints-grid">
            ${endpoints.map((ep) => renderEndpointDetail(ep, config.publicBaseUrl)).join("")}
          </div>
        </section>

        <section class="section">
          <div class="integration-panel">
            <div>
              <div class="section-label">Integration Notes</div>
              <h3>Discovery &amp; Payment Flow</h3>
              <ul>
                <li><code>/.well-known/x402</code> returns the published route list with price, network, and pay-to metadata.</li>
                <li><code>/supported</code> returns facilitator support by network so clients can inspect enabled schemes.</li>
                <li>402 responses include network-specific payment requirements for the route requested.</li>
                <li>Chat and image services activate automatically when <code>OPENAI_API_KEY</code> is configured.</li>
              </ul>
            </div>
            <div>
              <div class="section-label">Platform Details</div>
              <h3>Configuration</h3>
              <ul>
                <li>Text model: <code>${escapeHtml(config.openai.chatModel)}</code></li>
                <li>Image model: <code>${escapeHtml(config.openai.imageModel)}</code></li>
                <li>Base URL: <code>${escapeHtml(config.publicBaseUrl)}</code></li>
                <li>AI services: ${config.openai.enabled ? "Enabled" : "Pending API key"}</li>
              </ul>
            </div>
          </div>
        </section>

        ${renderFooter()}
      </div>
      ${renderCatalogueClientScript()}
    `,
  });
}
