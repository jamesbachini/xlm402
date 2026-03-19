import { config, getRoutePaymentAssets } from "../config.js";
import { getUsdcAddress } from "@x402/stellar";
import type { PlatformCatalog, PublishedEndpoint, ServiceDefinition } from "./catalog.js";


export function escapeHtml(value: string): string {
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
    case "news":
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20"/><path d="M5 2h11a2 2 0 0 1 2 2v18"/><path d="M5 2a2 2 0 0 0-2 2v13.5A2.5 2.5 0 0 0 5.5 20H18"/><path d="M8 7h6"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>`;
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
    case "news":
      return "#fbbf24";
    case "chat":
      return "#a78bfa";
    case "image":
      return "#f472b6";
    default:
      return "#7de2d1";
  }
}

export const sharedStyles = `
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
  --font-brand: 'Quantico', var(--font-display);
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
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -15px) scale(1.05); }
  100% { transform: translate(40px, -30px) scale(1); }
}

/* ── Starfield canvas ── */
#starfield {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

/* ── Scroll reveal animations ── */
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.8s var(--ease), transform 0.8s var(--ease);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
.reveal-delay-1 { transition-delay: 0.1s; }
.reveal-delay-2 { transition-delay: 0.2s; }
.reveal-delay-3 { transition-delay: 0.3s; }
.reveal-delay-4 { transition-delay: 0.4s; }

/* ── Animated gradient text ── */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ── Floating orbs in hero ── */
.hero-orbs {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.15;
  animation: orb-float 12s ease-in-out infinite;
}
.hero-orb-1 {
  width: 300px; height: 300px;
  background: var(--accent);
  top: -50px; left: 10%;
  animation-duration: 14s;
}
.hero-orb-2 {
  width: 250px; height: 250px;
  background: var(--purple);
  top: 20%; right: 5%;
  animation-delay: -4s;
  animation-duration: 18s;
}
.hero-orb-3 {
  width: 200px; height: 200px;
  background: var(--pink);
  bottom: -30px; left: 30%;
  animation-delay: -8s;
  animation-duration: 16s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(30px, -20px) rotate(5deg); }
  50% { transform: translate(-20px, 15px) rotate(-3deg); }
  75% { transform: translate(15px, 25px) rotate(2deg); }
}

/* ── Hero badge shimmer ── */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.hero-badge {
  position: relative;
  overflow: hidden;
}
.hero-badge::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(125,226,209,0.15), transparent);
  background-size: 200% 100%;
  animation: shimmer 3s linear infinite;
}

/* ── Mouse-tracking card glow ── */
.service-card {
  --mouse-x: 50%;
  --mouse-y: 50%;
}
.service-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    600px circle at var(--mouse-x) var(--mouse-y),
    rgba(125,226,209,0.06),
    transparent 40%
  );
  opacity: 0;
  transition: opacity 400ms;
  pointer-events: none;
  z-index: 1;
}
.service-card:hover::after {
  opacity: 1;
}

/* ── Stats counter glow ── */
.stat-value {
  transition: color 0.3s;
}
.stat:hover .stat-value {
  color: var(--accent);
  text-shadow: 0 0 20px rgba(125,226,209,0.3);
}

/* ── How-It-Works step connectors ── */
.how-grid {
  position: relative;
}
@media (min-width: 769px) {
  .how-step {
    position: relative;
    transition: transform 0.3s var(--ease), border-color 0.3s;
  }
  .how-step:hover {
    transform: translateY(-6px);
    border-color: var(--border-accent);
  }
}

/* ── Animated step numbers ── */
.how-step-number {
  transition: all 0.3s var(--ease);
}
.how-step:hover .how-step-number {
  background: rgba(125,226,209,0.2);
  border-color: rgba(125,226,209,0.4);
  transform: scale(1.15);
  box-shadow: 0 0 20px rgba(125,226,209,0.15);
}

/* ── Code block typing cursor ── */
@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.code-typing-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: var(--accent);
  animation: blink-cursor 1s step-end infinite;
  vertical-align: middle;
  margin-left: 2px;
}

/* ── Network visualization in hero ── */
.hero-network {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
}

/* ── Pulse ring on hero badge ── */
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
}
.hero-badge .dot::after {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse-ring 2s ease-out infinite;
}
.hero-badge .dot {
  position: relative;
}

/* ── Animated border on integration panel ── */
@keyframes border-travel {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}
.integration-panel {
  position: relative;
  background-clip: padding-box;
}
.integration-panel:hover {
  border-color: rgba(125,226,209,0.25);
  box-shadow: 0 0 40px rgba(125,226,209,0.05);
}

/* ── Button glow pulse ── */
@keyframes btn-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(125,226,209,0.1); }
  50% { box-shadow: 0 0 30px rgba(125,226,209,0.25); }
}
.btn-primary {
  animation: btn-glow 3s ease-in-out infinite;
}
.btn-primary:hover {
  animation: none;
  box-shadow: 0 4px 30px rgba(125,226,209,0.3);
}

/* ── Smooth entrance for the whole page ── */
@keyframes page-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}
body {
  animation: page-enter 0.6s ease-out;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-icon svg {
  width: 100%;
  height: 100%;
}

.logo-text {
  font-family: var(--font-brand);
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
  text-transform: none;
}

.logo-text .logo-gradient {
  background: linear-gradient(135deg, var(--accent), var(--purple), var(--pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-text .logo-dot-com {
  color: var(--text);
  font-size: 0.6em;
  opacity: 0.5;
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
  opacity: 0.6;
}

.hero-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse-dot 2s ease-in-out infinite;
  margin-right: 10px;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(125,226,209,0.4); }
  50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(125,226,209,0); }
}

.hero h1 {
  font-family: var(--font-brand);
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.05;
  max-width: 800px;
  margin: 0 auto 24px;
  opacity: 0.1 !important;
}

.hero-subtitle {
  font-family: var(--font-brand);
  font-size: 0.8rem;
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

.request-editor {
  width: 100%;
  min-height: 220px;
  margin: 0;
  padding: 20px;
  border: 0;
  background: transparent;
  color: #b0c4de;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.request-editor::placeholder {
  color: var(--text-tertiary);
}

.request-editor-help {
  margin-top: 10px;
  font-size: 0.8rem;
  color: var(--text-tertiary);
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

.wallet-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
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

export function renderNav(activePage: string) {
  return `
    <nav class="nav">
      <a class="logo" href="/">
        <div class="logo-icon"><svg viewBox="0 0 216.70045 145.68955" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7de2d1"/><stop offset="50%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#f472b6"/></linearGradient></defs><path fill="url(#logo-grad)" d="m 81.979,-0.331 c -2.445,-1.25 -3.407,-4.323 -1.916,-6.12 0.269,-0.324 -0.725,-1.438 -6.008,-6.731 -5.187,-5.196 -6.426,-6.31 -6.86,-6.166 -1.284,0.427 -3.062,0.421 -3.724,-0.013 -1.551,-1.016 -2.112,-3.078 -1.277,-4.693 l 0.423,-0.819 -8.408,-8.411 c -8.263,-8.266 -8.42,-8.405 -9.088,-8.065 -1.852,0.941 -4.358,1.326 -8.618,1.322 -4.682,-0.003 -6.866,-0.419 -10.3,-1.959 -1.847,-0.829 -5.167,-2.865 -6.163,-3.78 l -0.588,-0.54 -3.646,3.483 c -2.005,1.916 -6.382,6.071 -9.727,9.233 l -6.081,5.75 2.659,-3.307 c 4.34,-5.399 9.735,-12.237 10.422,-13.211 0.714,-1.012 0.6,-0.964 -1.845,0.784 -0.946,0.676 -1.889,1.328 -2.096,1.448 -0.207,0.12 1.035,-1.498 2.76,-3.596 1.725,-2.098 3.247,-3.961 3.381,-4.14 0.166,-0.221 -0.071,-0.803 -0.734,-1.801 -4.311,-6.495 -5.522,-15.403 -3.125,-23.002 2.606,-8.262 9.036,-14.802 17.011,-17.303 2.739,-0.859 4.939,-1.17 8.202,-1.161 3.838,0.011 7.256,0.74 10.297,2.196 1.225,0.587 2.307,0.973 2.406,0.859 0.099,-0.114 2.009,-2.35 4.245,-4.97 2.236,-2.619 7.111,-8.275 10.832,-12.568 3.721,-4.293 8.6,-9.948 10.841,-12.568 2.241,-2.619 4.975,-5.777 6.077,-7.016 1.101,-1.24 2.517,-2.847 3.147,-3.572 1.343,-1.547 1.218,-1.216 -0.502,1.328 -0.689,1.019 -6.016,9.012 -11.838,17.763 l -10.585,15.911 -0.084,22.805 c -0.046,12.543 -0.179,22.864 -0.295,22.936 -0.117,0.072 -1.697,0.046 -3.512,-0.057 l -3.3,-0.188 -0.003,-17.096 -0.004,-17.096 -1.691,2.646 c -0.93,1.455 -2.227,3.479 -2.882,4.498 -1.576,2.453 -6.41,8.91 -7.952,10.622 -0.674,0.749 -1.226,1.471 -1.226,1.605 0,0.134 2.378,3.51 5.285,7.502 2.907,3.992 5.288,7.318 5.291,7.391 0.003,0.073 -2.072,0.156 -4.611,0.185 l -4.616,0.052 -3.349,-4.618 c -1.842,-2.54 -3.468,-4.692 -3.615,-4.783 -0.146,-0.09 -0.342,-0.06 -0.435,0.068 -0.582,0.801 -12.07,10.595 -13.596,11.592 -0.4,0.261 -0.728,0.581 -0.728,0.71 0,0.458 3.34,2.708 5.556,3.742 3.656,1.707 6.663,2.379 10.716,2.397 2.684,0.012 3.951,-0.112 5.768,-0.562 4.133,-1.024 8.025,-3.131 10.921,-5.912 1.163,-1.116 1.753,-1.51 2.077,-1.386 0.386,0.148 0.303,0.331 -0.558,1.231 -1.477,1.544 -4.754,3.915 -6.644,4.808 -0.904,0.427 -1.644,0.844 -1.644,0.928 0,0.083 3.727,3.877 8.282,8.43 l 8.282,8.278 0.78,-0.407 c 2.26,-1.179 4.878,0.521 4.881,3.169 0.001,0.586 -0.194,1.344 -0.432,1.683 -0.429,0.613 -0.386,0.665 5.906,6.957 l 6.339,6.339 0.999,-0.589 c 1.303,-0.769 2.957,-0.749 4.383,0.053 l 1.08,0.607 4.603,-4.597 4.603,-4.597 -0.146,-1.232 c -0.132,-1.113 -0.063,-1.327 0.707,-2.203 0.668,-0.76 1.048,-0.971 1.751,-0.971 h 0.899 v -19.05 c 0,-16.757 -0.048,-19.05 -0.397,-19.05 -0.663,0 -1.455,-1.008 -1.455,-1.852 0,-1.018 0.834,-1.852 1.852,-1.852 1.843,0 2.549,2.327 1.059,3.492 l -0.793,0.62 0.175,18.978 c 0.136,14.744 0.247,18.978 0.5,18.978 0.302,0 10.454,-9.852 25.186,-24.442 l 6.152,-6.092 v -3.518 -3.518 h -9.657 -9.657 v -1.196 c 0,-1.307 0.19,-1.628 5.72,-9.652 1.454,-2.11 3.326,-4.832 4.16,-6.05 l 1.517,-2.213 -1.812,-2.02 c -0.997,-1.111 -4.001,-4.52 -6.676,-7.576 -2.675,-3.056 -5.974,-6.763 -7.33,-8.238 l -2.466,-2.681 -0.978,0.498 c -1.226,0.625 -1.826,0.626 -3.042,0.006 l -0.965,-0.492 -6.83,7.815 c -3.756,4.298 -7.216,8.259 -7.689,8.802 l -0.859,0.987 1.414,0.798 c 1.342,0.758 3.612,2.994 3.612,3.559 0,0.145 0.575,-0.274 1.277,-0.931 2.676,-2.503 5.371,-3.64 8.626,-3.64 3.786,0 6.568,1.757 8.08,5.104 1.298,2.872 1.403,3.994 1.412,15.004 l 0.008,10.186 -3.467,0.074 -3.467,0.074 -0.096,-9.996 c -0.085,-8.804 -0.152,-10.144 -0.569,-11.244 -0.565,-1.492 -1.918,-2.76 -3.203,-3.001 -2.221,-0.417 -5.213,0.837 -6.103,2.556 -0.657,1.27 -0.902,5.045 -0.891,13.732 l 0.009,7.805 -0.677,-0.017 c -0.372,-0.009 -1.92,-0.039 -3.44,-0.066 l -2.763,-0.05 -0.096,-9.856 c -0.068,-6.972 -0.193,-10.151 -0.429,-10.865 -0.506,-1.535 -2.13,-3.017 -3.539,-3.228 -2.298,-0.345 -4.631,0.787 -5.755,2.792 l -0.661,1.18 -0.078,10.12 -0.078,10.12 -0.98,-0.001 c -0.539,-0.001 -2.141,-0.078 -3.56,-0.172 l -2.58,-0.171 v -14.777 -14.777 h 3.013 3.013 l 0.179,0.954 c 0.099,0.525 0.29,1.247 0.426,1.604 l 0.247,0.649 1.257,-1.045 c 2.366,-1.967 4.432,-2.727 7.404,-2.726 l 2.178,0.001 3.787,-4.283 c 3.012,-3.407 8.672,-9.918 11.248,-12.94 0.342,-0.402 0.334,-0.568 -0.067,-1.415 -0.786,-1.657 -0.03,-3.58 1.777,-4.514 2.642,-1.366 5.715,1.625 4.596,4.473 l -0.409,1.041 2.443,2.684 c 1.344,1.476 4.894,5.482 7.889,8.901 7.371,8.416 7.849,8.921 8.094,8.562 0.113,-0.166 1.867,-2.756 3.898,-5.755 2.031,-2.999 3.817,-5.456 3.969,-5.459 0.152,-0.003 0.92,-1.105 1.707,-2.447 0.786,-1.343 3.356,-5.537 5.709,-9.32 6.084,-9.781 5.543,-8.787 5.053,-9.277 -0.973,-0.973 -0.828,-3.194 0.266,-4.054 0.974,-0.766 2.053,-0.927 2.985,-0.445 1.569,0.812 2.07,2.488 1.228,4.115 l -0.395,0.763 6.229,8.22 c 3.426,4.521 6.335,8.22 6.465,8.22 0.13,0 0.391,-0.221 0.581,-0.491 0.382,-0.543 8.694,-9.501 12.673,-13.659 1.396,-1.458 3.799,-4.021 5.34,-5.694 2.748,-2.983 2.793,-3.053 2.322,-3.572 -1.051,-1.157 -1.395,-2.259 -1.29,-4.126 0.086,-1.518 0.226,-1.954 0.903,-2.804 1.933,-2.43 5.46,-2.869 7.586,-0.945 0.575,0.521 0.144,0.932 10.886,-10.362 l 7.029,-7.389 -0.164,-1.022 c -0.134,-0.84 -0.055,-1.138 0.447,-1.673 1.217,-1.295 3.164,-0.499 3.164,1.293 0,1.41 -0.932,2.003 -2.678,1.702 -0.374,-0.064 -5.91,5.534 -15.881,16.06 l -2.023,2.136 0.414,0.787 c 0.228,0.433 0.483,1.498 0.568,2.366 l 0.154,1.579 9.312,3.13 9.312,3.13 0.884,-0.965 c 1.186,-1.294 2.799,-1.526 4.173,-0.6 2.392,1.612 2.295,4.735 -0.183,5.911 -1.108,0.526 -2.527,0.387 -3.324,-0.326 -0.521,-0.466 -0.716,-0.286 -10.551,9.697 -5.511,5.594 -10.02,10.267 -10.02,10.385 0,0.117 0.268,0.214 0.595,0.214 0.991,0 3.751,1.458 4.823,2.548 3.154,3.204 3.591,9.083 1.052,14.157 -1.808,3.614 -4.449,6.93 -10.115,12.7 l -5.422,5.521 h 9.031 9.031 v 1.852 1.852 h -12.039 -12.039 v -1.403 -1.403 l 6.57,-6.6 c 8.307,-8.345 10.766,-11.601 11.821,-15.65 0.457,-1.756 0.509,-4.282 0.117,-5.694 -1.002,-3.607 -5.251,-5.487 -9.78,-4.326 -1.754,0.449 -4.183,1.657 -5.195,2.583 -0.658,0.602 -0.712,0.543 -1.428,-1.538 -0.489,-1.422 -0.492,-1.516 -0.054,-1.86 0.964,-0.755 4.3,-2.23 5.984,-2.645 l 1.754,-0.433 V 43.607 30.416 l -0.595,-0.002 c -0.327,-0.001 -0.915,-0.169 -1.306,-0.373 -0.708,-0.37 -0.725,-0.356 -4.473,3.64 -2.069,2.206 -4.73,5.023 -5.912,6.26 -1.183,1.237 -4.365,4.637 -7.071,7.556 l -4.921,5.307 1.357,1.771 1.357,1.771 h 4.829 4.829 v 19.844 19.844 H 157.285 140.881 V 76.189 56.345 h 11.245 c 6.184,0 11.245,-0.065 11.245,-0.145 0,-0.131 -9.599,-12.873 -13.445,-17.846 l -1.534,-1.984 -1.656,0.024 -1.656,0.024 -3.468,5.533 c -1.908,3.043 -4.695,7.557 -6.195,10.031 l -2.727,4.498 1.317,0.08 1.317,0.08 v 13.734 13.734 l 2.183,0.077 2.183,0.077 0.079,1.654 0.079,1.654 h -2.262 -2.262 v 4.366 4.366 h -1.852 c -1.47,0 -1.852,-0.082 -1.852,-0.397 0,-0.218 -0.073,-0.397 -0.163,-0.397 -0.134,0 -11.973,11.539 -27.611,26.91 l -3.035,2.983 0.455,0.771 c 1.241,2.1 0.026,4.526 -2.267,4.526 -0.799,0 -1.405,-0.181 -1.893,-0.565 l -0.718,-0.565 -4.687,4.661 c -4.429,4.404 -4.669,4.694 -4.354,5.261 0.183,0.33 0.337,1.208 0.343,1.95 0.01,1.476 -0.615,2.68 -1.879,3.616 -0.945,0.7 -2.787,0.853 -3.833,0.318 z m 2.689,-1.831 c 2.333,-0.975 1.466,-4.378 -1.116,-4.378 -2.114,0 -3.031,2.695 -1.387,4.078 0.939,0.79 1.244,0.827 2.503,0.301 z m -61.795,-50.148 c 7.721,-5.83 14.267,-11.918 18.35,-17.066 2.727,-3.438 6.719,-9.02 10.464,-14.634 l 2.7,-4.047 -0.079,-1.602 -0.078,-1.602 -1.449,1.813 c -2.601,3.255 -14.558,17.561 -19.309,23.102 -10.498,12.245 -14.027,16.414 -13.891,16.414 0.078,0 1.559,-1.07 3.291,-2.378 z m -5.772,0.369 c 0.814,-1.074 5.051,-6.106 7.765,-9.221 1.021,-1.172 2.483,-2.866 3.248,-3.763 l 1.391,-1.631 -4.01,-5.645 c -2.205,-3.105 -4.351,-6.079 -4.769,-6.609 -0.418,-0.53 -0.76,-1.036 -0.76,-1.124 0,-0.088 2.077,-0.16 4.615,-0.16 h 4.615 l 1.161,1.521 c 0.639,0.837 1.821,2.496 2.628,3.688 l 1.467,2.167 2.878,-3.341 c 1.583,-1.838 4.349,-5.075 6.147,-7.194 1.798,-2.119 3.685,-4.287 4.194,-4.818 l 0.926,-0.965 -1.152,-0.669 c -1.474,-0.856 -3.737,-1.607 -6.567,-2.179 -2.872,-0.581 -7.926,-0.406 -10.909,0.378 -9.679,2.543 -16.926,10.788 -18.633,21.201 -0.763,4.655 0.116,10.522 2.241,14.957 1.152,2.405 2.333,4.363 2.623,4.348 0.107,-0.005 0.513,-0.429 0.901,-0.941 z m 153.666,-17.108 -0.012,-16.47 -0.715,0.912 c -1.933,2.464 -11.567,14.474 -13.382,16.683 -1.648,2.006 -9.651,11.925 -11.893,14.74 l -0.482,0.606 h 13.248 13.248 l -0.012,-16.47 z m -22.115,9.657 c 2.547,-3.165 6.322,-7.838 8.389,-10.385 4.853,-5.979 12.78,-15.912 13.039,-16.338 0.16,-0.263 -2.517,-0.331 -13.044,-0.331 h -13.245 v 16.404 c 0,9.022 0.052,16.404 0.115,16.404 0.063,0 2.199,-2.59 4.746,-5.755 z M 131.621,73.372 V 62.353 l -4.579,6.852 c -5.363,8.025 -7.802,11.602 -9.198,13.493 -0.556,0.753 -0.938,1.442 -0.849,1.531 0.089,0.089 3.417,0.162 7.394,0.162 h 7.232 z m 68.81,-26.852 c 9.7,-9.889 10.098,-10.334 9.809,-10.969 -0.166,-0.364 -0.302,-1.049 -0.302,-1.523 v -0.861 l -9.402,-3.13 c -5.171,-1.722 -9.432,-3.085 -9.469,-3.029 -1.275,1.929 -1.722,2.409 -2.674,2.87 -0.612,0.296 -1.372,0.538 -1.69,0.538 h -0.578 v 13.183 13.183 l 2.097,0.023 2.097,0.023 10.11,-10.307 z m 14.186,-11.123 c 0.769,-0.722 0.783,-1.722 0.037,-2.517 -1.217,-1.296 -3.235,-0.47 -3.185,1.303 0.046,1.628 1.932,2.356 3.148,1.214 z m -27.295,-7.515 c 0.906,-0.43 1.714,-1.723 1.714,-2.745 0,-0.788 -0.675,-2.017 -1.38,-2.51 -0.324,-0.227 -1.108,-0.413 -1.742,-0.413 -0.914,0 -1.308,0.156 -1.906,0.754 -1.487,1.487 -1.269,3.533 0.503,4.726 1.061,0.714 1.623,0.752 2.811,0.188 z m -35.798,92.61 c -0.436,-0.305 -0.588,-0.678 -0.588,-1.44 0,-0.763 0.152,-1.135 0.588,-1.44 0.802,-0.562 1.688,-0.517 2.322,0.117 0.715,0.715 0.666,1.739 -0.12,2.526 -0.751,0.751 -1.373,0.818 -2.202,0.238 z m 10.828,0.12 c -2.356,-0.448 -4.431,-2.2 -5.218,-4.404 -0.421,-1.181 -0.477,-3.534 -0.115,-4.838 1.037,-3.733 4.875,-6.063 8.79,-5.335 0.892,0.166 1.722,0.402 1.844,0.524 0.123,0.123 0.089,0.606 -0.074,1.075 -0.251,0.719 -0.385,0.82 -0.863,0.645 -0.312,-0.114 -1.409,-0.207 -2.44,-0.207 -1.657,0 -1.989,0.088 -2.873,0.763 -0.55,0.42 -1.222,1.253 -1.494,1.852 -0.96,2.113 -0.464,5.545 0.987,6.834 1.348,1.197 3.574,1.56 5.455,0.889 1.103,-0.394 1.161,-0.359 1.293,0.773 0.082,0.702 -0.011,0.824 -0.833,1.087 -1.408,0.45 -3.179,0.587 -4.459,0.343 z m 12.056,-0.072 c -1.67,-0.466 -2.99,-1.571 -3.997,-3.347 -0.743,-1.31 -0.821,-1.664 -0.817,-3.698 0.004,-1.797 0.126,-2.497 0.608,-3.484 2.841,-5.815 11.135,-5.307 12.845,0.786 0.777,2.77 0.379,5.301 -1.171,7.44 -1.447,1.998 -4.827,3.04 -7.468,2.303 z m 4.156,-2.269 c 1.255,-0.776 2.059,-2.42 2.209,-4.518 0.109,-1.52 0.027,-2.003 -0.549,-3.263 -0.837,-1.827 -1.89,-2.549 -3.724,-2.55 -1.788,-0.001 -2.875,0.73 -3.753,2.524 -1.28,2.617 -0.59,6.298 1.439,7.678 1.21,0.822 3.163,0.88 4.378,0.129 z m 17.205,2.134 c -0.065,-0.065 -0.119,-2.212 -0.12,-4.771 -0.001,-2.559 -0.124,-5.093 -0.274,-5.632 -0.728,-2.621 -3.986,-2.707 -5.547,-0.147 -0.474,0.777 -0.526,1.339 -0.527,5.691 l -0.001,4.829 h -1.191 -1.191 l -0.002,-4.961 c -0.001,-2.729 -0.078,-5.943 -0.172,-7.144 l -0.17,-2.183 h 1.068 c 1.062,0 1.068,0.006 1.245,1.186 l 0.178,1.186 0.977,-1.024 c 0.929,-0.974 2.376,-1.615 3.623,-1.604 1.072,0.009 2.777,1.019 3.345,1.982 l 0.563,0.955 0.805,-0.977 c 1.818,-2.206 4.854,-2.576 6.765,-0.825 1.422,1.303 1.607,2.236 1.613,8.13 l 0.006,5.436 -1.124,-0.012 -1.124,-0.012 -0.132,-5.292 c -0.089,-3.542 -0.242,-5.484 -0.465,-5.873 -1.144,-2 -3.726,-1.811 -5.216,0.381 -0.655,0.964 -0.669,1.086 -0.669,5.79 v 4.806 l -1.072,0.102 c -0.59,0.056 -1.125,0.049 -1.191,-0.016 z m 9.315,-24.229 c -2.727,-0.971 -3.87,-3.899 -2.48,-6.353 0.848,-1.496 2.088,-2.257 3.682,-2.257 2.173,0 3.875,1.322 4.45,3.456 0.876,3.251 -2.458,6.291 -5.652,5.154 z m 3.11,-2.544 c 1.817,-2.159 -0.464,-5.137 -2.95,-3.852 -2.332,1.206 -1.394,4.666 1.266,4.666 0.791,0 1.142,-0.17 1.684,-0.814 z" transform="translate(-83.883,-75.846)"/></svg></div>
        <span class="logo-text"><span class="logo-gradient">xlm402</span><span class="logo-dot-com">.com</span></span>
      </a>
      <button class="mobile-menu-toggle" onclick="document.querySelector('.nav-links').classList.toggle('open')" aria-label="Toggle menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
      <div class="nav-links">
        <a href="/"${activePage === "home" ? ' class="active"' : ""}>Catalogue</a>
        <a href="/docs"${activePage === "docs" ? ' class="active"' : ""}>Docs</a>
        <a href="https://github.com/jamesbachini/xlm402" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </nav>
  `;
}

export function renderFooter() {
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
        <a href="https://github.com/jamesbachini/xlm402" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </footer>
  `;
}

