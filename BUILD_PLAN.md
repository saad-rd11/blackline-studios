# BUILD_PLAN.md — UEFN Studio: prototype → production

> **For the coding agent.** This folder contains a working prototype, `uefn_studio.jsx`.
> Your job is to turn it into a deployed, full-stack web app. Read `uefn_studio.jsx`
> in full before starting — it already contains all UI, the quiz flow, the pricing
> engine, the portfolio carousel, and a complete admin panel. **You are not redesigning
> it.** You are replacing its demo persistence/auth with real backend services and
> shipping it. Preserve every product decision unless this document says otherwise.

---

## 1. Mission

Take the single-file React prototype and deliver a live, owner-operated booking site for
custom Fortnite/UEFN work. Customers configure a project via a quiz, see a live estimate,
and place an order **with no account**. The owner manages everything (orders, portfolio
samples, add-ons, service prices, availability) from a private admin area.

---

## 2. Current state → target state

| Concern | Prototype (now) | Target (you build) |
|---|---|---|
| Persistence | `window.storage` (in-memory, artifact-only) | Firebase Firestore |
| Owner auth | Hardcoded `ADMIN_PASS = "studio2025"` | Firebase Auth (single owner account) |
| Portfolio images | Gradient + icon placeholders | Firebase Storage uploads (+ keep gradient fallback) |
| Order notifications | None | Discord webhook via Cloud Function on order create |
| Hosting | N/A | Cloudflare Pages (free, commercial-OK) |
| Domain | N/A | Cloudflare Registrar |
| Build tooling | None (raw JSX) | Vite + React |

---

## 3. Final tech stack (decided — do not substitute without flagging)

- **Frontend:** React 18 + Vite. Keep the existing inline-style approach from the prototype; do **not** introduce Tailwind or a component library.
- **Icons:** `lucide-react` (already imported in the prototype).
- **Backend:** Firebase — Firestore (data), Auth (owner login), Storage (portfolio images), Cloud Functions (Discord webhook).
- **Hosting:** Cloudflare Pages. *Rationale: free tier permits commercial use and has unlimited bandwidth; Vercel's free tier is non-commercial.*
- **Domain:** Cloudflare Registrar (at-cost, free WHOIS privacy).
- **Cost target:** ~$0/month operationally; ~$8–10/year for the domain only. Firebase stays on the free Spark tier for everything except Cloud Functions, which require the pay-as-you-go Blaze plan (effectively $0 at this traffic).

---

## 4. Target repository layout

```
/
├─ BUILD_PLAN.md            ← this file
├─ index.html
├─ package.json
├─ vite.config.js
├─ .env.example             ← committed
├─ .env                     ← gitignored, real values
├─ .gitignore
├─ firestore.rules
├─ storage.rules
├─ firebase.json
├─ src/
│  ├─ main.jsx              ← React entry
│  ├─ App.jsx               ← the prototype, rewired (was uefn_studio.jsx)
│  ├─ firebase.js           ← Firebase init + exports
│  └─ db.js                 ← data-access layer (mirrors prototype's storage API)
└─ functions/
   ├─ index.js              ← Discord webhook (onDocumentCreated)
   └─ package.json
```

Rename `uefn_studio.jsx` → `src/App.jsx`. **Keep it as one file initially** and get the
app fully working before any optional refactor into smaller components. Working deploy
first, cleanliness second.

---

## 5. What's already in the prototype (so you don't rebuild it)

`uefn_studio.jsx` is complete UI. Key exports/structures you will interact with:

- **Pricing engine:** `calcPrice(quiz, types, addons)` and the `COMPL` / `TIMELINES` constants. **Do not change the math.**
- **State holders** you will rewire to Firestore: `types`, `addons`, `portfolio`, `orders`, `bookingOpen`.
- **Persist helpers** to replace: `setTypes`, `setAddons`, `setPort`, `setOrders`, `setBookingP` (currently `window.storage.set`).
- **Load effect:** the mount `useEffect` that calls `window.storage.get` for each key.
- **Order create:** `submitOrder()`. **Status mutations:** `advance(id)`, `cancelOrd(id)`.
- **Admin gate:** the `authed` / `passIn` / `ADMIN_PASS` block.
- **Defaults:** `DEF_TYPES`, `DEF_ADDONS`, `DEF_PORTFOLIO`, `DEF_ORDERS` — use these to seed Firestore once.

Storage keys currently in use: `uefn_orders`, `uefn_types`, `uefn_addons`, `uefn_portfolio`, `uefn_open`.

