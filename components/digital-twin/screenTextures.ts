import * as THREE from "three";

/**
 * screenTextures.ts
 *
 * Ultra-high-fidelity procedural Windows 11 Desktop and Application Canvas Textures
 * for Digital Twin workstations:
 *  - Windows 11 + Visual Studio Code (Full TypeScript Editor, Syntax Highlighting, File Tree, Terminal)
 *  - Windows 11 + Primavera P6 / MS Project (Gantt Schedule & Milestone Tracker)
 *  - Windows 11 + Microsoft Excel 365 (Bill of Quantities / Cost Estimation Spreadsheet)
 *  - Windows 11 + Autodesk AutoCAD 2026 (3D Turbine Runner & Powerhouse Layout)
 */

let _vsCodeTex: THREE.CanvasTexture | null = null;
let _planningTex: THREE.CanvasTexture | null = null;
let _qsExcelTex: THREE.CanvasTexture | null = null;
let _cadTex: THREE.CanvasTexture | null = null;

function createBaseWindows11Taskbar(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const tbHeight = 44;
  const tbY = height - tbHeight;

  // Taskbar background with acrylic glass tint
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, tbY, width, tbHeight);

  // Top subtle border
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(0, tbY, width, 1);

  // Centered taskbar icons
  const centerX = width / 2;
  const icons = [
    { color: "#0078D4", label: "⊞" }, // Start
    { color: "#71717A", label: "🔍" }, // Search
    { color: "#A1A1AA", label: "⧉" }, // Task view
    { color: "#F59E0B", label: "📁" }, // File Explorer
    { color: "#007ACC", label: "⌨" }, // VS Code
    { color: "#107C41", label: "📊" }, // Excel
    { color: "#0284C7", label: "🌐" }, // Edge
    { color: "#3B82F6", label: "💬" }, // Teams
    { color: "#27272A", label: ">_" }, // Terminal
  ];

  const iconSpacing = 36;
  const startX = centerX - ((icons.length - 1) * iconSpacing) / 2;

  icons.forEach((ic, i) => {
    const x = startX + i * iconSpacing;
    const y = tbY + 22;

    if (i === 4 || i === 0) {
      // Active indicator dot
      ctx.fillStyle = "#38BDF8";
      ctx.fillRect(x - 6, tbY + tbHeight - 3, 12, 2);
    }

    ctx.fillStyle = ic.color;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ic.label, x, y);
  });

  // System Tray (Right side)
  ctx.fillStyle = "#D4D4D8";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("ENG  🔊  📶  🔋  11:42 AM  |  08/27/2026", width - 20, tbY + 22);

  // Widget icon (Left side)
  ctx.fillStyle = "#A1A1AA";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("⛅ 28°C PAR Clear", 20, tbY + 22);
}

/**
 * 1. Windows 11 + Visual Studio Code (for Harrold IT Specialist)
 */
