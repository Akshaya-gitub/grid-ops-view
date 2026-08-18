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
  Pin,
  PlayCircle,
  RotateCcw,
  ScrollText,
  Settings2,
  Siren,
  Sparkles,
  Truck,
  Warehouse,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  INITIAL_INVENTORY,
  INITIAL_ORDERS,
  URGENT_ORDER,
  ZONES,
  fmtClock,
  healthFor,
  statusFor,
  type Order,
  type OrderStatus,
  type Sku,
  type StockHealth,
} from "@/lib/warehouse-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

type Exception = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  recommendation: string;
  kind: "shortage" | "sla" | "dock" | "count";
  payload?: { orderId: string; sku: string; ship: number; reallocateFrom: string; reallocate: number };
};

const INITIAL_EXCEPTIONS: Exception[] = [
  {
    id: "EX-1039",
    severity: "warning",
    kind: "sla",
    title: "SLA risk: orders under 8 min",
    detail: "Pick path congestion at aisle A2",
    recommendation: "Reroute two pickers from Zone C to A2 for the next wave.",
  },
  {
    id: "EX-1030",
    severity: "info",
    kind: "count",
    title: "Cycle count due in Zone B",
    detail: "5 bins unverified for 48h",
    recommendation: "Queue an off-peak count at 21:00 to protect pick accuracy.",
  },
];

const statusTone: Record<OrderStatus, string> = {
  Pending: "bg-muted text-muted-foreground border-border",
  Partial: "bg-warn/15 text-warn border-warn/40",
  "Fully Allocated": "bg-ready/15 text-ready border-ready/40",
  Dispatched: "bg-primary/15 text-primary border-primary/40",
};

const healthTone: Record<StockHealth, string> = {
  Healthy: "bg-ready/20 border-ready text-ready",
  "Low Stock": "bg-warn/20 border-warn text-warn",
  Damaged: "bg-info/15 border-info/70 text-info",
  "Out of Stock": "bg-danger/25 border-danger text-danger",
};

const STEPS = ["Inbound", "Putaway", "Pick", "Pack", "Stage", "Dispatch"] as const;

type LogEntry = { id: number; t: string; msg: string; tone: string };

let logSeq = 1;