---

## 6. Guardrails — preserve these (they are deliberate)

Do **not** "improve" any of the following away:

1. **No customer accounts.** Customers never log in. Orders are placed anonymously and tracked by Order ID only.
2. **Quiz is tap-only until the final step.** Steps 1–3 auto-advance on selection; step 4 is multi-select with an explicit continue; only step 5 (estimate + contact) has typed fields. Keep this — it is the core low-friction decision.
3. **Live carousel** cycles visible portfolio items in admin-defined order. Keep auto-cycle + manual nav.
4. **Pricing engine output and the $25 rounding** stay exactly as-is.
5. **Owner controls everything via the admin panel** — adding/reordering portfolio, editing add-ons, editing service prices, toggling availability. All already built; just back it with Firestore.

---

## 7. Firestore data model

Use these collections/docs. Shapes match the prototype's in-memory arrays so the swap is near 1:1.

```
orders/{orderId}                       // orderId = the tracking code (see §9 security note)
  ref          string                  // same as orderId, shown to customer
  discord      string
  email        string
  type         string                  // service id
  complexity   string                  // "simple" | "medium" | "complex" | "premium"
  timeline     string                  // "flexible" | "standard" | "priority" | "rush"
  addons       string[]                // add-on ids
  desc         string
  notes        string
  status       string                  // pending|confirmed|in_progress|review|completed|cancelled
  price        { min:number, max:number }   // store ONLY min/max — strip calcPrice's extra fields
  createdAt    timestamp

config/services                        // single doc
  items        Type[]                  // { id, iconKey, lbl, base, dur, desc, active }

config/addons                          // single doc
  items        Addon[]                 // { id, lbl, price, active }

config/portfolio                       // single doc
  items        PortfolioItem[]         // { id, order, visible, cat, title, code, plays,
                                        //   rating, grad:[c1,c2], iconKey, imageUrl? }

config/settings                        // single doc
  bookingOpen  boolean
```

**Note on `price`:** `calcPrice` returns extra fields (`t`, `c`, `tl`, `base`, …). When writing an
order, persist only `{ min, max }`. The display/breakdown can be recomputed from the stored
selection ids if ever needed.

**Note on portfolio images:** add an optional `imageUrl` to each portfolio item. When present,
the carousel should render the image as the visual panel background; when absent, fall back to
the existing gradient + icon. This keeps the prototype working before any image is uploaded.

---

## 8. `window.storage` → Firestore mapping

| Prototype call | Replace with |
|---|---|
| `window.storage.get("uefn_types")` | read `config/services` → `.items` |
| `window.storage.set("uefn_types", …)` | write `config/services` `{ items }` |
| `window.storage.get("uefn_addons")` | read `config/addons` → `.items` |
| `window.storage.set("uefn_addons", …)` | write `config/addons` `{ items }` |
| `window.storage.get("uefn_portfolio")` | read `config/portfolio` → `.items` |
| `window.storage.set("uefn_portfolio", …)` | write `config/portfolio` `{ items }` |
| `window.storage.get("uefn_open")` | read `config/settings` → `.bookingOpen` |
| `window.storage.set("uefn_open", …)` | write `config/settings` `{ bookingOpen }` |
| `window.storage.get("uefn_orders")` (load all) | `onSnapshot(collection "orders")` — live updates |
| `[order, ...orders]` then set | `setDoc(doc("orders", order.id), order)` |
| status `advance` / `cancelOrd` map+set | `updateDoc(doc("orders", id), { status })` |

Prefer a real-time `onSnapshot` listener on `orders` so the admin queue and the customer
Track page update live without refresh.

---

## 9. Build phases

Work top to bottom. Each phase has acceptance criteria — don't advance until they pass.

### Phase 0 — Scaffold
```bash
npm create vite@latest . -- --template react
npm i firebase lucide-react
```
- Move `uefn_studio.jsx` → `src/App.jsx`; wire it as the default export rendered by `src/main.jsx`.
- Move the Google Fonts `@import` into `index.html` `<head>` (keep the injected style as fallback if simpler).
- **Accept:** `npm run dev` renders the prototype; quiz, carousel, and (still demo) admin all work locally.

### Phase 1 — Firebase project
- Create a Firebase project. Enable **Firestore** (production mode), **Authentication** (Email/Password), **Storage**.
- Create **one** owner user in Auth (the only login that will ever exist).
- Upgrade to **Blaze** (needed for Cloud Functions; set a low budget alert, e.g. $5).
- **Accept:** project exists; owner account can be retrieved; Firestore/Storage/Auth all enabled.