export function getVSCodeWindows11Texture(): THREE.CanvasTexture {
  if (_vsCodeTex) return _vsCodeTex;

  const width = 2048;
  const height = 1152;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, width, height);

  // ─── Windows 11 Title Bar ───
  ctx.fillStyle = "#252526";
  ctx.fillRect(0, 0, width, 36);

  ctx.fillStyle = "#007ACC";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("  ⚡ Visual Studio Code", 10, 18);

  ctx.fillStyle = "#A1A1AA";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TemfacilOfficeInterior.tsx — Project Nexus [WSL: Ubuntu-22.04]", width / 2, 18);

  // Window Controls
  ctx.fillStyle = "#A1A1AA";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("─    □    ✕   ", width - 10, 18);

  // ─── Menu Bar ───
  ctx.fillStyle = "#2D2D2D";
  ctx.fillRect(0, 36, width, 28);
  ctx.fillStyle = "#CCCCCC";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("  File    Edit    Selection    View    Go    Run    Terminal    Help", 10, 50);

  // ─── Left Activity Bar (Dark Icon Column) ───
  ctx.fillStyle = "#333333";
  ctx.fillRect(0, 64, 48, height - 108);

  const actIcons = ["📄", "🔍", "🌿", "▶", "📦", "⚙"];
  actIcons.forEach((ic, i) => {
    ctx.fillStyle = i === 0 ? "#FFFFFF" : "#858585";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ic, 24, 95 + i * 44);
  });

  // Active border indicator on Explorer icon
  ctx.fillStyle = "#0078D4";
  ctx.fillRect(0, 75, 3, 40);

  // ─── Left Sidebar (Explorer Tree) ───
  ctx.fillStyle = "#252526";
  ctx.fillRect(48, 64, 280, height - 108);

  ctx.fillStyle = "#BBBBBB";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("EXPLORER: PROJECT NEXUS", 60, 85);

  const files = [
    { text: "v components", indent: 60, color: "#CCCCCC" },
    { text: "   v digital-twin", indent: 72, color: "#CCCCCC" },
    { text: "      ⚛ TemfacilOfficeInterior.tsx", indent: 84, color: "#38BDF8" },
    { text: "      ⚛ RealisticHumanoidMesh.tsx", indent: 84, color: "#CCCCCC" },
    { text: "      ⚛ PlantScene.tsx", indent: 84, color: "#CCCCCC" },
    { text: "      ⚛ TurbineSpeedGovernor.tsx", indent: 84, color: "#CCCCCC" },
    { text: "      TS screenTextures.ts", indent: 84, color: "#38BDF8" },
    { text: "   > shared", indent: 72, color: "#858585" },
    { text: "   > weather", indent: 72, color: "#858585" },
    { text: "v lib", indent: 60, color: "#CCCCCC" },
    { text: "   TS scadaTelemetry.ts", indent: 72, color: "#CCCCCC" },
    { text: "   TS personnelLocations.ts", indent: 72, color: "#CCCCCC" },
    { text: "v app", indent: 60, color: "#CCCCCC" },
    { text: "   > (dashboard)", indent: 72, color: "#858585" },
    { text: "   ⚛ page.tsx", indent: 72, color: "#CCCCCC" },
    { text: "{} package.json", indent: 60, color: "#F59E0B" },
    { text: "⚙ tsconfig.json", indent: 60, color: "#38BDF8" },
  ];

  files.forEach((f, i) => {
    ctx.fillStyle = f.color;
    ctx.font = "12px monospace";
    ctx.fillText(f.text, f.indent, 115 + i * 22);
  });

  // ─── Tab Bar ───
  ctx.fillStyle = "#2D2D2D";
  ctx.fillRect(328, 64, width - 328, 36);

  // Active Tab
  ctx.fillStyle = "#1E1E1E";
  ctx.fillRect(328, 64, 250, 36);
  ctx.fillStyle = "#0078D4";
  ctx.fillRect(328, 64, 250, 2); // Blue top accent
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "12px sans-serif";
  ctx.fillText("⚛ TemfacilOfficeInterior.tsx  ✕", 345, 86);

  // Inactive Tabs
  ctx.fillStyle = "#858585";
  ctx.fillText("TS screenTextures.ts", 595, 86);
  ctx.fillText("⚛ RealisticHumanoidMesh.tsx", 760, 86);
  ctx.fillText("⚛ PlantScene.tsx", 970, 86);

  // Breadcrumbs
  ctx.fillStyle = "#1E1E1E";
  ctx.fillRect(328, 100, width - 328, 24);
  ctx.fillStyle = "#858585";
  ctx.font = "11px sans-serif";
  ctx.fillText("components > digital-twin > TemfacilOfficeInterior.tsx > Zone3_EngineeringDepartment", 345, 116);

  // ─── Main Code Editor ───
  const codeLines = [
    { num: 1, text: '// SCIC THEPP 11.3MW HYDROELECTRIC DIGITAL TWIN CONTROLLER', color: '#6A9955' },
    { num: 2, text: 'import React, { useMemo, useRef, useState, useEffect } from "react";', color: '#C586C0' },
    { num: 3, text: 'import * as THREE from "three";', color: '#C586C0' },
    { num: 4, text: 'import { useFrame } from "@react-three/fiber";', color: '#C586C0' },
    { num: 5, text: 'import { getVSCodeWindows11Texture } from "./screenTextures";', color: '#C586C0' },
    { num: 6, text: '', color: '#CCCCCC' },
    { num: 7, text: 'export function SCADATurbineGovernorDigitalTwin() {', color: '#569CD6' },
    { num: 8, text: '  const [powerOutputMW, setPowerMW] = useState<number>(11.30);', color: '#9CDCFE' },
    { num: 9, text: '  const [gridFrequencyHz, setGridFreq] = useState<number>(60.00);', color: '#9CDCFE' },
    { num: 10, text: '  const [needleValveOpening, setNeedleValve] = useState<number>(0.875);', color: '#9CDCFE' },
    { num: 11, text: '  const [governorStatus, setStatus] = useState<"SYNC" | "ONLINE">("SYNC");', color: '#4EC9B0' },
    { num: 12, text: '', color: '#CCCCCC' },
    { num: 13, text: '  // High-Frequency Closed-Loop Biomechanical Control Loop', color: '#6A9955' },
    { num: 14, text: '  useFrame((_, delta) => {', color: '#DCDCAA' },
    { num: 15, text: '    const headraceLevelM = 142.60;', color: '#9CDCFE' },
    { num: 16, text: '    const penstockPressureBar = headraceLevelM * 0.0981;', color: '#DCDCAA' },
    { num: 17, text: '    if (gridFrequencyHz < 59.98) {', color: '#C586C0' },
    { num: 18, text: '      setNeedleValve((prev) => Math.min(1.0, prev + delta * 0.05));', color: '#DCDCAA' },
    { num: 19, text: '      setStatus("ONLINE");', color: '#CE9178' },
    { num: 20, text: '    }', color: '#C586C0' },
    { num: 21, text: '  });', color: '#DCDCAA' },
    { num: 22, text: '', color: '#CCCCCC' },
    { num: 23, text: '  return <SCADAFacilityTelemetryOverlay active={true} mw={powerOutputMW} />;', color: '#4EC9B0' },
    { num: 24, text: '}', color: '#569CD6' },
  ];

  codeLines.forEach((cl, i) => {
    const y = 145 + i * 22;
    // Line number
    ctx.fillStyle = "#858585";
    ctx.font = "12px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${cl.num}`, 365, y);

    // Code text
    ctx.fillStyle = cl.color;
    ctx.textAlign = "left";
    ctx.fillText(cl.text, 385, y);
  });

  // Mini-map on right
  ctx.fillStyle = "#252526";
  ctx.fillRect(width - 90, 124, 90, height - 380);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 3 === 0 ? "#569CD6" : i % 2 === 0 ? "#6A9955" : "#9CDCFE";
    ctx.fillRect(width - 80, 135 + i * 8, 30 + (i % 5) * 8, 3);
  }

  // ─── Integrated Terminal Panel ───
  const termY = height - 260;
  ctx.fillStyle = "#18181b";
  ctx.fillRect(328, termY, width - 328, 216);

  // Terminal Tabs
  ctx.fillStyle = "#252526";
  ctx.fillRect(328, termY, width - 328, 28);
  ctx.fillStyle = "#E4E4E7";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("  PROBLEMS 0    OUTPUT    DEBUG CONSOLE    TERMINAL (node) 1: bash    PORTS", 335, termY + 18);

  const termLogs = [
    { text: "user@SCIC-THEPP-ENG-WS1:~/Project-Nexus$ npm run dev", color: "#A1A1AA" },
    { text: "▲ Next.js 16.2.9 (Turbopack) - Ready in 410ms", color: "#38BDF8" },
    { text: "✓ Compiled /digital-twin in 180ms (47 routes synced with 0 errors)", color: "#22C55E" },
    { text: "[SCADA-ENGINE] Telemetry stream active: 11.30 MW, 60.00 Hz, Penstock 13.98 bar [NORMAL]", color: "#38BDF8" },
    { text: "[WSL2-DAEMON] Hardware WebGL 3D Acceleration: Active (NVIDIA RTX GPU)", color: "#A1A1AA" },
    { text: "user@SCIC-THEPP-ENG-WS1:~/Project-Nexus$ _", color: "#FACC15" },
  ];

  termLogs.forEach((tl, i) => {
    ctx.fillStyle = tl.color;
    ctx.font = "12px monospace";
    ctx.fillText(tl.text, 345, termY + 50 + i * 22);
  });

  // ─── VS Code Status Bar ───
  ctx.fillStyle = "#007ACC";
  ctx.fillRect(0, height - 68, width, 24);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("  🌿 main*    ✕ 0  ⚠ 0    TypeScript JSX    UTF-8    LF    Ln 14, Col 28    Prettier: ✓", 10, height - 52);

  // ─── Windows 11 Taskbar ───
  createBaseWindows11Taskbar(ctx, width, height);

  _vsCodeTex = new THREE.CanvasTexture(canvas);
  _vsCodeTex.minFilter = THREE.LinearFilter;
  _vsCodeTex.magFilter = THREE.LinearFilter;
  _vsCodeTex.generateMipmaps = true;
  return _vsCodeTex;
}