function CommandCenter() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [inventory, setInventory] = useState<Sku[]>(INITIAL_INVENTORY);
  const [exceptions, setExceptions] = useState<Exception[]>(INITIAL_EXCEPTIONS);
  const [activity, setActivity] = useState<LogEntry[]>([
    { id: 0, t: "06:29:00", msg: "Shift started · 10 orders loaded, 15 SKUs synced", tone: "text-muted-foreground" },
  ]);
  const [activeStep, setActiveStep] = useState(2);
  const [selectedSku, setSelectedSku] = useState<string>("SKU-101");
  const [selectedOrder, setSelectedOrder] = useState<string>("88");
  const [dispatchRate, setDispatchRate] = useState(94);
  const [pulsed, setPulsed] = useState<string[]>([]);

  useEffect(() => {
    const t = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => (o.status === "Dispatched" ? o : { ...o, sla: Math.max(0, o.sla - 1) })),
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (pulsed.length === 0) return;
    const t = setTimeout(() => setPulsed([]), 6000);
    return () => clearTimeout(t);
  }, [pulsed]);

  // Log entries are pinned: they accumulate and are only removed by an explicit reset.
  const log = (msg: string, tone = "text-muted-foreground") =>
    setActivity((prev) => [
      {
        id: logSeq++,
        t: new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" }),
        msg,
        tone,
      },
      ...prev,
    ]);

  function markDamaged(skuId: string) {
    let label = "";
    setInventory((prev) =>
      prev.map((s) => {
        if (s.sku !== skuId || s.qty === 0) return s;
        const qty = s.qty - 1;
        label = `${s.bin} · ${s.name}`;
        return { ...s, qty, health: qty === 0 ? "Out of Stock" : "Damaged" };
      }),
    );
    setPulsed([skuId]);
    log(`⚙ 1 unit of ${skuId} marked damaged · ${label} quarantined`, "text-info");
  }

  function dismiss(ex: Exception) {
    setExceptions((prev) => prev.filter((e) => e.id !== ex.id));
    log(`✕ ${ex.id} dismissed without action`, "text-muted-foreground");
  }

  function resetAll() {
    setOrders(INITIAL_ORDERS);
    setInventory(INITIAL_INVENTORY);
    setExceptions(INITIAL_EXCEPTIONS);
    setActiveStep(2);
    setDispatchRate(94);
    setPulsed([]);
    setSelectedOrder("88");
    setSelectedSku("SKU-101");
    setActivity([
      { id: logSeq++, t: new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" }), msg: "↺ Simulation state reset · baseline restored", tone: "text-primary" },
    ]);
  }


  const sorted = useMemo(() => [...orders].sort((a, b) => b.priority - a.priority), [orders]);
  const activeOrders = orders.filter((o) => o.status !== "Dispatched").length;
  const breaches = orders.filter((o) => o.status !== "Dispatched" && o.sla < 480).length;
  const lowStock = inventory.filter((s) => s.health === "Low Stock" || s.health === "Out of Stock").length;
  const outCount = inventory.filter((s) => s.health === "Out of Stock").length;
  const sku = inventory.find((s) => s.sku === selectedSku);
  const focusOrder = orders.find((o) => o.id === selectedOrder);

  /* ---------------- simulations ---------------- */

  function simulateHighPriorityOrder() {
    if (orders.some((o) => o.id === URGENT_ORDER.id)) {
      log("Urgent order #104 already in queue — ignored duplicate injection", "text-warn");
      return;
    }
    const available = inventory.find((s) => s.sku === "SKU-101")?.qty ?? 0;
    setOrders((prev) => [...prev, { ...URGENT_ORDER, lines: URGENT_ORDER.lines.map((l) => ({ ...l })) }]);
    setSelectedOrder(URGENT_ORDER.id);
    setSelectedSku("SKU-101");
    setExceptions((prev) => [
      {
        id: "EX-1101",
        severity: "critical",
        kind: "shortage",
        title: "Stock Shortage",
        detail: `Urgent Order #104 requires 10 units of SKU-101 (${available} available in Bin A-02).`,
        recommendation:
          "Partial ship 7 units and reallocate 3 units from low-priority Order #88.",
        payload: { orderId: "104", sku: "SKU-101", ship: 7, reallocateFrom: "88", reallocate: 3 },
      },
      ...prev.filter((e) => e.id !== "EX-1101"),
    ]);
    log("⚡ High-priority Order #104 injected · 10 × SKU-101 requested", "text-danger");
    log("Exception EX-1101 raised · stock shortage on SKU-101", "text-danger");
  }

  function simulateStockout() {
    setInventory((prev) =>
      prev.map((s) =>
        s.sku === "SKU-203" || s.sku === "SKU-105"
          ? { ...s, qty: 0, health: healthFor(0, s.capacity, s.health === "Damaged" ? "Healthy" : s.health) }
          : s,
      ),
    );
    setExceptions((prev) => [
      {
        id: `EX-${1200 + prev.length}`,
        severity: "critical",
        kind: "shortage",
        title: "Multi-bin stockout cascade",
        detail: "SKU-105 (A-05) and SKU-203 (B-03) hit zero on hand.",
        recommendation: "Trigger an emergency replenishment wave from the inbound dock.",
      },
      ...prev,
    ]);
    log("Stockout cascade simulated · 2 bins at zero", "text-danger");
  }

  function simulateDockDelay() {
    setActiveStep(4);
    setDispatchRate((r) => Math.max(48, r - 14));
    setExceptions((prev) => [
      {
        id: `EX-${1300 + prev.length}`,
        severity: "warning",
        kind: "dock",
        title: "Dock 3 dispatch backlog",
        detail: "7 staged pallets · carrier ETA slipped 22 min",
        recommendation: "Shift 4 pallets to Dock 5 and re-scan the manifests.",
      },
      ...prev,
    ]);
    log("Dock delay simulated · dispatch rate degraded", "text-warn");
  }

  /* ---------------- resolution ---------------- */

  function approve(ex: Exception) {
    if (ex.kind === "shortage" && ex.payload) {
      const { orderId, sku: skuId, ship, reallocateFrom, reallocate } = ex.payload;
      setInventory((prev) =>
        prev.map((s) => {
          if (s.sku !== skuId) return s;
          const qty = Math.max(0, s.qty - ship);
          return { ...s, qty, health: healthFor(qty, s.capacity, s.health) };
        }),
      );
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            const lines = o.lines.map((l) =>
              l.sku === skuId ? { ...l, allocated: Math.min(l.required, l.allocated + ship + reallocate) } : l,
            );
            return { ...o, lines, status: statusFor(lines, o.status) };
          }
          if (o.id === reallocateFrom) {
            const lines = o.lines.map((l) =>
              l.sku === skuId ? { ...l, allocated: Math.max(0, l.allocated - reallocate) } : l,
            );
            return { ...o, lines, status: statusFor(lines, o.status) };
          }
          return o;
        }),
      );
      log(
        `✔ EX-${ex.id.replace("EX-", "")} approved · ${ship} units of ${skuId} picked from Bin A-02 → Order #${orderId} (Partial ship)`,
        "text-ready",
      );
      log(
        `↺ ${reallocate} units of ${skuId} reallocated from Order #${reallocateFrom} → Order #${orderId}; Order #${reallocateFrom} downgraded to Partial`,
        "text-warn",
      );
      log(`Bin A-02 stock updated · ${skuId} now marked Out of Stock`, "text-danger");
    } else {
      log(`✔ ${ex.id} approved · ${ex.recommendation}`, "text-ready");
    }
    setExceptions((prev) => prev.filter((e) => e.id !== ex.id));
  }

  function override(ex: Exception) {
    log(`⚙ ${ex.id} manual override · routed to floor supervisor for review`, "text-warn");
    setExceptions((prev) =>
      prev.map((e) => (e.id === ex.id ? { ...e, severity: "info", detail: `${e.detail} · Manual override in progress` } : e)),
    );
  }

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
              <SimButton icon={<Zap size={15} />} onClick={simulateHighPriorityOrder} label="Simulate High-Priority Order" tone="danger" />
              <SimButton icon={<PackageX size={15} />} onClick={simulateStockout} label="Simulate Stockout" tone="warn" />
              <SimButton icon={<Truck size={15} />} onClick={simulateDockDelay} label="Simulate Dock Delay" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon={<ClipboardList size={16} />} label="Active Orders" value={activeOrders} sub={`${orders.length} total in queue`} tone="primary" />
            <Kpi icon={<Siren size={16} />} label="SLA Breaches" value={breaches} sub="under 8 min to due" tone="danger" />
            <Kpi icon={<AlertTriangle size={16} />} label="Low Stock Alerts" value={lowStock} sub={`${outCount} out of stock`} tone="warn" />
            <Kpi icon={<Activity size={16} />} label="Dispatch Rate" value={`${dispatchRate}%`} sub="rolling 60 min" tone="ready" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-4 px-6 py-6 lg:grid-cols-[30fr_45fr_25fr]">
        {/* LEFT — order queue */}
        <section className="panel flex max-h-[calc(100vh-1rem)] flex-col overflow-hidden">
          <PanelHead icon={<ClipboardList size={15} />} title="Order Queue" meta="sorted by priority score" />
          <ul className="divide-y divide-border overflow-y-auto">
            {sorted.map((o) => {
              const req = o.lines.reduce((s, l) => s + l.required, 0);
              const alloc = o.lines.reduce((s, l) => s + l.allocated, 0);
              const urgent = o.status !== "Dispatched" && o.sla < 480;
              return (
                <li key={o.id}>
                  <button
                    onClick={() => {
                      setSelectedOrder(o.id);
                      setSelectedSku(o.lines[0]?.sku ?? selectedSku);
                    }}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-accent/60 ${
                      selectedOrder === o.id ? "bg-accent/70" : ""
                    } ${o.urgent ? "border-l-2 border-danger" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-mono text-sm font-semibold">
                        ORD-{o.code}
                        {o.urgent && (
                          <span className="rounded bg-danger/20 px-1.5 text-[10px] font-bold uppercase text-danger">
                            urgent
                          </span>
                        )}
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] ${
                          o.status === "Dispatched"
                            ? "border-border bg-muted text-muted-foreground"
                            : urgent
                              ? "border-danger/50 bg-danger/20 text-danger"
                              : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        <Clock size={11} /> {o.status === "Dispatched" ? "done" : fmtClock(o.sla)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {o.customer} · {alloc}/{req} units allocated
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80">
                      {o.lines.map((l) => `${l.sku} ×${l.required}`).join(" · ")}
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
                  <button onClick={() => setActiveStep(i)} className="flex flex-col items-center gap-1.5" aria-label={`Focus ${s} stage`}>
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
                    <span className={`text-[11px] ${i === activeStep ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
                  </button>
                  {i < STEPS.length - 1 && <span className={`mx-2 mb-5 h-0.5 flex-1 ${i < activeStep ? "bg-ready" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="panel flex-1 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                <Boxes size={15} /> Bin Map · 15 SKUs
              </h2>
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <Legend cls="bg-ready" label="Healthy" />
                <Legend cls="bg-warn" label="Low Stock" />
                <Legend cls="bg-info" label="Damaged" />
                <Legend cls="bg-danger" label="Out of Stock" />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {ZONES.map((z) => (
                <div key={z.id}>
                  <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{z.label}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {inventory
                      .filter((s) => s.zone === z.id)
                      .map((s) => (
                        <Popover key={s.sku}>
                          <PopoverTrigger asChild>
                            <button
                              onClick={() => setSelectedSku(s.sku)}
                              className={`rounded border p-2 text-left transition-transform hover:scale-[1.03] ${healthTone[s.health]} ${
                                selectedSku === s.sku ? "ring-2 ring-primary" : ""
                              } ${pulsed.includes(s.sku) ? "animate-[pulse_1.4s_ease-in-out_infinite] ring-2 ring-current" : ""}`}
                            >
                              <span className="block font-mono text-[10px] opacity-80">
                                {s.bin} · {s.sku}
                              </span>
                              <span className="block font-display text-lg font-bold leading-tight">{s.qty}</span>
                              <span className="block truncate text-[10px] opacity-80">{s.health}</span>
                              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-background/40">
                                <span
                                  className="block h-full rounded-full bg-current"
                                  style={{ width: `${Math.min(100, (s.qty / s.capacity) * 100)}%` }}
                                />
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="center" className="w-64 border-border bg-popover p-3">
                            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                              Bin {s.bin} · {s.sku}
                            </p>
                            <p className="mt-1 font-display text-base font-semibold">{s.name}</p>
                            <dl className="mt-2 space-y-1 text-xs">
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Stock level</dt>
                                <dd className="font-mono">
                                  {s.qty} / {s.capacity} units
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Item status</dt>
                                <dd>
                                  <span className={`rounded border px-1.5 py-0.5 text-[11px] ${healthTone[s.health]}`}>
                                    {s.health}
                                  </span>
                                </dd>
                              </div>
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">Zone</dt>
                                <dd className="font-mono">{z.label}</dd>
                              </div>
                            </dl>
                            <button
                              onClick={() => markDamaged(s.sku)}
                              disabled={s.qty === 0}
                              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-info/50 bg-info/15 px-2 py-1.5 text-xs font-semibold text-info transition-colors hover:bg-info/25 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Wrench size={13} /> Mark 1 Item Damaged
                            </button>
                          </PopoverContent>
                        </Popover>
                      ))}
                  </div>

                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sku && (
                <div className="rounded border border-border bg-surface-2 p-3">
                  <p className="font-mono text-sm">
                    <span className="font-semibold text-primary">{sku.sku}</span> · {sku.bin}
                  </p>
                  <p className="text-sm text-foreground/90">{sku.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {sku.qty} / {sku.capacity} units on hand · {sku.health}
                  </p>
                </div>
              )}
              {focusOrder && (
                <div className="rounded border border-border bg-surface-2 p-3">
                  <p className="font-mono text-sm">
                    Order <span className="font-semibold text-primary">ORD-{focusOrder.code}</span>
                  </p>
                  <p className="text-sm text-foreground/90">{focusOrder.customer}</p>
                  <ul className="mt-1 space-y-0.5">
                    {focusOrder.lines.map((l) => (
                      <li key={l.sku} className="font-mono text-[11px] text-muted-foreground">
                        {l.sku}: {l.allocated}/{l.required} allocated
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT — exceptions + activity log */}
        <section className="flex flex-col gap-4">
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                <Siren size={15} /> Exceptions
              </h2>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Pin size={10} /> {exceptions.length} pinned
                </span>
                <button
                  onClick={resetAll}
                  className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground transition-colors hover:bg-accent"
                >
                  <RotateCcw size={10} /> Reset
                </button>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {exceptions.map((ex) => {
                const tone =
                  ex.severity === "critical"
                    ? "border-danger/50 bg-danger/15 text-danger"
                    : ex.severity === "warning"
                      ? "border-warn/50 bg-warn/15 text-warn"
                      : "border-info/50 bg-info/15 text-info";
                return (
                  <li key={ex.id} className="animate-fade-in p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold uppercase ${tone}`}>
                        {ex.severity}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">{ex.id}</span>
                        <button
                          onClick={() => dismiss(ex)}
                          aria-label={`Dismiss ${ex.id}`}
                          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold">{ex.title}</h3>
                    <p className="text-xs text-muted-foreground">{ex.detail}</p>
                    <div className="mt-2 rounded border border-primary/30 bg-primary/10 p-2">
                      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                        <Sparkles size={11} /> Recommendation
                      </p>
                      <p className="mt-1 text-xs text-foreground/90">{ex.recommendation}</p>
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
                      <button
                        onClick={() => approve(ex)}
                        className="flex items-center justify-center gap-1.5 rounded border border-ready/50 bg-ready/15 px-2 py-1.5 text-xs font-semibold text-ready transition-colors hover:bg-ready/25"
                      >
                        <Check size={13} /> Approve System Recommendation
                      </button>
                      <button
                        onClick={() => override(ex)}
                        className="flex items-center justify-center gap-1.5 rounded border border-border bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
                      >
                        <Settings2 size={13} /> Manual Override <ArrowRight size={12} />
                      </button>
                    </div>
                  </li>
                );
              })}
              {exceptions.length === 0 && (
                <li className="p-6 text-center text-sm text-muted-foreground">
                  All exceptions cleared. Floor is running to plan.
                </li>
              )}
            </ul>
          </div>

          <div className="panel flex-1 overflow-hidden">
            <PanelHead icon={<ScrollText size={15} />} title="Activity Log" meta={`${activity.length} events · pinned`} />
            <ul className="max-h-[420px] space-y-2 overflow-y-auto p-4">
              {activity.map((e) => (
                <li key={e.id} className="animate-fade-in font-mono text-[11px] leading-relaxed">
                  <span className="text-primary">{e.t}</span> <span className={e.tone}>{e.msg}</span>
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