### Phase 2 — Data layer
Create `src/firebase.js`:
```js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
});
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

Create `src/db.js` (mirrors the prototype's API so swaps are minimal):
```js
import { db } from "./firebase";
import {
  doc, getDoc, setDoc, collection, onSnapshot, updateDoc, deleteField
} from "firebase/firestore";

export async function getConfig(name, fallback) {
  const snap = await getDoc(doc(db, "config", name));
  return snap.exists() ? snap.data() : fallback;
}
export const setConfigItems = (name, items) => setDoc(doc(db, "config", name), { items }, { merge: true });
export const setSettings    = (patch)        => setDoc(doc(db, "config", "settings"), patch, { merge: true });

export function subscribeOrders(cb) {
  return onSnapshot(collection(db, "orders"), (qs) =>
    cb(qs.docs.map(d => d.data()).sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)))
  );
}
export const createOrder = (order)      => setDoc(doc(db, "orders", order.id), order);
export const patchOrder  = (id, patch)  => updateDoc(doc(db, "orders", id), patch);
```

Rewire `src/App.jsx`:
- Replace the mount `useEffect` storage loads with `getConfig(...)` calls + a `subscribeOrders` listener (remember to unsubscribe on unmount).
- Replace `setTypes/setAddons/setPort` bodies with the matching `setConfigItems(...)`.
- Replace `setBookingP` with `setSettings({ bookingOpen })`.
- Replace `submitOrder`'s array write with `createOrder(order)` (strip `price` to `{min,max}`; set `createdAt` via `serverTimestamp()`).
- Replace `advance`/`cancelOrd` with `patchOrder(id, { status })`.

> **Order ID / tracking security:** the prototype uses a 4-char `UEFN-XXXX` code as both the
> doc id and the public tracking key. A 4-char code is guessable. **Lengthen it to 8 base36
> chars** (`UEFN-XXXXXXXX`) so the doc id doubles as an unguessable bearer token. The Track
> page keeps working unchanged (lookup by exact id); the security rules (below) forbid listing
> the collection, so orders can only be read by someone who has the exact code.

- **Accept:** orders, services, add-ons, portfolio, and availability all persist to Firestore and survive reload; admin edits appear on the public site; Track-by-ID works.

### Phase 3 — Owner auth (delete the passcode)
- Remove `ADMIN_PASS` and the passcode UI. Gate the admin view on `onAuthStateChanged`.
- Render a simple email/password sign-in form when no user is present; show the dashboard only when signed in. Wire the existing "logout" button to `signOut(auth)`.
- **Accept:** admin area is unreachable without signing in as the owner account; refresh preserves session; logout works.

### Phase 4 — Portfolio image uploads
- In the admin Portfolio "Add Sample" form, add a file input. On submit: upload to Storage at `portfolio/{itemId}.{ext}`, get the download URL via `getDownloadURL`, store it as `imageUrl` on the item.
- Carousel: if `imageUrl` exists, render it (cover) as the visual panel; else keep the gradient+icon fallback already in the prototype.
- On item delete, also delete the Storage object.
- **Accept:** owner can upload a sample image; it appears in the carousel; gradient fallback still works for items without an image.

### Phase 5 — Discord webhook (Cloud Function)
`functions/index.js`:
```js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const DISCORD_WEBHOOK = defineSecret("DISCORD_WEBHOOK");