/**
 * 2. Windows 11 + Primavera P6 / MS Project (for Engr. May Ann Parallag)
 */
export function getPlanningGanttWindows11Texture(): THREE.CanvasTexture {
  if (_planningTex) return _planningTex;

  const width = 1600;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, width, height);

  // App Window Title Bar
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, width, 36);
  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("  📊 Oracle Primavera P6 / MS Project — SCIC 11.3MW THEPP Master Construction Schedule", 10, 18);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("─    □    ✕   ", width - 10, 18);

  // Toolbar
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(0, 36, width, 32);
  ctx.fillStyle = "#F1F5F9";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("  Project    Activities    WBS    Resource Sheets    Baseline Track    Critical Path Filter    Reports", 10, 52);

  // Schedule Table Header
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, 68, 620, 28);
  ctx.fillStyle = "#E2E8F0";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("  WBS / Activity Name                     Duration     Start Date      Finish Date      % Done", 10, 84);

  // Gantt Chart Header
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(620, 68, width - 620, 28);
  ctx.fillStyle = "#38BDF8";
  ctx.fillText("  Q1 2026                 Q2 2026                 Q3 2026                 Q4 2026", 640, 84);

  const activities = [
    { name: "1.0 POWERHOUSE CIVIL STRUCTURE", dur: "180d", start: "Jan 15", end: "Jul 15", pct: "92%", color: "#22C55E", gx: 640, gw: 320 },
    { name: "  1.1 Foundation & Substructure Concrete", dur: "60d", start: "Jan 15", end: "Mar 15", pct: "100%", color: "#22C55E", gx: 640, gw: 120 },
    { name: "  1.2 Superstructure & Steel Roof Trusses", dur: "45d", start: "Mar 16", end: "Apr 30", pct: "100%", color: "#22C55E", gx: 760, gw: 90 },
    { name: "  1.3 Architectural & Interior Finishing", dur: "75d", start: "May 01", end: "Jul 15", pct: "84%", color: "#38BDF8", gx: 850, gw: 110 },
    { name: "2.0 ELECTROMECHANICAL WORKS", dur: "150d", start: "Apr 01", end: "Aug 30", pct: "78%", color: "#F59E0B", gx: 780, gw: 280 },
    { name: "  2.1 Pelton / Francis Turbine Installation", dur: "60d", start: "Apr 01", end: "May 31", pct: "90%", color: "#22C55E", gx: 780, gw: 110 },
    { name: "  2.2 11.3MW Synchronous Generator", dur: "60d", start: "Jun 01", end: "Jul 31", pct: "80%", color: "#F59E0B", gx: 890, gw: 110 },
    { name: "  2.3 SCADA & Speed Governor Calibration", dur: "30d", start: "Aug 01", end: "Aug 30", pct: "65%", color: "#38BDF8", gx: 1000, gw: 60 },
    { name: "3.0 SWITCHYARD & GRID INTERCONNECTION", dur: "90d", start: "May 15", end: "Aug 15", pct: "85%", color: "#22C55E", gx: 860, gw: 180 },
    { name: "4.0 WET COMMISSIONING & SYNCHRONIZATION", dur: "45d", start: "Sep 01", end: "Oct 15", pct: "20%", color: "#EF4444", gx: 1060, gw: 90 },
  ];

  activities.forEach((act, i) => {
    const y = 115 + i * 36;
    ctx.fillStyle = i % 2 === 0 ? "#0F172A" : "#1E293B";
    ctx.fillRect(0, y - 18, width, 36);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = act.name.startsWith("  ") ? "12px sans-serif" : "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(act.name, 10, y);
    ctx.fillText(`${act.dur}    ${act.start}    ${act.end}     ${act.pct}`, 320, y);

    // Gantt progress bar
    ctx.fillStyle = act.color;
    ctx.fillRect(act.gx, y - 8, act.gw, 16);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "10px sans-serif";
    ctx.fillText(act.pct, act.gx + 5, y + 4);
  });

  // Windows 11 Taskbar
  createBaseWindows11Taskbar(ctx, width, height);

  _planningTex = new THREE.CanvasTexture(canvas);
  _planningTex.minFilter = THREE.LinearFilter;
  _planningTex.magFilter = THREE.LinearFilter;
  return _planningTex;
}

/**
 * 3. Windows 11 + Microsoft Excel 365 (for Quantity Surveyors Cristine & Junior QS)
 */
