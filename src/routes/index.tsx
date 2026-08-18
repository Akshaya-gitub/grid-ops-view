import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  ClipboardList,
  Clock,
  PackageX,
  PlayCircle,
  RefreshCw,
  Siren,
  Sparkles,
  Truck,
  Warehouse,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OmniWarehouse OS — Operations Command Center" },
      {
        name: "description",
        content:
          "Live warehouse command center: order queue priority, bin-level stock map, SLA countdowns and exception resolution in one screen.",
      },
      { property: "og:title", content: "OmniWarehouse OS — Operations Command Center" },
      {
        property: "og:description",
        content:
          "Monitor orders, bin stock levels, SLA breaches and dispatch exceptions from a single real-time dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommandCenter,
});

type Order = {
  id: string;
  customer: string;
  items: number;
  status: "Picking" | "Packing" | "Staged" | "Blocked" | "Ready";
  priority: number;
  sla: number; // seconds remaining
  lane: string;
};

const BASE_ORDERS: Order[] = [
  { id: "ORD-48211", customer: "Northwind Retail", items: 14, status: "Blocked", priority: 98, sla: 240, lane: "Zone A" },
  { id: "ORD-48207", customer: "Kestrel Grocers", items: 6, status: "Picking", priority: 91, sla: 610, lane: "Zone B" },
  { id: "ORD-48219", customer: "Halden Pharma", items: 3, status: "Packing", priority: 87, sla: 900, lane: "Zone C" },
  { id: "ORD-48198", customer: "Volta Electronics", items: 22, status: "Staged", priority: 74, sla: 1500, lane: "Zone A" },
  { id: "ORD-48224", customer: "Meridian Sports", items: 9, status: "Picking", priority: 66, sla: 2100, lane: "Zone B" },
  { id: "ORD-48180", customer: "Ridgeline Cafe", items: 4, status: "Ready", priority: 52, sla: 3300, lane: "Zone C" },
  { id: "ORD-48231", customer: "Aster Home", items: 11, status: "Picking", priority: 44, sla: 4200, lane: "Zone A" },
  { id: "ORD-48233", customer: "Pinewood Supply", items: 7, status: "Staged", priority: 38, sla: 5400, lane: "Zone B" },
];

type Bin = { id: string; zone: "A" | "B" | "C"; sku: string; level: number };

const ZONES: Array<"A" | "B" | "C"> = ["A", "B", "C"];

function buildBins(): Bin[] {
  const seeds = [82, 64, 12, 0, 95, 47, 28, 71, 6, 88, 55, 33, 91, 18, 0, 60, 74, 41, 9, 86, 25, 68, 50, 97];
  return seeds.map((level, i) => ({
    id: `${ZONES[Math.floor(i / 8)]}-${String((i % 8) + 1).padStart(2, "0")}`,
    zone: ZONES[Math.floor(i / 8)],
    sku: `SKU-${4100 + i * 7}`,
    level,
  }));
}

type Alert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  recommendation: string;
  actions: [string, string];
};

const BASE_ALERTS: Alert[] = [
  {
    id: "EX-1042",
    severity: "critical",
    title: "Stockout on SKU-4128",
    detail: "Bin A-04 empty · blocks ORD-48211 (14 items)",
    recommendation: "Substitute from Zone C overflow (B-15 → A-04) and release the order.",
    actions: ["Approve transfer", "Split order"],
  },
  {
    id: "EX-1039",
    severity: "warning",
    title: "SLA risk: 3 orders under 5 min",
    detail: "Pick path congestion at aisle A2",
    recommendation: "Reroute two pickers from Zone C to A2 for the next wave.",
    actions: ["Reassign pickers", "Snooze 5m"],
  },
  {
    id: "EX-1036",
    severity: "warning",
    title: "Dock 3 dispatch backlog",
    detail: "7 staged pallets · carrier ETA slipped 22 min",
    recommendation: "Shift 4 pallets to Dock 5 and re-scan manifests.",
    actions: ["Move to Dock 5", "Notify carrier"],
  },
  {
    id: "EX-1030",
    severity: "info",
    title: "Cycle count due in Zone B",
    detail: "12 bins unverified for 48h",
    recommendation: "Queue an off-peak count at 21:00 to protect pick accuracy.",
    actions: ["Schedule count", "Dismiss"],
  },
];

