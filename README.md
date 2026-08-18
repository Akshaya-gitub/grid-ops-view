# Omni Command Center

Create a single-page Warehouse Operations Command Center using Tailwind CSS and Lucide icons.

Build a 3-column dashboard:

Top Header: Title "OmniWarehouse OS" and 4 KPI cards (Active Orders, SLA Breaches, Low Stock Alerts, Dispatch Rate) plus 3 trigger buttons for simulations.

Left Column (30% width): Order Queue list sorted by priority score, with tags for order status and SLA countdown timer.

Center Column (45% width): Interactive 2D Grid map showing Warehouse Bins (Zone A, B, C) with color-coded stock levels, and a visual workflow status stepper bar at the top.

Right Column (25% width): Exception & Resolution Center showing live alerts and system decision recommendations with quick action buttons.

Use dark/slate UI theme with high-contrast accent colors (amber for warnings, red for stockouts, green for ready state).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://grid-ops-view.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a8fb7fd6-a669-4f06-968d-7759c81f5ef2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
