export type OrderStatus = "Pending" | "Partial" | "Fully Allocated" | "Dispatched";

export type OrderLine = { sku: string; required: number; allocated: number };

export type Order = {
  id: string;
  code: string;
  customer: string;
  status: OrderStatus;
  priority: number;
  sla: number; // seconds remaining
  lines: OrderLine[];
  urgent?: boolean;
};

export type StockHealth = "Healthy" | "Low Stock" | "Damaged" | "Out of Stock";
export type ZoneId = "A" | "B" | "C";

export type Sku = {
  sku: string;
  name: string;
  bin: string;
  zone: ZoneId;
  qty: number;
  capacity: number;
  health: StockHealth;
};

export const ZONES: Array<{ id: ZoneId; label: string }> = [
  { id: "A", label: "Zone A · Fast Movers" },
  { id: "B", label: "Zone B · Bulk" },
  { id: "C", label: "Zone C · Fragile" },
];

export const INITIAL_INVENTORY: Sku[] = [
  { sku: "SKU-101", name: "Wireless Earbuds", bin: "A-02", zone: "A", qty: 7, capacity: 40, health: "Low Stock" },
  { sku: "SKU-102", name: "Phone Charger 30W", bin: "A-01", zone: "A", qty: 36, capacity: 40, health: "Healthy" },
  { sku: "SKU-103", name: "USB-C Cable 2m", bin: "A-03", zone: "A", qty: 28, capacity: 40, health: "Healthy" },
  { sku: "SKU-104", name: "Smart Bulb Pack", bin: "A-04", zone: "A", qty: 0, capacity: 40, health: "Out of Stock" },
  { sku: "SKU-105", name: "Fitness Band", bin: "A-05", zone: "A", qty: 9, capacity: 40, health: "Low Stock" },
  { sku: "SKU-201", name: "Detergent 5L", bin: "B-01", zone: "B", qty: 120, capacity: 160, health: "Healthy" },
  { sku: "SKU-202", name: "Paper Towels 24pk", bin: "B-02", zone: "B", qty: 64, capacity: 160, health: "Healthy" },
  { sku: "SKU-203", name: "Cat Litter 10kg", bin: "B-03", zone: "B", qty: 18, capacity: 160, health: "Low Stock" },
  { sku: "SKU-204", name: "Rice Sack 20kg", bin: "B-04", zone: "B", qty: 92, capacity: 160, health: "Healthy" },
  { sku: "SKU-205", name: "Bottled Water 12pk", bin: "B-05", zone: "B", qty: 41, capacity: 160, health: "Damaged" },
  { sku: "SKU-301", name: "Glass Carafe", bin: "C-01", zone: "C", qty: 22, capacity: 30, health: "Healthy" },
  { sku: "SKU-302", name: "Ceramic Dinner Set", bin: "C-02", zone: "C", qty: 4, capacity: 30, health: "Low Stock" },
  { sku: "SKU-303", name: "LED Monitor 27\"", bin: "C-03", zone: "C", qty: 11, capacity: 30, health: "Damaged" },
  { sku: "SKU-304", name: "Wine Glasses 6pk", bin: "C-04", zone: "C", qty: 0, capacity: 30, health: "Out of Stock" },
  { sku: "SKU-305", name: "Lab Thermometer", bin: "C-05", zone: "C", qty: 26, capacity: 30, health: "Healthy" },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: "88",
    code: "#88",
    customer: "Ridgeline Cafe",
    status: "Fully Allocated",
    priority: 31,
    sla: 5400,
    lines: [{ sku: "SKU-101", required: 3, allocated: 3 }],
  },
  {
    id: "89",
    code: "#89",
    customer: "Northwind Retail",
    status: "Partial",
    priority: 72,
    sla: 900,
    lines: [
      { sku: "SKU-104", required: 6, allocated: 0 },
      { sku: "SKU-102", required: 4, allocated: 4 },
    ],
  },
  {
    id: "90",
    code: "#90",
    customer: "Kestrel Grocers",
    status: "Pending",
    priority: 64,
    sla: 1500,
    lines: [{ sku: "SKU-201", required: 12, allocated: 0 }],
  },
  {
    id: "91",
    code: "#91",
    customer: "Halden Pharma",
    status: "Fully Allocated",
    priority: 86,
    sla: 420,
    lines: [{ sku: "SKU-305", required: 5, allocated: 5 }],
  },
  {
    id: "92",
    code: "#92",
    customer: "Volta Electronics",
    status: "Pending",
    priority: 57,
    sla: 2400,
    lines: [{ sku: "SKU-303", required: 2, allocated: 0 }],
  },
  {
    id: "93",
    code: "#93",
    customer: "Meridian Sports",
    status: "Partial",
    priority: 48,
    sla: 3000,
    lines: [{ sku: "SKU-105", required: 12, allocated: 9 }],
  },
  {
    id: "94",
    code: "#94",
    customer: "Aster Home",
    status: "Dispatched",
    priority: 22,
    sla: 6600,
    lines: [{ sku: "SKU-302", required: 2, allocated: 2 }],
  },
  {
    id: "95",
    code: "#95",
    customer: "Pinewood Supply",
    status: "Pending",
    priority: 69,
    sla: 1080,
    lines: [{ sku: "SKU-204", required: 20, allocated: 0 }],
  },
  {
    id: "96",
    code: "#96",
    customer: "Harbor Kitchenware",
    status: "Partial",
    priority: 77,
    sla: 660,
    lines: [{ sku: "SKU-304", required: 4, allocated: 0 }],
  },
  {
    id: "97",
    code: "#97",
    customer: "Solace Hotels",
    status: "Fully Allocated",
    priority: 40,
    sla: 4200,
    lines: [{ sku: "SKU-202", required: 16, allocated: 16 }],
  },
];

export const URGENT_ORDER: Order = {
  id: "104",
  code: "#104",
  customer: "Zephyr Express (VIP)",
  status: "Pending",
  priority: 99,
  sla: 300,
  urgent: true,
  lines: [{ sku: "SKU-101", required: 10, allocated: 0 }],
};

export function healthFor(qty: number, capacity: number, previous: StockHealth): StockHealth {
  if (previous === "Damaged") return "Damaged";
  if (qty === 0) return "Out of Stock";
  if (qty <= capacity * 0.25) return "Low Stock";
  return "Healthy";
}

export function statusFor(lines: OrderLine[], current: OrderStatus): OrderStatus {
  if (current === "Dispatched") return "Dispatched";
  const req = lines.reduce((s, l) => s + l.required, 0);
  const alloc = lines.reduce((s, l) => s + l.allocated, 0);
  if (alloc === 0) return "Pending";
  if (alloc >= req) return "Fully Allocated";
  return "Partial";
}

export function fmtClock(seconds: number) {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