const STEPS = ["Inbound", "Putaway", "Pick", "Pack", "Stage", "Dispatch"] as const;

function fmt(seconds: number) {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function levelTone(level: number) {
  if (level === 0) return { cls: "bg-danger/25 border-danger text-danger", label: "Stockout" };
  if (level < 30) return { cls: "bg-warn/20 border-warn text-warn", label: "Low" };
  if (level < 70) return { cls: "bg-info/15 border-info/70 text-info", label: "Healthy" };
  return { cls: "bg-ready/20 border-ready text-ready", label: "Full" };
}

const statusTone: Record<Order["status"], string> = {
  Blocked: "bg-danger/20 text-danger border-danger/50",
  Picking: "bg-info/15 text-info border-info/40",
  Packing: "bg-warn/15 text-warn border-warn/40",
  Staged: "bg-primary/15 text-primary border-primary/40",
  Ready: "bg-ready/15 text-ready border-ready/40",
};

function CommandCenter() {
  const [orders, setOrders] = useState(BASE_ORDERS);
  const [bins, setBins] = useState(buildBins);
  const [alerts, setAlerts] = useState(BASE_ALERTS);
  const [activeStep, setActiveStep] = useState(2);
  const [selectedBin, setSelectedBin] = useState<string | null>("A-04");
  const [selectedOrder, setSelectedOrder] = useState<string>("ORD-48211");
  const [dispatchRate, setDispatchRate] = useState(94);
  const [log, setLog] = useState<string[]>(["System armed · 06:29 UTC"]);

  useEffect(() => {
    const t = setInterval(() => {
      setOrders((prev) => prev.map((o) => ({ ...o, sla: Math.max(0, o.sla - 1) })));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const sorted = useMemo(() => [...orders].sort((a, b) => b.priority - a.priority), [orders]);
  const breaches = orders.filter((o) => o.sla < 300).length;
  const lowStock = bins.filter((b) => b.level < 30).length;
  const stockouts = bins.filter((b) => b.level === 0).length;
  const bin = bins.find((b) => b.id === selectedBin);

  const note = (m: string) => setLog((l) => [m, ...l].slice(0, 6));

  const simulate = {
    surge() {
      setOrders((prev) =>
        prev.map((o) => ({ ...o, priority: Math.min(99, o.priority + 4), sla: Math.max(30, o.sla - 180) })),
      );
      setDispatchRate((r) => Math.max(61, r - 9));
      note("Order surge injected · +18% inbound volume");
    },
    stockout() {
      setBins((prev) => prev.map((b, i) => (i % 7 === 3 ? { ...b, level: 0 } : b)));
      setAlerts((prev) => [
        {
          id: `EX-${1050 + prev.length}`,
          severity: "critical",
          title: "Multi-bin stockout cascade",
          detail: "4 bins hit zero across Zone A and B",
          recommendation: "Trigger emergency replenishment wave from inbound dock.",
          actions: ["Run replen wave", "Hold affected orders"],
        },
        ...prev,
      ]);
      note("Stockout cascade simulated across 4 bins");
    },
    dockDelay() {
      setActiveStep(4);
      setDispatchRate((r) => Math.max(48, r - 14));
      note("Dock delay simulated · dispatch rate degraded");
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar/80 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-md border border-primary/40 bg-primary/10 text-primary">
                <Warehouse size={22} />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">OmniWarehouse OS</h1>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Operations command center · Node DFW-02
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <SimButton icon={<Zap size={15} />} onClick={simulate.surge} label="Simulate order surge" />
              <SimButton icon={<PackageX size={15} />} onClick={simulate.stockout} label="Simulate stockout" tone="danger" />
              <SimButton icon={<Truck size={15} />} onClick={simulate.dockDelay} label="Simulate dock delay" tone="warn" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={<ClipboardList size={16} />} label="Active Orders" value={orders.length} sub="8 waves in flight" tone="primary" />
            <Kpi icon={<Siren size={16} />} label="SLA Breaches" value={breaches} sub="under 5 min to due" tone="danger" />
            <Kpi icon={<AlertTriangle size={16} />} label="Low Stock Alerts" value={lowStock} sub={`${stockouts} at zero`} tone="warn" />
            <Kpi icon={<Activity size={16} />} label="Dispatch Rate" value={`${dispatchRate}%`} sub="rolling 60 min" tone="ready" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-4 px-6 py-6 lg:grid-cols-[30fr_45fr_25fr]">
        {/* LEFT — order queue */}
        <section className="panel flex flex-col overflow-hidden">
          <PanelHead icon={<ClipboardList size={15} />} title="Order Queue" meta="sorted by priority score" />
          <ul className="divide-y divide-border overflow-y-auto">
            {sorted.map((o) => {
              const urgent = o.sla < 300;
              const active = selectedOrder === o.id;
              return (
                <li key={o.id}>
                  <button
                    onClick={() => setSelectedOrder(o.id)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-accent/60 ${active ? "bg-accent/70" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">{o.id}</span>
                      <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] ${urgent ? "border-danger/50 bg-danger/20 text-danger" : "border-border bg-muted text-muted-foreground"}`}>
                        <Clock size={11} /> {fmt(o.sla)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {o.customer} · {o.items} items · {o.lane}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${statusTone[o.status]}`}>
                        {o.status}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${o.priority}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">P{o.priority}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* CENTER — workflow + bin map */}
        <section className="flex flex-col gap-4">
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Workflow Status
              </h2>
              <span className="font-mono text-xs text-primary">{STEPS[activeStep]} stage active</span>
            </div>
            <div className="mt-4 flex items-center">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <button
                    onClick={() => setActiveStep(i)}
                    className="flex flex-col items-center gap-1.5"
                    aria-label={`Focus ${s} stage`}
                  >
                    <span
                      className={`grid size-8 place-items-center rounded-full border text-xs font-semibold transition-colors ${
                        i < activeStep
                          ? "border-ready bg-ready/20 text-ready"
                          : i === activeStep
                            ? "border-primary bg-primary/20 text-primary grid-glow"
                            : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {i < activeStep ? <Check size={14} /> : i + 1}
                    </span>
                    <span className={`text-[11px] ${i === activeStep ? "text-foreground" : "text-muted-foreground"}`}>
                      {s}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span className={`mx-2 mb-5 h-0.5 flex-1 ${i < activeStep ? "bg-ready" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="panel flex-1 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                <Boxes size={15} /> Bin Map
              </h2>
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <Legend cls="bg-ready" label="Full" />
                <Legend cls="bg-info" label="Healthy" />
                <Legend cls="bg-warn" label="Low" />
                <Legend cls="bg-danger" label="Stockout" />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {ZONES.map((z) => (
                <div key={z}>
                  <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Zone {z}
                  </p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {bins
                      .filter((b) => b.zone === z)
                      .map((b) => {
                        const tone = levelTone(b.level);
                        return (
                          <button
                            key={b.id}
                            onClick={() => setSelectedBin(b.id)}
                            className={`aspect-square rounded border p-1.5 text-left transition-transform hover:scale-[1.04] ${tone.cls} ${
                              selectedBin === b.id ? "ring-2 ring-primary" : ""
                            }`}
                          >
                            <span className="block font-mono text-[10px] opacity-80">{b.id}</span>
                            <span className="block font-display text-base font-bold leading-tight">{b.level}%</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {bin && (
              <div className="mt-4 rounded border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm">
                    Bin <span className="font-semibold text-primary">{bin.id}</span> · {bin.sku}
                  </p>
                  <span className={`rounded border px-2 py-0.5 text-[11px] ${levelTone(bin.level).cls}`}>
                    {levelTone(bin.level).label} · {bin.level}%
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {bin.level === 0
                    ? "Zero on hand. Replenishment required before the next pick wave."
                    : bin.level < 30
                      ? "Below reorder point. Replen task recommended this shift."
                      : "Within target band. No action required."}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT — exceptions */}
        <section className="flex flex-col gap-4">
          <div className="panel flex-1 overflow-hidden">
            <PanelHead icon={<Siren size={15} />} title="Exceptions" meta={`${alerts.length} open`} />
            <ul className="divide-y divide-border overflow-y-auto">
              {alerts.map((a) => {
                const tone =
                  a.severity === "critical"
                    ? "border-danger/50 bg-danger/15 text-danger"
                    : a.severity === "warning"
                      ? "border-warn/50 bg-warn/15 text-warn"
                      : "border-info/50 bg-info/15 text-info";
                return (
                  <li key={a.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold uppercase ${tone}`}>
                        {a.severity}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">{a.id}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                    <div className="mt-2 rounded border border-primary/30 bg-primary/10 p-2">
                      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                        <Sparkles size={11} /> Recommendation
                      </p>
                      <p className="mt-1 text-xs text-foreground/90">{a.recommendation}</p>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          setAlerts((prev) => prev.filter((x) => x.id !== a.id));
                          note(`${a.id} resolved · ${a.actions[0]}`);
                        }}
                        className="flex flex-1 items-center justify-center gap-1 rounded border border-ready/50 bg-ready/15 px-2 py-1.5 text-xs font-medium text-ready transition-colors hover:bg-ready/25"
                      >
                        <Check size={13} /> {a.actions[0]}
                      </button>
                      <button
                        onClick={() => note(`${a.id} deferred · ${a.actions[1]}`)}
                        className="flex flex-1 items-center justify-center gap-1 rounded border border-border bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
                      >
                        {a.actions[1]} <ArrowRight size={13} />
                      </button>
                    </div>
                  </li>
                );
              })}
              {alerts.length === 0 && (
                <li className="p-6 text-center text-sm text-muted-foreground">
                  All exceptions cleared. Floor is running to plan.
                </li>
              )}
            </ul>
          </div>

          <div className="panel p-4">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <RefreshCw size={14} /> Decision Log
            </h2>
            <ul className="mt-3 space-y-1.5">
              {log.map((l, i) => (
                <li key={i} className="font-mono text-[11px] text-muted-foreground">
                  <span className="text-primary">›</span> {l}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function SimButton({
  icon,
  label,
  onClick,
  tone = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "primary" | "warn" | "danger";
}) {
  const tones = {
    primary: "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20",
    warn: "border-warn/50 bg-warn/10 text-warn hover:bg-warn/20",
    danger: "border-danger/50 bg-danger/10 text-danger hover:bg-danger/20",
  } as const;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded border px-3 py-2 text-xs font-semibold transition-colors ${tones[tone]}`}
    >
      {icon}
      {label}
      <PlayCircle size={13} className="opacity-60" />
    </button>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  tone: "primary" | "warn" | "danger" | "ready";
}) {
  const tones = {
    primary: "text-primary border-primary/30",
    warn: "text-warn border-warn/30",
    danger: "text-danger border-danger/30",
    ready: "text-ready border-ready/30",
  } as const;
  return (
    <div className={`panel border-l-2 p-4 ${tones[tone]}`}>
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className={tones[tone].split(" ")[0]}>{icon}</span>
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function PanelHead({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </h2>
      <span className="font-mono text-[11px] text-muted-foreground">{meta}</span>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`size-2.5 rounded-sm ${cls}`} /> {label}
    </span>
  );
}