export function layout({
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Quantico:wght@700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
    <script type="module" src="/vendor/freighter-x402.js"></script>
    <style>${sharedStyles}</style>
  </head>
  <body>
    <canvas id="starfield"></canvas>
    <div class="bg-glow"></div>
    <div class="bg-grid"></div>
    ${body}
    <script>
    /* ── Starfield ── */
    (function(){
      const c = document.getElementById('starfield');
      if (!c) return;
      const ctx = c.getContext('2d');
      let w, h, stars = [], mouse = {x: -1, y: -1};
      const STAR_COUNT = Math.min(180, Math.floor(window.innerWidth * 0.12));
      const COLORS = ['rgba(125,226,209,', 'rgba(167,139,250,', 'rgba(244,114,182,', 'rgba(240,246,252,'];

      function resize() {
        w = c.width = window.innerWidth;
        h = c.height = window.innerHeight;
      }

      function initStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.5 + 0.3,
            dx: (Math.random() - 0.5) * 0.15,
            dy: (Math.random() - 0.5) * 0.15,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.01 + Math.random() * 0.02,
          });
        }
      }

      function draw(t) {
        ctx.clearRect(0, 0, w, h);

        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          s.x += s.dx;
          s.y += s.dy;
          s.phase += s.twinkleSpeed;

          if (s.x < -10) s.x = w + 10;
          if (s.x > w + 10) s.x = -10;
          if (s.y < -10) s.y = h + 10;
          if (s.y > h + 10) s.y = -10;

          const alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(s.phase));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = s.color + alpha + ')';
          ctx.fill();
        }

        /* Draw connections near mouse */
        if (mouse.x > 0) {
          const CONNECT_DIST = 120;
          for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const dx = s.x - mouse.x;
            const dy = s.y - mouse.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < CONNECT_DIST) {
              const a = (1 - dist / CONNECT_DIST) * 0.25;
              ctx.beginPath();
              ctx.moveTo(s.x, s.y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.strokeStyle = 'rgba(125,226,209,' + a + ')';
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }

        /* Draw faint connections between nearby stars */
        const STAR_CONNECT = 100;
        for (let i = 0; i < stars.length; i++) {
          for (let j = i + 1; j < stars.length; j++) {
            const dx = stars[i].x - stars[j].x;
            const dy = stars[i].y - stars[j].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < STAR_CONNECT) {
              const a = (1 - dist / STAR_CONNECT) * 0.06;
              ctx.beginPath();
              ctx.moveTo(stars[i].x, stars[i].y);
              ctx.lineTo(stars[j].x, stars[j].y);
              ctx.strokeStyle = 'rgba(125,226,209,' + a + ')';
              ctx.lineWidth = 0.4;
              ctx.stroke();
            }
          }
        }

        requestAnimationFrame(draw);
      }

      resize();
      initStars();
      requestAnimationFrame(draw);

      window.addEventListener('resize', function() {
        resize();
        initStars();
      });

      document.addEventListener('mousemove', function(e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      });

      document.addEventListener('mouseleave', function() {
        mouse.x = -1;
        mouse.y = -1;
      });
    })();

    /* ── Scroll reveal ── */
    (function(){
      const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('.reveal').forEach(function(el) {
        observer.observe(el);
      });
    })();

    /* ── Animated stat counters ── */
    (function(){
      const statObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            const el = entry.target;
            const text = el.textContent.trim();
            const num = parseInt(text, 10);
            if (!isNaN(num) && num > 0 && num < 100 && !el.dataset.counted) {
              el.dataset.counted = '1';
              let current = 0;
              const step = Math.max(1, Math.floor(num / 20));
              const interval = setInterval(function() {
                current += step;
                if (current >= num) {
                  current = num;
                  clearInterval(interval);
                }
                el.textContent = current;
              }, 40);
            }
          }
        });
      }, { threshold: 0.5 });

      document.querySelectorAll('.stat-value').forEach(function(el) {
        statObserver.observe(el);
      });
    })();

    /* ── Card mouse glow tracking ── */
    function updateCardGlow(e, card) {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
    }
    function resetCardGlow(card) {
      card.style.setProperty('--mouse-x', '50%');
      card.style.setProperty('--mouse-y', '50%');
    }

    /* ── Smooth parallax on scroll for hero orbs ── */
    (function(){
      let ticking = false;
      window.addEventListener('scroll', function() {
        if (!ticking) {
          requestAnimationFrame(function() {
            const scrollY = window.scrollY;
            const orbs = document.querySelectorAll('.hero-orb');
            orbs.forEach(function(orb, i) {
              const speed = 0.05 + i * 0.03;
              orb.style.transform = 'translateY(' + (scrollY * speed) + 'px)';
            });
            ticking = false;
          });
          ticking = true;
        }
      });
    })();
    </script>
  </body>
