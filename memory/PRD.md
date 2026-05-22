# AutoVisor — Loja de HUD Automotivo

## Original problem statement
Brazilian e-commerce site selling 2 similar HUD car devices (model C3) with 2 software variants:
- C3 Navigation Edition (GPS + OBD + navigation + AI speed alerts)
- C3 Multi-Alarms Edition (OBD diagnostics + 6 alarms)

Customers must register (email, password, full name as on CPF, CPF, phone, CEP, address) and checkout with full delivery info, DOB, and payment via credit card OR PIX (with 5% discount). Experience must feel professional and safe. All copy in PT-BR.

## Architecture
- Backend: FastAPI + MongoDB (motor), JWT auth via httpOnly cookie + Bearer, bcrypt.
- Frontend: React 19 + Tailwind + shadcn/ui + framer-motion + lucide-react + sonner.
- Fonts: Outfit (headings) / Manrope (body) / JetBrains Mono.
- Theme: "Dark Automotive Precision" (per design_guidelines.json).

## What's implemented (Feb 2026)
- Auth: register, login, logout, /me, JWT cookies, admin seeding.
- ViaCEP proxy `/api/cep/{cep}` for address autocomplete.
- 2 seeded products with full Portuguese descriptions/specs/images.
- Shopping cart (localStorage) with add/update/remove.
- Multi-step checkout (entrega → pagamento → revisão).
- PIX (5% discount, fake PIX code) and Credit Card (mocked) payment.
- Order creation + order confirmation page with PIX QR copy.
- Customer account page with order history.
- Admin panel `/admin` with stats and full order details.
- CPF validation, masks for CPF/CEP/phone/card.
- Trust signals throughout (SSL, lock, secure badges).

## Core requirements (static)
- All copy in PT-BR.
- PIX gets 5% discount.
- Customer data captured: full name on CPF, CPF, DOB, full address, phone.
- Account registration required to purchase.

## Backlog / Next
- P1: Real payment processor integration (Stripe / Mercado Pago / PIX real).
- P1: Email notifications (Resend).
- P2: Product reviews collection.
- P2: Coupon codes.
- P2: Order status admin updates (mark as shipped, tracking code).
