# TDS Lite — Ticket Distribution System
## نظام توزيع الدعوات والتذاكر

Operational MVP for event ticket distribution: master events → sub-events → invitation requests → approvals → ticket upload → allocation → delivery → gate check-in → reports. Includes real Code128 + QR ticket generation, camera-based scanning, and the QOC Sports Calendar 2026 seed data.

## Stack
- **Frontend**: React 18 + Vite + Tailwind + React Router (RTL Arabic-first, English toggle)
- **Backend**: Node.js + Express + better-sqlite3 + JWT
- **Barcodes**: bwip-js (Code128) + qrcode (QR) + html5-qrcode (camera scanning)
- Single-process deployable. Server serves built client.

## Run

### Prerequisites
- Node.js ≥ 18 LTS
- npm ≥ 9
- HTTPS (or localhost) for camera scanning

### Install + build + start
```bash
npm install
npm run build
npm start
# → http://localhost:3000
```

### Dev mode (HMR)
```bash
npm run dev
# Frontend: http://localhost:5173 (proxies /api to backend)
# Backend:  http://localhost:3000
```

### Environment variables (optional)
```
PORT=3000
JWT_SECRET=<random-string>
```

The DB file `tds.db` is auto-created and seeded on first start.

## Demo Credentials (password: `Tds@2025`)

| Role | Email |
|---|---|
| Admin | admin@tds.local |
| Event Manager | manager@tds.local |
| Guest Data Entry | entry@tds.local |
| Approver | approver@tds.local |
| Ticket Officer | tickets@tds.local |
| Gate Scanner | gate@tds.local |
| Executive Viewer | exec@tds.local |

## Roles
- **Admin** — all access
- **Event Manager** — master/sub events, dashboard, reports
- **Guest Data Entry** — create/edit guest requests (Pending only)
- **Approver** — approve/reject/partial
- **Ticket Officer** — upload, allocate, deliver tickets
- **Gate Scanner** — gate check-in only
- **Executive Viewer** — read-only dashboard + reports

## Master / Sub Event Hierarchy
- **Master Event** — championship/tournament (e.g. World Padel Championship)
- **Sub-Event** — operational unit where tickets actually distribute (Final, VVIP Allocation, Opening Ceremony…)
- Time classification (Current/Future/Ended) is derived from dates; Admin override requires reason logged to audit.

## Sample CSV Format (`sample-tickets.csv`)
```
ticketCode,barcode,block,row,seat,category
TKT-A-001,TDS-900001,A,1,1,VIP
```
Upload via Tickets page after selecting Master + Sub event.

## Barcode + Scanning
Each ticket PDF (Delivery → PDF) carries a real **Code128** barcode (USB scanners) + **QR code** (phone camera), both encoding the same `ticket.barcode` payload.

Scanning at `/checkin`:
- 📷 **Camera (QR)** — html5-qrcode, requires HTTPS
- ⌨️ **USB scanner** — HID-keyboard mode, scans Code128 or QR
- ✋ **Manual typing** — fallback

## API Endpoints (summary)
| Method | Path | Roles |
|---|---|---|
| POST | /api/auth/login | public |
| GET | /api/dashboard | any |
| GET/POST/PUT/DELETE | /api/master-events | Event Manager |
| POST | /api/master-events/:id/archive | Event Manager |
| POST | /api/master-events/:id/override-classification | Admin |
| GET | /api/master-events/:id/report | any |
| GET/POST/PUT/DELETE | /api/sub-events | Event Manager |
| GET/POST | /api/requests | Guest Data Entry+ |
| POST | /api/requests/:id/decision | Approver |
| GET/POST | /api/tickets | Ticket Officer |
| POST | /api/tickets/upload-csv | Ticket Officer |
| GET | /api/tickets/:id/barcode.png | any |
| POST | /api/assignments | Ticket Officer |
| POST | /api/assignments/:id/deliver | Ticket Officer |
| GET | /api/assignments/:id/pdf | Ticket Officer+ |
| POST | /api/checkins/scan | Gate Scanner |
| GET | /api/reports/event/:id (+/excel, /pdf) | any |
| POST | /api/admin/reset (Header `X-Confirm: YES`) | Admin |

## Reset DB
```bash
curl -X POST http://localhost:3000/api/admin/reset \
  -H "Authorization: Bearer <admin-token>" -H "X-Confirm: YES"
```

## Deploy to Render.com (free tier, permanent URL)
1. Push this folder to a new GitHub repo
2. On render.com → **New Web Service** → connect repo
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Environment: `JWT_SECRET=<random>`
6. Deploy → get `https://your-app.onrender.com`

## Known Limitations
- No real email server — "Mark as Sent" records the action only
- Camera scanner is **QR-only** (Code128 needs USB scanner or manual entry)
- HTTPS required for camera on remote deployments
- Single-tenant SQLite (file `tds.db`)
- No WhatsApp / SMS integration
- PDFs use Latin font only

## Was NOT Added (per "no features beyond MVP")
- ❌ No QR-only mode toggle
- ❌ No barcode rotation / signed payloads / anti-counterfeit
- ❌ No batch barcode regeneration UI
- ❌ No barcode format selector per event
- ❌ No offline scanner mode