</html>`;
}

function renderServiceCard(service: ServiceDefinition, catalog: PlatformCatalog, index = 0) {
  const endpoints = catalog.publishedEndpoints.filter(
    (ep) => ep.serviceId === service.id,
  );
  const networks = Array.from(new Set(endpoints.map((ep) => ep.network)));
  const prices = Array.from(new Set(endpoints.map((ep) => ep.priceUsd)));
  const accent = serviceAccentColor(service.id);
  const delayClass = index <= 3 ? ` reveal-delay-${index + 1}` : "";

  return `
    <a href="/services/${escapeHtml(service.id)}" class="service-card reveal${delayClass}" style="--card-accent: ${accent}" onmousemove="updateCardGlow(event, this)" onmouseleave="resetCardGlow(this)">
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

        <section class="hero" style="position: relative;">
          <div class="hero-orbs">
            <div class="hero-orb hero-orb-1"></div>
            <div class="hero-orb hero-orb-2"></div>
            <div class="hero-orb hero-orb-3"></div>
          </div>
          <div class="reveal">
            <div class="hero-badge">
              <span class="dot"></span>
              LIVE ON THE STELLAR NETWORK
            </div>
          </div>
          <h1 class="reveal reveal-delay-1">x402 on Stellar</h1>
          <p class="hero-subtitle reveal reveal-delay-2">
            SERVICES FOR THE MACHINE ECONOMY
          </p>
          <div class="hero-actions reveal reveal-delay-3">
            <a class="btn btn-primary" href="#catalogue">Browse catalogue</a>
            <a class="btn" href="/docs">Read the docs</a>
          </div>
        </section>

        <div class="stats-bar reveal">
          <div class="stat">
            <div class="stat-value">${catalog.publishedEndpoints.length}</div>
            <div class="stat-label">Paid Endpoints</div>
          </div>
          <div class="stat">
            <div class="stat-value">${liveServices.length}</div>
            <div class="stat-label">Services</div>
          </div>
          <div class="stat">
            <div class="stat-value">Testnet &amp; Mainnet</div>
            <div class="stat-label">Networks</div>
          </div>
          <div class="stat">
            <div class="stat-value">USDC mainnet, XLM testnet</div>
            <div class="stat-label">Payment Assets</div>
          </div>
        </div>

        <section class="section" id="catalogue">
          <div class="section-label reveal">Service Catalogue</div>
          <h2 class="section-title reveal reveal-delay-1">Premium APIs, pay-per-call</h2>
          <p class="section-subtitle reveal reveal-delay-2">
            Each service is protected by the x402 payment protocol. Connect your Freighter wallet,
            call an endpoint, and pay only for what you use.
          </p>
          <div class="catalogue-grid">
            ${liveServices.map((s, i) => renderServiceCard(s, catalog, i)).join("")}
          </div>
        </section>

        <section class="section">
          <div class="section-label reveal">How It Works</div>
          <h2 class="section-title reveal reveal-delay-1">Three steps to paid API access</h2>
          <p class="section-subtitle reveal reveal-delay-2">
            The x402 protocol turns HTTP 402 into a native payment flow. No API keys, no subscriptions.
          </p>
          <div class="how-grid">
            <div class="how-step reveal reveal-delay-1">
              <div class="how-step-number">1</div>
              <h4>Call any endpoint</h4>
              <p>Make a standard HTTP request to any paid route. The server responds with 402 Payment Required and payment details.</p>
            </div>
            <div class="how-step reveal reveal-delay-2">
              <div class="how-step-number">2</div>
              <h4>Sign with Freighter</h4>
              <p>Your wallet creates a Stellar payment in the asset offered for that route. The signed transaction is attached to the retry request.</p>
            </div>
            <div class="how-step reveal reveal-delay-3">
              <div class="how-step-number">3</div>
              <h4>Get your response</h4>
              <p>The facilitator verifies the payment and the server returns the API response. Instant, one-call settlement.</p>
            </div>
          </div>
        </section>

        <section class="section reveal">
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