export function getQSExcelWindows11Texture(): THREE.CanvasTexture {
  if (_qsExcelTex) return _qsExcelTex;

  const width = 1600;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Excel Title Bar
  ctx.fillStyle = "#107C41";
  ctx.fillRect(0, 0, width, 36);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("  📊 Excel — SCIC_THEPP_Bill_Of_Quantities_Progress_Billing_Rev5.xlsx", 10, 18);

  ctx.font = "13px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("─    □    ✕   ", width - 10, 18);

  // Excel Ribbon Menu
  ctx.fillStyle = "#F3F4F6";
  ctx.fillRect(0, 36, width, 32);
  ctx.fillStyle = "#1F2937";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("  File    Home    Insert    Page Layout    Formulas    Data    Review    View    Automate", 10, 52);

  // Formula Bar
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 68, width, 26);
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("  fx ", 10, 81);
  ctx.fillStyle = "#111827";
  ctx.font = "12px monospace";
  ctx.fillText(" =SUM(G12:G85) * 1.12  (Total Cumulative Progress Claim)", 40, 81);

  // Spreadsheet Header Columns
  const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const colNames = ["Item No.", "Description of Works", "Unit", "Contract Qty", "Unit Price (PHP)", "Actual Installed", "Amount (PHP)", "Status"];
  const colWidths = [80, 480, 80, 120, 160, 140, 200, 140];

  let cx = 0;
  ctx.fillStyle = "#E5E7EB";
  ctx.fillRect(0, 94, width, 26);

  cols.forEach((col, i) => {
    ctx.fillStyle = "#4B5563";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${col} - ${colNames[i]}`, cx + colWidths[i] / 2, 107);
    cx += colWidths[i];
  });

  // Spreadsheet Rows
  const rows = [
    ["1.1.1", "Mass Concrete Class A (Powerhouse Substructure)", "cu.m", "3,450.00", "₱ 6,850.00", "3,450.00", "₱ 23,632,500.00", "100% COMPLETE"],
    ["1.1.2", "Deformed Reinforcing Steel Bars Grade 60", "kg", "285,000.00", "₱ 68.50", "285,000.00", "₱ 19,522,500.00", "100% COMPLETE"],
    ["1.2.1", "Structural Steel Framing & Roof Purlins", "kg", "95,400.00", "₱ 112.00", "95,400.00", "₱ 10,684,800.00", "100% COMPLETE"],
    ["1.3.1", "Temfacil Main Technical Office Partitioning", "sq.m", "480.00", "₱ 2,450.00", "440.00", "₱ 1,078,000.00", "91.7% ACTIVE"],
    ["2.1.1", "11.3MW Pelton Turbine Runner & Casing Supply", "set", "1.00", "₱ 48,500,000.00", "0.90", "₱ 43,650,000.00", "90% INSTALLED"],
    ["2.2.1", "Synchronous Generator 13.8kV & Excitation System", "set", "1.00", "₱ 36,200,000.00", "0.85", "₱ 30,770,000.00", "85% INSTALLED"],
    ["2.3.1", "SCADA Automation, PLC Racks & Fiber Backbone", "lot", "1.00", "₱ 14,800,000.00", "0.75", "₱ 11,100,000.00", "75% ACTIVE"],
    ["3.1.1", "69kV Step-Up Main Power Transformer", "unit", "1.00", "₱ 22,400,000.00", "0.85", "₱ 19,040,000.00", "85% COMPLETE"],
    ["TOTAL", "CUMULATIVE DIRECT CONTRACT PROGRESS CLAIM", "", "", "", "", "₱ 159,477,800.00", "VALIDATED"],
  ];

  rows.forEach((row, r) => {
    const y = 138 + r * 30;
    ctx.fillStyle = r === rows.length - 1 ? "#DCFCE7" : r % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
    ctx.fillRect(0, y - 18, width, 30);

    let rcx = 0;
    row.forEach((cell, c) => {
      ctx.fillStyle = r === rows.length - 1 ? "#166534" : "#111827";
      ctx.font = r === rows.length - 1 ? "bold 12px sans-serif" : "12px sans-serif";
      ctx.textAlign = c === 1 ? "left" : c === 0 ? "center" : "right";
      const tx = c === 1 ? rcx + 10 : c === 0 ? rcx + colWidths[c] / 2 : rcx + colWidths[c] - 10;
      ctx.fillText(cell, tx, y);
      rcx += colWidths[c];
    });
  });

  // Windows 11 Taskbar
  createBaseWindows11Taskbar(ctx, width, height);

  _qsExcelTex = new THREE.CanvasTexture(canvas);
  _qsExcelTex.minFilter = THREE.LinearFilter;
  _qsExcelTex.magFilter = THREE.LinearFilter;
  return _qsExcelTex;
}

/**
 * 4. Windows 11 + Autodesk AutoCAD 2026 3D Layout (for Mechanical & Civil Engineers)
 */
export function getCADWindows11Texture(): THREE.CanvasTexture {
  if (_cadTex) return _cadTex;

  const width = 1600;
  const height = 900;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // AutoCAD Dark Workspace
  ctx.fillStyle = "#212830";
  ctx.fillRect(0, 0, width, height);

  // AutoCAD Title Bar
  ctx.fillStyle = "#0D1117";
  ctx.fillRect(0, 0, width, 36);
  ctx.fillStyle = "#E6EDF3";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("  📐 Autodesk AutoCAD 2026 — [THEPP_Powerhouse_Pelton_Turbine_Assembly_3D.dwg]", 10, 18);

  ctx.font = "13px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("─    □    ✕   ", width - 10, 18);

  // AutoCAD Ribbon
  ctx.fillStyle = "#161B22";
  ctx.fillRect(0, 36, width, 38);
  ctx.fillStyle = "#C9D1D9";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("  Home    Solid    Surface    Mesh    Visualize    Parametric    Insert    Annotate    View    Manage", 10, 55);

  // 3D Coordinate Grid Lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 74);
    ctx.lineTo(x, height - 80);
    ctx.stroke();
  }
  for (let y = 74; y < height - 80; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3D Pelton Turbine Wireframe Graphic
  const cx = width / 2;
  const cy = (height - 80) / 2 + 30;

  // Outer Spiral Casing
  ctx.strokeStyle = "#38BDF8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 180, 0, Math.PI * 1.75);
  ctx.stroke();

  // Spiral Casing Inlet Penstock Pipe
  ctx.beginPath();
  ctx.moveTo(cx + 127, cy - 127);
  ctx.lineTo(cx + 340, cy - 127);
  ctx.moveTo(cx + 180, cy);
  ctx.lineTo(cx + 340, cy);
  ctx.stroke();

  // Pelton Runner Inner Hub
  ctx.strokeStyle = "#F59E0B";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 75, 0, Math.PI * 2);
  ctx.stroke();

  // Pelton Buckets / Spoons (16 buckets)
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI * 2) / 16;
    const bx = cx + Math.cos(angle) * 110;
    const by = cy + Math.sin(angle) * 110;

    ctx.strokeStyle = "#22C55E";
    ctx.beginPath();
    ctx.arc(bx, by, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Dimension Callouts & Annotations
  ctx.strokeStyle = "#EF4444";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 180, cy - 200);
  ctx.lineTo(cx + 180, cy - 200);
  ctx.stroke();
  ctx.fillStyle = "#EF4444";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillText("Ø 2,400 mm RUNNER DIAMETER", cx, cy - 210);

  // Command Line at bottom
  ctx.fillStyle = "#0D1117";
  ctx.fillRect(0, height - 90, width, 46);
  ctx.fillStyle = "#38BDF8";
  ctx.font = "12px monospace";
  ctx.textAlign = "left";
  ctx.fillText("  Command: 3DORBIT", 10, height - 70);
  ctx.fillStyle = "#8B949E";
  ctx.fillText("  Regenerating 3D model... Viewport rendering: Shaded with Edges. 11.3MW Pelton Assembly OK.", 10, height - 52);

  // Windows 11 Taskbar
  createBaseWindows11Taskbar(ctx, width, height);

  _cadTex = new THREE.CanvasTexture(canvas);
  _cadTex.minFilter = THREE.LinearFilter;
  _cadTex.magFilter = THREE.LinearFilter;
  return _cadTex;
}

let _mechKbTex: THREE.CanvasTexture | null = null;
let _laptopDeckTex: THREE.CanvasTexture | null = null;

/**
 * 5. Standalone Mechanical Gaming / Engineering Keyboard Texture (Tenkeyless / Full Mechanical Layout)
 */
export function getMechanicalKeyboardTexture(): THREE.CanvasTexture {
  if (_mechKbTex) return _mechKbTex;

  const width = 1024;
  const height = 384;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Keyboard Case (Anodized Dark Gray Aluminum with Chamfered Edges)
  ctx.fillStyle = "#121216";
  ctx.fillRect(0, 0, width, height);

  // Outer beveled frame
  ctx.strokeStyle = "#27272A";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // Keycap Switch Plate Surface (Subtle RGB underglow)
  ctx.fillStyle = "#18181f";
  ctx.fillRect(16, 16, width - 32, height - 32);

  // Keycap Matrix Setup (6 Rows: Function, Number, QWERTY, Home, Bottom, Space)
  const rows = [
    // Row 0: Function row
    [
      { label: "ESC", w: 48, c: "#EF4444" },
      { label: "", w: 24, blank: true },
      { label: "F1", w: 44 }, { label: "F2", w: 44 }, { label: "F3", w: 44 }, { label: "F4", w: 44 },
      { label: "", w: 20, blank: true },
      { label: "F5", w: 44 }, { label: "F6", w: 44 }, { label: "F7", w: 44 }, { label: "F8", w: 44 },
      { label: "", w: 20, blank: true },
      { label: "F9", w: 44 }, { label: "F10", w: 44 }, { label: "F11", w: 44 }, { label: "F12", w: 44 },
      { label: "", w: 24, blank: true },
      { label: "PRT", w: 44 }, { label: "SCR", w: 44 }, { label: "PAU", w: 44 },
    ],
    // Row 1: Number row
    [
      { label: "~ `", w: 44 },
      { label: "1 !", w: 44 }, { label: "2 @", w: 44 }, { label: "3 #", w: 44 }, { label: "4 $", w: 44 },
      { label: "5 %", w: 44 }, { label: "6 ^", w: 44 }, { label: "7 &", w: 44 }, { label: "8 *", w: 44 },
      { label: "9 (", w: 44 }, { label: "0 )", w: 44 }, { label: "- _", w: 44 }, { label: "= +", w: 44 },
      { label: "BACKSPACE", w: 90, c: "#334155" },
      { label: "", w: 24, blank: true },
      { label: "INS", w: 44 }, { label: "HM", w: 44 }, { label: "PGU", w: 44 },
    ],
    // Row 2: Tab + QWERTY
    [
      { label: "TAB", w: 68, c: "#334155" },
      { label: "Q", w: 44 }, { label: "W", w: 44, c: "#38BDF8" }, { label: "E", w: 44 }, { label: "R", w: 44 },
      { label: "T", w: 44 }, { label: "Y", w: 44 }, { label: "U", w: 44 }, { label: "I", w: 44 },
      { label: "O", w: 44 }, { label: "P", w: 44 }, { label: "[ {", w: 44 }, { label: "] }", w: 44 },
      { label: "\\ |", w: 66 },
      { label: "", w: 24, blank: true },
      { label: "DEL", w: 44 }, { label: "END", w: 44 }, { label: "PGD", w: 44 },
    ],
    // Row 3: CapsLock + Home row
    [
      { label: "CAPS", w: 78, c: "#334155" },
      { label: "A", w: 44, c: "#38BDF8" }, { label: "S", w: 44, c: "#38BDF8" }, { label: "D", w: 44, c: "#38BDF8" }, { label: "F", w: 44 },
      { label: "G", w: 44 }, { label: "H", w: 44 }, { label: "J", w: 44 }, { label: "K", w: 44 },
      { label: "L", w: 44 }, { label: "; :", w: 44 }, { label: "' \"", w: 44 },
      { label: "ENTER", w: 104, c: "#0284C7" },
      { label: "", w: 160, blank: true },
    ],
    // Row 4: Shift + ZXCV
    [
      { label: "SHIFT", w: 102, c: "#334155" },
      { label: "Z", w: 44 }, { label: "X", w: 44 }, { label: "C", w: 44 }, { label: "V", w: 44 },
      { label: "B", w: 44 }, { label: "N", w: 44 }, { label: "M", w: 44 }, { label: "< ,", w: 44 },
      { label: "> .", w: 44 }, { label: "? /", w: 44 },
      { label: "SHIFT", w: 128, c: "#334155" },
      { label: "", w: 70, blank: true },
      { label: "▲", w: 44, c: "#0284C7" },
    ],
    // Row 5: Spacebar & Modifiers
    [
      { label: "CTRL", w: 58, c: "#334155" },
      { label: "WIN", w: 50 },
      { label: "ALT", w: 54, c: "#334155" },
      { label: "SPACEBAR", w: 300, c: "#38BDF8" },
      { label: "ALT", w: 54, c: "#334155" },
      { label: "FN", w: 50 },
      { label: "CTRL", w: 58, c: "#334155" },
      { label: "", w: 24, blank: true },
      { label: "◀", w: 44, c: "#0284C7" },
      { label: "▼", w: 44, c: "#0284C7" },
      { label: "▶", w: 44, c: "#0284C7" },
    ],
  ];

  const keyHeight = 44;
  const keyGap = 6;
  let curY = 24;

  rows.forEach((row) => {
    let curX = 24;
    row.forEach((k) => {
      if (k.blank) {
        curX += k.w;
        return;
      }

      // Keycap Underglow Halo
      ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
      ctx.fillRect(curX - 2, curY - 2, k.w + 4, keyHeight + 4);

      // Keycap Base (PBT Double-Shot Plastic with Drop Shadow)
      ctx.fillStyle = k.c ? k.c : "#27272A";
      ctx.beginPath();
      ctx.roundRect(curX, curY, k.w, keyHeight, 4);
      ctx.fill();

      // Keycap Beveled Top Surface
      ctx.fillStyle = k.c ? k.c : "#3F3F46";
      ctx.beginPath();
      ctx.roundRect(curX + 2, curY + 2, k.w - 4, keyHeight - 6, 3);
      ctx.fill();

      // Keycap Legend Text
      ctx.fillStyle = k.c === "#38BDF8" ? "#0F172A" : "#FFFFFF";
      ctx.font = k.w > 60 ? "bold 10px sans-serif" : "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(k.label, curX + k.w / 2, curY + keyHeight / 2 - 2);

      curX += k.w + keyGap;
    });
    curY += keyHeight + keyGap;
  });

  // Status Indicator LEDs (NumLock, CapsLock, ScrollLock)
  const ledX = width - 110;
  const ledY = 28;
  ["NUM", "CAPS", "SCR"].forEach((lbl, i) => {
    ctx.fillStyle = i === 1 ? "#22C55E" : "#52525B";
    ctx.beginPath();
    ctx.arc(ledX + i * 30, ledY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#A1A1AA";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(lbl, ledX + i * 30, ledY + 12);
  });

  _mechKbTex = new THREE.CanvasTexture(canvas);
  _mechKbTex.minFilter = THREE.LinearFilter;
  _mechKbTex.magFilter = THREE.LinearFilter;
  return _mechKbTex;
}

