# Shop Warda

A full-stack e-commerce platform for a floral brand based in Egypt. Customers browse collections, build custom bouquets stem by stem, and place orders with real-time pricing — all from a storefront that runs on video-first hero sections and smooth scroll animations.

The admin panel handles everything from product management and order tracking to promo codes, shipping zones, and CSV exports.

<br/>

<p align="center">
  <img src="./public/images/WhatsNew.gif" alt="Shop Warda" width="720" />
</p>

<br/>

---

## How it works

The homepage loads with a full-viewport video hero (separate assets for mobile and desktop), followed by dynamic category showcases and a horizontally-scrollable "Latest Arrivals" feed — all server-rendered and cached.

The **Bouquet Builder** is the core feature. Customers walk through a multi-step flow: pick flowers (with per-stem color variants), choose a wrap style, optionally add a gift card message, and see a live order summary with real-time pricing that accounts for base price, per-stem costs, wrap fees, and card charges. The whole thing is config-driven from the admin side — flower catalogs, wrap options, pricing rules, and stem limits are all managed through the dashboard.

Orders support both COD and Instapay (screenshot upload verification), with per-governorate shipping fees across all Egyptian governorates.

---

## Frontend

### Pages & Sections
- **Video Hero** — full-screen looping video with responsive mobile/desktop sources and Playfair Display overlay text
- **Category Showcase** — admin-managed categories rendered as browsable cards
- **Product Catalog** — filterable shop page with quick-view product cards, variant selectors, and size guides
- **Bouquet Builder** — multi-step interactive builder (flower selection → wrap → card message → summary) with live pricing
- **Cart Drawer** — slide-out cart with quantity controls and promo code input
- **Checkout Flow** — address form with governorate-based shipping, payment method selection, and order confirmation

### Custom Components
- `MagicBento` — asymmetric feature grid with hover animations
- `MagnetLines` — cursor-reactive background lines
- `OrbitImages` — 3D rotating image ring (Three.js + React Three Fiber)
- `OptionWheel` — scroll-snap wheel picker for bouquet options
- `CircularText` / `TextType` — animated typography effects

### UI Library
Built on **shadcn/ui** — Dialog, Sheet, Carousel, Tabs, Dropdown Menu, Select, Tooltip, Alert Dialog, Breadcrumb, Skeleton, Badge, Switch, Table, and custom Spinner/Marker components. Toast notifications via Sonner.

---

## Backend

### Architecture
Feature-based module structure under `/features`:
- **Catalog** — product + category services, repositories, and cached queries
- **Cart** — server-synced cart with secure token hashing, React context on the client
- **Checkout** — order placement with idempotency keys (SHA-256 hashed, never stored raw), per-governorate pricing engine
- **Bouquet** — flower/wrap catalog management, pricing calculator, admin toggle for enabling/disabling the builder
- **Engagement** — newsletter subscriptions, contact form submissions
- **Returns** — customer return request flow
- **Dashboard** — admin analytics and data aggregation
- **Wrapping** — gift wrap options and pricing

### API (31 routes)
- `POST /api/orders` — place order with rate limiting (3/min per IP) and idempotency protection
- `GET/POST /api/cart` — anonymous cart sync via secure cookie tokens
- `POST /api/promo/validate` — coupon validation
- `GET /api/products/stock` — real-time stock checks
- `POST /api/media/sign` — presigned S3 URLs for direct browser uploads
- `GET /api/admin/funnel` — sales funnel analytics
- `GET /api/admin/exports/orders` — CSV order export
- `GET /api/location/geocode` — address lookup
- `GET /api/health` — healthcheck

### Database (MongoDB + Mongoose)
14 models: Product, Category, Order, Cart, Bouquet (flower/wrap/settings), Promotion, Contact, ReturnRequest, Subscriber, StoreSettings, AnalyticsEvent, AuditLog, Counter, Admin. Custom compound indexes for query performance.

### Security
- **Auth**: NextAuth with MongoDB adapter, admin role guards on all dashboard routes
- **Rate Limiting**: Upstash Redis sliding window — login (5/min), checkout (3/min), contact (3/hr), uploads (20/min), cart ops (30/min)
- **Idempotency**: Checkout requests carry nanoid keys, hashed with SHA-256 before storage to prevent duplicate orders
- **Token Hashing**: Cart session tokens are never stored in plain text

### Infrastructure
- **Storage**: AWS S3 with presigned URLs for media uploads
- **Email**: Transactional order notifications via Resend
- **Monitoring**: Sentry error tracking, structured logger, custom analytics event pipeline
- **Caching**: Service-level caching for product/category queries

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS v4 |
| Database | MongoDB, Mongoose |
| Auth | NextAuth + MongoDB Adapter |
| Storage | AWS S3 |
| Cache & Rate Limiting | Upstash Redis |
| Email | Resend |
| Animations | Motion, GSAP, Three.js |
| UI Components | shadcn/ui, Radix Primitives |
| Monitoring | Sentry |
| Validation | Zod |