export function renderEndpointDetail(endpoint: PublishedEndpoint, baseUrl: string) {
  const params = endpoint.bodySchema ?? endpoint.querySchema ?? [];
  const endpointId = `ep-${endpoint.id}-${endpoint.network}`.replace(/[^a-zA-Z0-9-]/g, "-");
  const requestEditor = endpoint.requestBodyExample ?? endpoint.requestInputExample;
  const requestEditorId = `request-${endpointId}`;
  const requestEditorLabel = endpoint.method === "POST" ? "Example Request JSON" : "Example Query JSON";
  const requestEditorFile = endpoint.method === "POST" ? "request.json" : "query.json";

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
            <div class="endpoint-section-label">${escapeHtml(requestEditorLabel)}</div>
            ${
              requestEditor
                ? `
            <div class="code-block">
              <div class="code-block-header">
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <span class="code-block-label">${escapeHtml(requestEditorFile)}</span>
              </div>
              <textarea class="request-editor" id="${escapeHtml(requestEditorId)}" spellcheck="false">${escapeHtml(requestEditor)}</textarea>
            </div>
            <p class="request-editor-help">Edit this JSON before trying the endpoint. The paid retry uses the exact same payload.</p>
            `
                : `
            <div class="code-block">
              <div class="code-block-header">
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <span class="code-block-label">request</span>
              </div>
              <pre>${escapeHtml(endpoint.requestExample)}</pre>
            </div>
            `
            }
            <div class="endpoint-section-label" style="margin-top: 14px;">CLI Example</div>
            <div class="code-block">
              <div class="code-block-header">
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <div class="code-block-dot"></div>
                <span class="code-block-label">curl</span>
              </div>
              <pre>${escapeHtml(endpoint.requestExample)}</pre>
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
          <button class="try-btn" data-endpoint-id="${endpointId}" data-method="${escapeHtml(endpoint.method)}" data-path="${escapeHtml(endpoint.fullPath)}" data-base-url="${escapeHtml(baseUrl)}" data-request-editor-id="${escapeHtml(requestEditorId)}" onclick="tryEndpoint(this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Try with Freighter
          </button>
          <div class="try-result" id="result-${endpointId}"></div>
        </div>
      </div>
    </details>
  `;
}

export function renderCatalogueClientScript() {
  return `
      <script>
      const STELLAR_RPC_URLS = {
        'stellar:pubnet': ${JSON.stringify(config.stellarRpcUrls.mainnet)},
        'stellar:testnet': ${JSON.stringify(config.stellarRpcUrls.testnet)},
      };
      const STELLAR_ASSET_LABELS = {
        'stellar:pubnet': {
          ${JSON.stringify(getUsdcAddress("stellar:pubnet"))}: 'USDC',
          ${
            getRoutePaymentAssets("mainnet").includes("XLM") &&
            config.networks.mainnet.xlmContractAddress
              ? `${JSON.stringify(config.networks.mainnet.xlmContractAddress)}: 'XLM',`
              : ""
          }
        },
        'stellar:testnet': {
          ${JSON.stringify(getUsdcAddress("stellar:testnet"))}: 'USDC',
          ${
            getRoutePaymentAssets("testnet").includes("XLM") &&
            config.networks.testnet.xlmContractAddress
              ? `${JSON.stringify(config.networks.testnet.xlmContractAddress)}: 'XLM',`
              : ""
          }
        },
      };

      function normalizeAssetId(value) {
        return typeof value === 'string' ? value.trim().toUpperCase() : '';
      }

      function getStellarAssetLabel(requirement) {
        if (!requirement || typeof requirement.network !== 'string') {
          return null;
        }

        const labels = STELLAR_ASSET_LABELS[requirement.network];
        if (!labels) {
          return null;
        }

        return labels[normalizeAssetId(requirement.asset)] || null;
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
        const text = await response.text();

        if (!text) {
          return null;
        }

        try {
          return JSON.parse(text);
        } catch (_err) {
          return text;
        }
      }

      function isPlainObject(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
      }

      function readRequestJson(btn) {
        const editorId = btn.dataset.requestEditorId;

        if (!editorId) {
          return {};
        }

        const editor = document.getElementById(editorId);
        if (!editor) {
          throw new Error('Request editor not found for this endpoint.');
        }

        let parsed;

        try {
          parsed = JSON.parse(editor.value);
        } catch (err) {
          throw new Error('Request JSON is invalid: ' + (err && err.message ? err.message : String(err)));
        }

        if (!isPlainObject(parsed)) {
          throw new Error('Request JSON must be a JSON object.');
        }

        return parsed;
      }

      function buildQueryString(payload) {
        const params = new URLSearchParams();

        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            return;
          }

          if (Array.isArray(value)) {
            const values = value
              .filter(item => item !== undefined && item !== null && item !== '')
              .map(item => String(item));

            if (values.length > 0) {
              params.set(key, values.join(','));
            }
            return;
          }

          if (typeof value === 'object') {
            throw new Error('Query JSON values must be strings, numbers, booleans, or arrays.');
          }

          params.set(key, String(value));
        });

        return params.toString();
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

      function findStellarRequirement(paymentRequired, assetLabel) {
        if (!paymentRequired || !Array.isArray(paymentRequired.accepts)) {
          return null;
        }

        return paymentRequired.accepts.find(requirement =>
          requirement &&
          requirement.scheme === 'exact' &&
          typeof requirement.network === 'string' &&
          requirement.network.indexOf('stellar:') === 0 &&
          (!assetLabel || getStellarAssetLabel(requirement) === assetLabel)
        ) || null;
      }

      function getAvailableStellarAssetLabels(paymentRequired) {
        if (!paymentRequired || !Array.isArray(paymentRequired.accepts)) {
          return [];
        }

        const labels = [];
        paymentRequired.accepts.forEach(requirement => {
          const label = getStellarAssetLabel(requirement);
          if (label && !labels.includes(label)) {
            labels.push(label);
          }
        });
        return labels;
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
          const requestPayload = readRequestJson(btn);
          const fetchOpts = {
            method,
            headers: { 'Content-Type': 'application/json' },
          };
          let finalUrl = url;

          if (method === 'POST') {
            fetchOpts.body = JSON.stringify(requestPayload);
          } else {
            const query = buildQueryString(requestPayload);
            if (query) {
              const sep = path.includes('?') ? '&' : '?';
              finalUrl = url + sep + query;
            }
          }

          const response = await fetch(finalUrl, fetchOpts);
          const body = await readResponseBody(response);

          if (response.status === 402) {
            const paymentRequiredHeader = response.headers.get('payment-required');
            if (!paymentRequiredHeader) {
              throw new Error('402 response is missing the PAYMENT-REQUIRED header.');
            }

            const paymentRequired = decodeBase64Json(paymentRequiredHeader);
            const availableAssetLabels = getAvailableStellarAssetLabels(paymentRequired);
            const paymentButtons = ['USDC', 'XLM']
              .filter(label => availableAssetLabels.includes(label))
              .map(label =>
                '<button class="try-btn pay-freighter-btn" data-asset-label="' + label + '">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' +
                'Pay with ' + label +
                '</button>'
              )
              .join('');
            const ctx = {
              method,
              url: finalUrl,
              fetchOpts,
              body,
              responseHeaders: normalizeHeaders(response.headers),
              paymentRequired,
            };

            resultEl.innerHTML =
              '<div class="try-status status-402">&#9888; 402 Payment Required</div>' +
              '<pre>' + escapeHtmlClient(JSON.stringify(body, null, 2)) + '</pre>' +
              '<div class="wallet-actions" style="margin-top: 16px;">' +
              paymentButtons +
              '</div>';

            resultEl.querySelectorAll('.pay-freighter-btn').forEach(payBtn => {
              payBtn.__x402ctx = ctx;
              payBtn.addEventListener('click', function() {
                payWithFreighter(this, this.__x402ctx, this.dataset.assetLabel || '');
              });
            });
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

      async function payWithFreighter(btn, ctx, assetLabel) {
        const resultEl = btn.closest('.try-section').querySelector('.try-result');
        const selectedAssetLabel = assetLabel || 'wallet';

        btn.disabled = true;
        btn.textContent = 'Reading payment requirements...';
        clearInlineError(btn);

        try {
          const paymentRequired = ctx && ctx.paymentRequired ? ctx.paymentRequired : null;
          const stellarRequirement = findStellarRequirement(paymentRequired, assetLabel);

          if (!stellarRequirement) {
            throw new Error('No Stellar payment option was returned for ' + selectedAssetLabel + '.');
          }

          btn.textContent = 'Connecting Freighter...';
          if (!window.X402Freighter || typeof window.X402Freighter.connectAndCreateHttpClient !== 'function') {
            throw new Error('Freighter payment client failed to load. Please refresh the page.');
          }

          const { address, httpClient } = await window.X402Freighter.connectAndCreateHttpClient({
            network: stellarRequirement.network,
            rpcUrls: STELLAR_RPC_URLS,
            preferredAsset: stellarRequirement.asset,
          });

          if (!address) {
            throw new Error('No wallet address was returned from Freighter.');
          }

          btn.textContent = 'Building x402 payment...';
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
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Retry ' + selectedAssetLabel + ' Payment';
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