/**
 * 6. Laptop Keyboard Deck & Glass Trackpad Texture (Chiclet Keys, Palmrest, Trackpad, Intel/RTX Stickers)
 */
export function getLaptopKeyboardDeckTexture(): THREE.CanvasTexture {
  if (_laptopDeckTex) return _laptopDeckTex;

  const width = 1024;
  const height = 768;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Anodized Aluminum Laptop Palmrest & Casing
  ctx.fillStyle = "#1E1E24";
  ctx.fillRect(0, 0, width, height);

  // Subtle brushed metal texture gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.03)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0.15)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Top Speaker Grilles
  ctx.fillStyle = "#121216";
  for (let y = 18; y < 45; y += 4) {
    for (let x = 60; x < 280; x += 6) {
      ctx.fillRect(x, y, 2, 2);
    }
    for (let x = width - 280; x < width - 60; x += 6) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Power Button (Top Right with Green LED)
  ctx.fillStyle = "#27272A";
  ctx.beginPath();
  ctx.roundRect(width - 80, 20, 36, 16, 4);
  ctx.fill();
  ctx.fillStyle = "#22C55E";
  ctx.beginPath();
  ctx.arc(width - 62, 28, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Recessed Keyboard Tray Well
  const trayX = 40;
  const trayY = 55;
  const trayW = width - 80;
  const trayH = 430;

  ctx.fillStyle = "#131317";
  ctx.beginPath();
  ctx.roundRect(trayX, trayY, trayW, trayH, 8);
  ctx.fill();

  // Inner Tray Shadow
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Laptop Chiclet Keyboard Matrix (6 Rows)
  const rows = [
    // Row 0: Function Keys
    [
      { label: "esc", w: 54 },
      { label: "F1", w: 50 }, { label: "F2", w: 50 }, { label: "F3", w: 50 }, { label: "F4", w: 50 },
      { label: "F5", w: 50 }, { label: "F6", w: 50 }, { label: "F7", w: 50 }, { label: "F8", w: 50 },
      { label: "F9", w: 50 }, { label: "F10", w: 50 }, { label: "F11", w: 50 }, { label: "F12", w: 50 },
      { label: "del", w: 54 }, { label: "pwr", w: 54 },
    ],
    // Row 1: Numbers
    [
      { label: "` ~", w: 52 },
      { label: "1", w: 52 }, { label: "2", w: 52 }, { label: "3", w: 52 }, { label: "4", w: 52 },
      { label: "5", w: 52 }, { label: "6", w: 52 }, { label: "7", w: 52 }, { label: "8", w: 52 },
      { label: "9", w: 52 }, { label: "0", w: 52 }, { label: "- _", w: 52 }, { label: "= +", w: 52 },
      { label: "backspace", w: 104 },
    ],
    // Row 2: QWERTY
    [
      { label: "tab", w: 78 },
      { label: "Q", w: 52 }, { label: "W", w: 52 }, { label: "E", w: 52 }, { label: "R", w: 52 },
      { label: "T", w: 52 }, { label: "Y", w: 52 }, { label: "U", w: 52 }, { label: "I", w: 52 },
      { label: "O", w: 52 }, { label: "P", w: 52 }, { label: "[", w: 52 }, { label: "]", w: 52 },
      { label: "\\", w: 78 },
    ],
    // Row 3: ASDF
    [
      { label: "caps lock", w: 92 },
      { label: "A", w: 52 }, { label: "S", w: 52 }, { label: "D", w: 52 }, { label: "F", w: 52 },
      { label: "G", w: 52 }, { label: "H", w: 52 }, { label: "J", w: 52 }, { label: "K", w: 52 },
      { label: "L", w: 52 }, { label: ";", w: 52 }, { label: "'", w: 52 },
      { label: "enter", w: 114, c: "#0284C7" },
    ],
    // Row 4: ZXCV
    [
      { label: "shift", w: 120 },
      { label: "Z", w: 52 }, { label: "X", w: 52 }, { label: "C", w: 52 }, { label: "V", w: 52 },
      { label: "B", w: 52 }, { label: "N", w: 52 }, { label: "M", w: 52 }, { label: ",", w: 52 },
      { label: ".", w: 52 }, { label: "/", w: 52 },
      { label: "shift", w: 138 },
      { label: "▲", w: 46 },
    ],
    // Row 5: Spacebar & Modifiers
    [
      { label: "ctrl", w: 60 },
      { label: "fn", w: 50 },
      { label: "win", w: 50 },
      { label: "alt", w: 60 },
      { label: "", w: 320 }, // Spacebar
      { label: "alt", w: 60 },
      { label: "ctrl", w: 60 },
      { label: "◀", w: 46 },
      { label: "▼", w: 46 },
      { label: "▶", w: 46 },
    ],
  ];

  const keyH = 54;
  const gap = 8;
  let ky = trayY + 14;

  rows.forEach((row) => {
    let kx = trayX + 16;
    row.forEach((k) => {
      // Chiclet Keycap Base
      ctx.fillStyle = k.c ? k.c : "#27272F";
      ctx.beginPath();
      ctx.roundRect(kx, ky, k.w, keyH, 4);
      ctx.fill();

      // Subtle Keycap Top Surface
      ctx.fillStyle = k.c ? k.c : "#32323C";
      ctx.beginPath();
      ctx.roundRect(kx + 1.5, ky + 1.5, k.w - 3, keyH - 4, 3);
      ctx.fill();

      // Keycap Legend Text
      if (k.label) {
        ctx.fillStyle = "#E4E4E7";
        ctx.font = k.w > 60 ? "11px sans-serif" : "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(k.label, kx + k.w / 2, ky + keyH / 2);
      }

      kx += k.w + gap;
    });
    ky += keyH + gap;
  });

  // ─── Large Centered Glass Touchpad / Trackpad ───
  const padW = 320;
  const padH = 210;
  const padX = (width - padW) / 2;
  const padY = trayY + trayH + 24;

  // Trackpad surface with subtle frosted glass finish
  ctx.fillStyle = "#222228";
  ctx.beginPath();
  ctx.roundRect(padX, padY, padW, padH, 10);
  ctx.fill();

  // Trackpad CNC Chamfer Edge
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bottom Center Subtle Click Indicator
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2, padY + padH - 24);
  ctx.lineTo(width / 2, padY + padH - 4);
  ctx.stroke();

  // Intel Core / NVIDIA RTX AI Palmrest Badges (Bottom Left)
  ctx.fillStyle = "#0071C5";
  ctx.beginPath();
  ctx.roundRect(60, height - 70, 52, 40, 4);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("intel", 86, height - 56);
  ctx.font = "bold 8px sans-serif";
  ctx.fillText("CORE i9", 86, height - 42);

  ctx.fillStyle = "#76B900";
  ctx.beginPath();
  ctx.roundRect(122, height - 70, 52, 40, 4);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 8px sans-serif";
  ctx.fillText("NVIDIA", 148, height - 56);
  ctx.fillText("RTX AI", 148, height - 42);

  _laptopDeckTex = new THREE.CanvasTexture(canvas);
  _laptopDeckTex.minFilter = THREE.LinearFilter;
  _laptopDeckTex.magFilter = THREE.LinearFilter;
  return _laptopDeckTex;
}

let _elbertBIMTex: THREE.CanvasTexture | null = null;

/**
 * 7. Sir Elbert CAD/BIM Multi-Software Screen Texture:
 *    - Autodesk Revit 2026 & Tekla Structures 3D Structural Steel Detailing
 *    - STAAD.Pro Connect Edition (Finite Element Analysis & Stress Heatmap)
 *    - Autodesk AutoCAD 2026 (Foundation & Rebar Cross Sections)
 */
export function getElbertStructuralBIMTexture(): THREE.CanvasTexture {
  if (_elbertBIMTex) return _elbertBIMTex;

  const width = 2048;
  const height = 1152;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background
  ctx.fillStyle = "#121316";
  ctx.fillRect(0, 0, width, height);

  // ─── TOP GLOBAL APPLICATION HEADER BAR ───
  ctx.fillStyle = "#1E1F24";
  ctx.fillRect(0, 0, width, 42);
  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("  ⚙ Autodesk Revit 2026 & Tekla Structures 2026 — Tumauini HEPP 11.3MW Powerhouse Structural Model.rvt", 12, 26);

  // Quick Action Buttons
  ctx.fillStyle = "#475569";
  ctx.fillRect(width - 240, 8, 70, 26);
  ctx.fillRect(width - 160, 8, 70, 26);
  ctx.fillRect(width - 80, 8, 70, 26);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SYNC IFC", width - 205, 25);
  ctx.fillText("STAAD RUN", width - 125, 25);
  ctx.fillText("EXPORT DWG", width - 45, 25);

  // ─── RIBBON TOOLBAR ───
  ctx.fillStyle = "#262830";
  ctx.fillRect(0, 42, width, 60);

  const tabs = [
    { name: "Structure", active: true },
    { name: "Steel", active: false },
    { name: "Precast", active: false },
    { name: "Tekla BIM", active: false },
    { name: "STAAD.Pro", active: false },
    { name: "Rebar", active: false },
    { name: "Analyze", active: false },
    { name: "Annotate", active: false },
  ];

  let tabX = 14;
  tabs.forEach((tab) => {
    ctx.fillStyle = tab.active ? "#38BDF8" : "transparent";
    ctx.fillRect(tabX, 44, 96, 26);
    ctx.fillStyle = tab.active ? "#0F172A" : "#94A3B8";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(tab.name, tabX + 48, 62);
    tabX += 104;
  });

  // Ribbon Tools Icons
  const tools = ["Column", "Beam", "Truss", "Bracing", "Foundation", "Anchor Bolts", "Connection", "Load Cases"];
  let toolX = 14;
  tools.forEach((tl, i) => {
    ctx.fillStyle = i === 1 || i === 2 ? "#38BDF8" : "#64748B";
    ctx.fillRect(toolX, 74, 76, 22);
    ctx.fillStyle = i === 1 || i === 2 ? "#0F172A" : "#F8FAFC";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(tl, toolX + 38, 89);
    toolX += 84;
  });

  // ─── MAIN LEFT VIEWPORT: TEKLA & REVIT 3D POWERHOUSE STRUCTURAL STEEL (60% Width) ───
  const vp1W = 1200;
  const vp1H = height - 102 - 44;
  const vp1X = 0;
  const vp1Y = 102;

  ctx.fillStyle = "#16181D";
  ctx.fillRect(vp1X, vp1Y, vp1W, vp1H);
  ctx.strokeStyle = "#27272A";
  ctx.lineWidth = 1;
  ctx.strokeRect(vp1X, vp1Y, vp1W, vp1H);

  // Viewport Title Overlay
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(vp1X + 10, vp1Y + 10, 360, 30);
  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("3D Structural Isometric — Tekla Structures 2026", vp1X + 20, vp1Y + 30);

  // Properties Panel on Left side of Viewport 1
  ctx.fillStyle = "#1E2026";
  ctx.fillRect(vp1X, vp1Y, 220, vp1H);
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("PROPERTIES", 16, vp1Y + 24);
  ctx.fillStyle = "#CBD5E1";
  ctx.font = "10px monospace";
  const props = [
    "Model: 11.3MW HEPP",
    "Selected: W14x90 Col",
    "Material: ASTM A992",
    "Yield (Fy): 345 MPa",
    "Grid: Axis 1 to 6",
    "Base EL: +0.000m",
    "Crane EL: +8.500m",
    "Roof EL: +14.500m",
    "Tekla Status: OK",
  ];
  props.forEach((p, idx) => {
    ctx.fillText(p, 16, vp1Y + 50 + idx * 20);
  });

  // 3D Isometric Structural Model Drawing
  const modelCenterX = vp1X + 220 + (vp1W - 220) / 2;
  const modelCenterY = vp1Y + vp1H / 2 + 30;

  // Grid Plane Ground Lines
  ctx.strokeStyle = "#2A2D36";
  ctx.lineWidth = 1;
  for (let g = -4; g <= 4; g++) {
    ctx.beginPath();
    ctx.moveTo(modelCenterX - 340 + g * 40, modelCenterY + 180 + g * 15);
    ctx.lineTo(modelCenterX + 180 + g * 40, modelCenterY - 80 + g * 15);
    ctx.stroke();
  }

  // Structural Steel Columns (W14x90 Columns along grid)
  const colBaseX = [
    modelCenterX - 240,
    modelCenterX - 140,
    modelCenterX - 40,
    modelCenterX + 60,
    modelCenterX + 160,
    modelCenterX + 260,
  ];

  colBaseX.forEach((bx, idx) => {
    const by = modelCenterY + 100 - idx * 15;
    const colH = 240;

    // Left Column
    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by - colH);
    ctx.stroke();

    // Right Column (Opposite wall across powerhouse bay)
    const rbx = bx - 100;
    const rby = by + 60;
    ctx.strokeStyle = "#0284C7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rbx, rby);
    ctx.lineTo(rbx, rby - colH);
    ctx.stroke();

    // Roof Truss Tie Beam & Diagonal Chords
    ctx.strokeStyle = "#22C55E";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by - colH);
    ctx.lineTo(rbx, rby - colH);
    ctx.lineTo((bx + rbx) / 2, by - colH - 45); // Truss Peak
    ctx.lineTo(bx, by - colH);
    ctx.stroke();

    // Overhead Crane Runway Girder (W24x68 at +8.5m)
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, by - colH * 0.58);
    ctx.lineTo(bx + 100, by - 15 - colH * 0.58);
    ctx.stroke();
  });

  // Longitudinal Steel Purlins and Eaves
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(colBaseX[0], modelCenterY + 100 - 240);
  ctx.lineTo(colBaseX[5], modelCenterY + 100 - 75 - 240);
  ctx.stroke();

  // 3D Viewport Orientation Triad
  const triadX = vp1W - 80;
  const triadY = vp1Y + 70;
  ctx.strokeStyle = "#EF4444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(triadX, triadY);
  ctx.lineTo(triadX + 30, triadY);
  ctx.stroke(); // X
  ctx.strokeStyle = "#22C55E";
  ctx.beginPath();
  ctx.moveTo(triadX, triadY);
  ctx.lineTo(triadX, triadY - 30);
  ctx.stroke(); // Y
  ctx.strokeStyle = "#38BDF8";
  ctx.beginPath();
  ctx.moveTo(triadX, triadY);
  ctx.lineTo(triadX - 20, triadY + 20);
  ctx.stroke(); // Z
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 9px sans-serif";
  ctx.fillText("X", triadX + 34, triadY + 4);
  ctx.fillText("Y", triadX - 4, triadY - 34);
  ctx.fillText("Z", triadX - 26, triadY + 26);

  // ─── RIGHT TOP VIEWPORT: STAAD.PRO CONNECT EDITION (Finite Element Stress Heatmap) ───
  const vp2X = vp1W;
  const vp2Y = 102;
  const vp2W = width - vp1W;
  const vp2H = (height - 102 - 44) / 2;

  ctx.fillStyle = "#0F141C";
  ctx.fillRect(vp2X, vp2Y, vp2W, vp2H);
  ctx.strokeStyle = "#27272A";
  ctx.strokeRect(vp2X, vp2Y, vp2W, vp2H);

  // STAAD Title
  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("STAAD.Pro CONNECT Edition — Bending Moment & Stress Diagram", vp2X + 16, vp2Y + 24);

  // Moment Curves with Stress Heatmap (Portal frame with load diagram)
  const pfx = vp2X + vp2W / 2;
  const pfy = vp2Y + vp2H / 2 + 40;

  // Frame with color gradient stress
  ctx.strokeStyle = "#22C55E"; // Column safe
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pfx - 180, pfy);
  ctx.lineTo(pfx - 180, pfy - 140);
  ctx.stroke();

  ctx.strokeStyle = "#EF4444"; // Beam center peak moment
  ctx.beginPath();
  ctx.moveTo(pfx - 180, pfy - 140);
  ctx.quadraticCurveTo(pfx, pfy - 110, pfx + 180, pfy - 140);
  ctx.stroke();

  ctx.strokeStyle = "#22C55E";
  ctx.beginPath();
  ctx.moveTo(pfx + 180, pfy - 140);
  ctx.lineTo(pfx + 180, pfy);
  ctx.stroke();

  // Color legend bar
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(vp2X + 16, vp2Y + vp2H - 36, vp2W - 32, 24);
  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 10px monospace";
  ctx.fillText("STRESS RATIO: 0.12 (BLUE) -> 0.45 (GREEN) -> 0.78 (YELLOW) -> PASS AISC 360-16 LRFD", vp2X + 24, vp2Y + vp2H - 20);

  // ─── RIGHT BOTTOM VIEWPORT: AUTODESK AUTOCAD 2026 (Foundation & Rebar Cross Sections) ───
  const vp3X = vp1W;
  const vp3Y = vp2Y + vp2H;
  const vp3W = width - vp1W;
  const vp3H = vp2H;

  ctx.fillStyle = "#0A0D12";
  ctx.fillRect(vp3X, vp3Y, vp3W, vp3H);
  ctx.strokeStyle = "#27272A";
  ctx.strokeRect(vp3X, vp3Y, vp3W, vp3H);

  // AutoCAD Title
  ctx.fillStyle = "#F59E0B";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("AutoCAD 2026 — Turbine Foundation & Penstock Anchor Rebar Detail", vp3X + 16, vp3Y + 24);

  // Rebar Detail Graphic
  const rbx = vp3X + 140;
  const rby = vp3Y + vp3H / 2 + 10;

  // Concrete Outline
  ctx.strokeStyle = "#94A3B8";
  ctx.lineWidth = 2;
  ctx.strokeRect(rbx - 100, rby - 60, 200, 120);

  // Rebar Grid lines
  ctx.strokeStyle = "#EF4444";
  ctx.lineWidth = 1.5;
  for (let rx = -90; rx <= 90; rx += 20) {
    ctx.beginPath();
    ctx.moveTo(rbx + rx, rby - 50);
    ctx.lineTo(rbx + rx, rby + 50);
    ctx.stroke();
  }
  for (let ry = -40; ry <= 40; ry += 20) {
    ctx.beginPath();
    ctx.moveTo(rbx - 90, rby + ry);
    ctx.lineTo(rbx + 90, rby + ry);
    ctx.stroke();
  }

  // Dimension & Leader Annotations
  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 10px monospace";
  ctx.fillText("16mm Ø @ 150mm O.C. BOTH WAYS EW/NS", rbx + 115, rby - 20);
  ctx.fillText("fc' = 28 MPa CONCRETE MASS POUR", rbx + 115, rby);
  ctx.fillText("ANCHOR BOLT: 4-32mm Ø ASTM F1554", rbx + 115, rby + 20);

  // AutoCAD Command Prompt
  ctx.fillStyle = "#0D1117";
  ctx.fillRect(vp3X, vp3Y + vp3H - 28, vp3W, 28);
  ctx.fillStyle = "#38BDF8";
  ctx.font = "11px monospace";
  ctx.fillText("Command: TEKLA_IFC_EXPORT -> Synced to Project Nexus BIM OK", vp3X + 10, vp3Y + vp3H - 10);

  // ─── WINDOWS 11 TASKBAR ───
  createBaseWindows11Taskbar(ctx, width, height);

  _elbertBIMTex = new THREE.CanvasTexture(canvas);
  _elbertBIMTex.minFilter = THREE.LinearFilter;
  _elbertBIMTex.magFilter = THREE.LinearFilter;
  return _elbertBIMTex;
}
