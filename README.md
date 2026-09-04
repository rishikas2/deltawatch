# DeltaWatch — Real-Time Market Terminal & Volatility Engine

DeltaWatch is a production-grade financial intelligence terminal built to deliver real-time benchmark tracking, interactive chart analytics, and stress-testing capabilities. Engineered with Next.js and Python, it features live market synchronization, dynamic sector filtering, custom volatility alerts, and instant CSV audit logging.

![DeltaWatch Terminal](https://deltawatch.vercel.app/preview.png)

---

## Key Features

* **Real-Time Market Tracking:** Live NIFTY 50 and SENSEX benchmark integration via Yahoo Finance endpoints.
* **Interactive SVG Charts:** Seamless rendering with dynamic hover tooltips, crosshair pricing, and baseline synchronizations.
* **Flash Shock Engine:** Instant market volatility simulation to stress-test watchlist alerts under simulated rapid market shifts.
* **Sector Filtering & Custom Alerts:** Dynamic filtering by sector (IT, Banking, Energy, Auto) and adjustable alert sensitivity thresholds.
* **CSV Audit Export:** One-click export functionality for active session metrics and baseline audit trails.
* **Resilient Data Engine:** Enterprise fallback handling with concurrent asynchronous request processing.

---

## Tech Stack

* **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
* **Backend:** Python Flask, SQLite
* **APIs:** Yahoo Finance API integration
* **Deployment:** Vercel (Frontend & Serverless API Routes)

---

## Getting Started

### Prerequisites

* **Node.js:** `v18.x` or higher
* **npm** or **yarn**

### Local Installation

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/rishikas2/deltawatch.git](https://github.com/rishikas2/deltawatch.git)
   cd deltawatch/frontend