exports.notifyOrder = onDocumentCreated(
  { document: "orders/{id}", secrets: [DISCORD_WEBHOOK] },
  async (event) => {
    const o = event.data.data();
    const body = {
      content:
        `🆕 **New order ${o.ref}**\n` +
        `Discord: ${o.discord}\n` +
        `Type: ${o.type} · ${o.complexity} · ${o.timeline}\n` +
        `Estimate: $${o.price?.min}–$${o.price?.max}` +
        (o.desc ? `\n> ${o.desc}` : ""),
    };
    await fetch(DISCORD_WEBHOOK.value(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
);
```
- Set the secret: `firebase functions:secrets:set DISCORD_WEBHOOK` (paste the webhook URL from a Discord channel → Integrations → Webhooks).
- Deploy: `firebase deploy --only functions`.
- **Accept:** placing an order posts a message to the Discord channel; the webhook URL is never present in client code.

### Phase 6 — Security rules + seed
`firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    // Orders: anyone can create and read-by-exact-id; only owner can list/update/delete.
    match /orders/{id} {
      allow get:    if true;
      allow list:   if request.auth != null;
      allow create: if request.resource.data.discord is string
                    && request.resource.data.status == "pending";
      allow update, delete: if request.auth != null;
    }

    // Config is publicly readable, owner-writable.
    match /config/{doc} {
      allow read:  if true;
      allow write: if request.auth != null;
    }
  }
}
```
`storage.rules`:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /portfolio/{file} {
      allow read:  if true;
      allow write: if request.auth != null;
    }
  }
}
```
- Deploy rules: `firebase deploy --only firestore:rules,storage`.
- **Seed once:** write `DEF_TYPES`/`DEF_ADDONS`/`DEF_PORTFOLIO` into `config/services`/`config/addons`/`config/portfolio`, and `{ bookingOpen: true }` into `config/settings` (a one-off script or a temporary "seed" button gated behind auth).
- **Accept:** an anonymous client cannot list orders or write config; rules deploy clean; seed data renders on the public site.

### Phase 7 — Deploy to Cloudflare Pages
- Push the repo to GitHub.
- In Cloudflare Pages: connect the repo. Build command `npm run build`, output dir `dist`.
- Add the `VITE_FB_*` environment variables in the Pages project settings (these are public Firebase config — safe in client).
- **Accept:** the production URL serves the live site; orders write to Firestore from production; Discord fires.

### Phase 8 — Domain + final verification
- Register the domain at Cloudflare Registrar; attach it to the Pages project (custom domain) — DNS auto-configures.
- Add the production domain to Firebase Auth **Authorized domains** and to Firestore/Storage allowed origins if prompted.
- Run the acceptance checklist (§12).

---

## 10. Environment variables

`.env.example` (commit this; never commit real `.env`):
```
VITE_FB_API_KEY=
VITE_FB_AUTH_DOMAIN=
VITE_FB_PROJECT_ID=
VITE_FB_STORAGE_BUCKET=
VITE_FB_SENDER_ID=
VITE_FB_APP_ID=
```
- The `VITE_FB_*` values are **public** Firebase web config — fine in the client bundle.
- The **only secret** is `DISCORD_WEBHOOK`, stored as a Functions secret (Phase 5), never in the frontend.
- Owner credentials live in Firebase Auth — no secret in code.

Add to `.gitignore`: `.env`, `node_modules`, `dist`, `functions/node_modules`.

---

## 11. End-to-end acceptance checklist

- [ ] Quiz: steps 1–3 auto-advance on tap; step 4 multi-select; step 5 shows correct estimate matching `calcPrice`.
- [ ] Placing an order writes to Firestore, returns an 8-char Order ID, and posts to Discord.
- [ ] Track page finds an order by ID; cannot enumerate other orders.
- [ ] Admin requires owner sign-in; passcode is gone.
- [ ] Admin edits (service price, add-on, availability toggle, add/reorder/hide portfolio) persist and reflect on the public site live.
- [ ] Carousel cycles visible items in admin order; uploaded image shows, gradient fallback works.
- [ ] Closing bookings disables the "Place Order" button on the public site.
- [ ] Production domain serves over HTTPS; Firebase auth domain is authorized.
- [ ] Firestore rules: anonymous user can create + get-by-id orders but cannot list or edit; cannot write config.

---

## 12. Out of scope (do NOT build now — note for later)

- **Payment processing.** The site only shows estimates and collects orders. Payment happens off-platform (Stripe is unavailable to Pakistan-based merchants; the owner invoices via Payoneer/Wise/bank). Just keep the `price.min/max` on the order.
- **AI estimator.** A future free-text "describe your project" → LLM-suggested config can layer on top of the deterministic quiz. Keep the quiz as the source of truth.
- **Email notifications.** Discord is the notification channel for v1. Resend/email can be added later.

---

## 13. Cost summary (for context)

- Cloudflare Pages: **$0** (commercial use allowed, unlimited bandwidth).
- Firebase: **$0** on Spark for Firestore/Auth/Storage at this scale; Blaze for Functions stays ~$0 (well under free allowances).
- Domain: **~$8–10/year** at Cloudflare Registrar.
- **Effective total: ~$10 for the first year.**

---

## 14. Definition of done

A pushed GitHub repo + a live custom domain where: a visitor can get a quote and place an
order with no account, the owner gets a Discord ping and manages everything from an
authenticated admin area, all data lives in Firestore, and the acceptance checklist (§11)
passes. No `window.storage`, no `ADMIN_PASS`, no secrets in the client bundle.
