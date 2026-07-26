# AgentMemory.md — JettyOrders-Delivery Project State

## Last Updated: July 26, 2026 — Session: Production audit + naming cleanup — 0 TS errors

---

## Project Overview
Food delivery platform with 5 microservices + React/Vite/TypeScript frontend.

**Stack**: TypeScript, Express, Mongoose, JWT, MongoDB Atlas, Cloudinary, Tailwind v4, React 19, Vite, RabbitMQ, Stripe, Python FastAPI, LangChain, Groq, Socket.IO

---

## Service Ports
| Service    | Port | URL                              |
|------------|------|----------------------------------|
| Auth       | 5000 | `http://localhost:5000`          |
| Restaurant | 5001 | `http://localhost:5001`          |
| Utils      | 5002 | `http://localhost:5002`          |
| AI         | 5003 | `http://localhost:5003`          |
| Rider      | 5004 | `http://localhost:5004`          |
| Realtime   | 5005 | `http://localhost:5005`          |
| Frontend   | 5173 | `http://localhost:5173`          |

---

## Database (MongoDB Atlas)
- **Cluster**: `cluster0.2unse2h.mongodb.net`
- **Database**: `jettyOrders-Delivery`
- **Collections**: `users`, `restaurants`, `menuitems`, `carts`, `addresses`, `orders`

### Models

**User** — name, email, picture, role ("seller" | "customer" | "rider" | null), restaurantId

**Restaurant** — name, description, address, image, ownerId, phone, isVerified, isOpen, autoLocation (GeoJSON Point)

**MenuItem** — name, description, price, image, category, restaurantId, isAvailable

**Cart** — userId, items[{ menuItemId, name, price, image, restaurantId, restaurantName, quantity }], subtotal, deliveryFee, platformFee, cartTotal

**Address** — userId, mobile, formattedAddress, location (GeoJSON Point + 2dsphere index)

**Order** — userId, restaurantId, items[{ name, menuItemId, price, quantity }], subtotal, deliveryFee, platformFee, totalAmount, riderId/Name/Phone, distance, riderAmount, addressId, deliveryAddress, status enum (placed→accepted→preparing→ready_for_rider→rider_assigned→pickedUp→delivered/canceled), paymentMethod ("stripe"), paymentStatus ("paid"|"unpaid"), expiresAt (TTL index, 15min)

---

## Backend Endpoints

### Auth Service (`/api/auth`) — returns `token` + `refreshToken`
| Method | Path               | Auth | Description            |
|--------|--------------------|------|------------------------|
| POST   | `/register`        | No   | Email/password register |
| POST   | `/login`           | No   | Email/password or Google OAuth |
| POST   | `/refresh`         | No   | Rotate refresh token (returns new pair) |
| POST   | `/logout`          | Yes  | Clear stored refresh token |
| GET    | `/me`              | Yes  | Fetch current user     |
| POST   | `/add/role`        | Yes  | Assign role            |
| POST   | `/forgot-password` | No   | Send reset email via SMTP |
| POST   | `/reset-password`  | No   | Reset with token       |

### Restaurant Service (`/api/restaurant`)
| Method | Path          | Auth | Role   | Description             |
|--------|---------------|------|--------|-------------------------|
| POST   | `/new`        | Yes  | Seller | Create restaurant       |
| GET    | `/my`         | Yes  | —      | Get my restaurant       |
| GET    | `/all`        | No   | —      | All restaurants (?verified, ?search) |
| GET    | `/nearby`     | No   | —      | Nearby restaurants (?lat, ?lng, ?verified) |
| GET    | `/:id`        | Yes  | —      | Single restaurant       |
| PUT    | `/edit`       | Yes  | Seller | Update restaurant       |
| PUT    | `/status`     | Yes  | Seller | Toggle isOpen           |
| DELETE | `/delete`     | Yes  | Seller | Delete restaurant       |

### Menu Item Service (`/api/menu-item`)
| Method | Path                     | Auth | Role   | Description              |
|--------|--------------------------|------|--------|--------------------------|
| POST   | `/new`                   | Yes  | Seller | Create item (multipart)  |
| GET    | `/all`                   | Yes  | Seller | Get my items             |
| GET    | `/all-available`         | No   | —      | All available items populated |
| GET    | `/public/:restaurantId`  | No   | —      | Public menu              |
| PUT    | `/:id`                   | Yes  | Seller | Update item              |
| PATCH  | `/:id/status`            | Yes  | Seller | Toggle isAvailable       |
| DELETE | `/:id`                   | Yes  | Seller | Delete item              |

### Cart Service (`/api/cart`)
| Method | Path              | Auth | Description                     |
|--------|-------------------|------|---------------------------------|
| POST   | `/add`            | Yes  | Add item to cart                |
| GET    | `/all`            | Yes  | Get cart with calculated fees   |
| PUT    | `/:menuItemId`    | Yes  | Update quantity                 |
| DELETE | `/:menuItemId`    | Yes  | Remove item                     |
| DELETE | `/clear`          | Yes  | Clear cart                      |

### Address Service (`/api/address`)
| Method | Path      | Auth | Description                                  |
|--------|-----------|------|----------------------------------------------|
| POST   | `/add`    | Yes  | Add address (latitude/longitude → GeoJSON)   |
| GET    | `/all`    | Yes  | Get user addresses                           |
| PUT    | `/:id`    | Yes  | Update address                               |
| DELETE | `/:id`    | Yes  | Delete address                               |

### Order Service (`/api/order`)
| Method | Path                     | Auth | Description                                       |
|--------|--------------------------|------|---------------------------------------------------|
| POST   | `/create`                | Yes  | Create order (validates address, cart, restaurant) |
| GET    | `/my-orders`             | Yes  | Get customer's orders                             |
| GET    | `/:id`                   | Yes  | Fetch single order                                |
| GET    | `/restaurant/:id`        | Yes  | Get restaurant's orders (seller)                  |
| PATCH  | `/:orderId/status`       | Yes  | Update order status (seller)                      |
| GET    | `/payment/:orderId`      | Int  | Fetch order for payment (x-internal-key)          |
| POST   | `/current/rider`         | Int  | Rider's active orders (x-internal-key)            |
| PUT    | `/rider/status`          | Int  | Rider updates pickedUp/delivered (x-internal-key) |
| PUT    | `/assign-rider`          | Int  | Assign rider to order (x-internal-key)            |

### Utils Service (`/api/upload`)
| Method | Path | Auth | Description          |
|--------|------|------|----------------------|
| POST   | `/`  | No   | Upload to Cloudinary |

### Utils Service (`/api/payment`)
| Method | Path                        | Auth | Description                          |
|--------|-----------------------------|------|--------------------------------------|
| POST   | `/create-payment-intent`    | No   | Create Stripe PaymentIntent          |
| POST   | `/confirm`                  | No   | Confirm payment (verifies Stripe)    |

### AI Service (`/api/ai`) — Auth: JWT Bearer, Rate Limit: 10/min per endpoint (slowapi)
| Method | Path                    | Description                        |
|--------|-------------------------|------------------------------------|
| POST   | `/suggest-dish`         | Suggest a dish from menu context   |
| POST   | `/suggest-restaurants`  | Recommend restaurants              |
| POST   | `/generate-review`      | Generate order review text         |

### Rider Service (`/api/rider`)
| Method | Path                       | Auth | Description                               |
|--------|----------------------------|------|-------------------------------------------|
| POST   | `/register`                | Yes  | Register rider profile (multipart)        |
| GET    | `/me`                      | Yes  | Get own profile                           |
| PUT    | `/location`                | Yes  | Update geo location                       |
| PATCH  | `/availability`            | Yes  | Toggle availability with location         |
| POST   | `/accept-order/:id`        | Yes  | Accept a delivery order                   |
| GET    | `/active-orders`           | Yes  | Get rider's active orders                 |
| PUT    | `/order-status`            | Yes  | Update order status (pickedUp/delivered)  |
| PUT    | `/internal/location`       | Int  | Internal: update rider location from socket (x-internal-key) |

### Realtime Service (`/api/internal`)
| Method | Path      | Auth           | Description                          |
|--------|-----------|----------------|--------------------------------------|
| POST   | `/emit`   | x-internal-key | Emit Socket.IO event to a room       |

---

## Frontend Pages

| File                        | Route                  | Auth      | Description                    |
|-----------------------------|------------------------|-----------|--------------------------------|
| `Login.tsx`                 | `/login`               | Public    | Google OAuth + email/password  |
| `SelectRole.tsx`            | `/select-role`         | Protected | Role selection                 |
| `Restuarant.tsx`            | `/seller/add`          | Protected + Seller | Seller dashboard      |
| `RestuarantPage.tsx`        | `/restaurant/:id`      | Public    | Restaurant detail + menu       |
| `PublicMenu.tsx`            | `/menu/:id`            | Public    | Single restaurant menu         |
| `BrowseMenu.tsx`            | `/browse`              | Protected | Browse all items               |
| `Cart.tsx`                  | `/cart`                | Protected | Cart with quantity controls    |
| `Address.tsx`               | `/address`             | Protected | Leaflet map + address CRUD     |
| `Order.tsx`                 | `/order`               | Protected | Review order, select address, place order |
| `Checkout.tsx`              | `/checkout`            | Protected | Stripe payment form            |
| `OrderConfirmation.tsx`     | `/order/:id`           | Protected | Post-payment confirmation      |
| `ResetPassword.tsx`         | `/reset-password`      | Public    | Password reset form            |
| `Account.tsx`               | —                      | Component                  | User dropdown                  |
| `RiderDashboard.tsx`        | `/rider/dashboard`     | Protected + Rider         | Registration, profile, availability toggle, available orders, active deliveries (sound: `software-interface-257.wav`) |
| `RestaurantMenu.tsx`        | N/A (component)       | —                        | Full menu page with AI "Suggest a Dish" sidebar |
| `Homepage.tsx`              | `/`                   | Protected                | Nearby restaurants + AI "Restaurant Recommendations" section |
| `MyOrders.tsx`              | `/my-orders`          | Protected                | Customer order history with AI "Generate Review" per delivered order |

---

## Key Frontend Components
| Component              | Purpose                                  |
|------------------------|------------------------------------------|
| `Navbar.tsx`           | Top nav with auth state                  |
| `Account.tsx`          | User dropdown                            |
| `AddResturant.tsx`     | Restaurant create form                   |
| `RestuarantProfile.tsx`| Restaurant card with inline edit         |
| `AddMenuItem.tsx`      | Menu item create form                    |
| `MenuItems.tsx`        | List with expand, edit, toggle, delete   |
| `RestuarantOrder.tsx`  | Seller order list + real-time new order notifications (sound: `notification-951.wav`) |
| `AISuggestion.tsx`     | Reusable AI suggestion card (amber/orange gradient, BiStar icon) with internal loading/error/result state |
| `ProtectedRoute.tsx`   | Redirect to `/login` if no token         |
| `PublicRoute.tsx`      | Redirect to `/` if logged in             |

---

## Real-Time System (Socket.IO)

### Architecture
- **Realtime Service** (port 5005) — standalone Socket.IO + Express server
  - `sockets.ts` — JWT auth middleware + connection handler (join userId + `restaurant-{id}` rooms) + `location:update` listener for riders
  - `internal.ts` — POST `/api/internal/emit` protected by `x-internal-key`, calls `io.to(room).emit(event, payload)`
  - `index.ts` — Express app wrapping HTTP server, calls `initSocketServer`

### Event Flow (New Order → Seller)
1. Stripe payment confirmed → Utils publishes `PAYMENT_SUCCESS` to RabbitMQ
2. Restaurant service `paymentConsumer.ts` consumes event → updates order status → POSTs to realtime `/api/internal/emit` with `{ event: "order:new", room: "restaurant-{id}" }`
3. Realtime service `internal.ts` calls `io.to("restaurant-{id}").emit("order:new", payload)`
4. Seller's socket (joined `restaurant-{id}` room) receives `"order:new"` event
5. `RestuarantOrder.tsx` listener triggers → plays notification sound + refetches orders

### Rider Location Persistence
- Frontend emits `location:update` via Socket.IO every 30s (after geolocation fix)
- Realtime socket handler forwards to rider service `PUT /api/rider/internal/location` (x-internal-key)
- Rider service updates `currentLocation` in DB — ensures `$near` queries in order consumer use fresh data
- Also broadcasts `rider:location` to restaurant room for real-time map tracking

### Key Detail — JWT `restaurantId`
- Auth service signs JWT with `{ userId, restaurantId }` (`restaurantId` may be null for new users)
- Socket.IO auth middleware extracts `restaurantId` from decoded JWT
- Seller's socket joins `restaurant-{id}` room only when `restaurantId` is present
- When seller creates a restaurant, `addRestaurant` returns a new JWT with the restaurantId
- `fetchMyRestaurant` also detects missing `restaurantId` in old tokens and returns a new one

### Notification Sound
- Two sound files in `src/assets/`:
  - `notification-951.wav` — plays in `RestaurantOrders.tsx` on `"order:new"` event
  - `software-interface-257.wav` — plays in `RiderDashboard.tsx` on `"rider:order_available"` event
- Browser autoplay policy: user must click "Enable Sound" button before audio plays
- `RestaurantOrders.tsx` unlocks audio via user gesture, then plays on `"order:new"` event
- `RiderDashboard.tsx` unlocks audio via user gesture, then plays on `"rider:order_available"` event

---

## Rate Limiting
- **Auth**: `authLimiter` — 20 req/15min on login, register, forgot/reset-password; `apiLimiter` — 100 req/15min on all auth routes (express-rate-limit)
  - **Restaurant**: `apiLimiter` — 100 req/15min on all routes (express-rate-limit)
  - **Utils**: `apiLimiter` — 100 req/15min on all routes (express-rate-limit)
  - **Rider**: `apiLimiter` — 100 req/15min on rider routes; `internalLimiter` — 200 req/1min on internal routes (express-rate-limit)
  - **Realtime**: `apiLimiter` — 100 req/15min on API; `internalLimiter` — 200 req/1min on internal emit (express-rate-limit)
  - **AI**: 10 req/min per endpoint (slowapi)

## RabbitMQ Eventing

| Queue           | Producer                                                  | Consumer                      |
|-----------------|-----------------------------------------------------------|-------------------------------|
| `payment_event` | `utils/src/events/paymentProducer.ts` → `publishPaymentSuccess` | `restaurant/src/events/paymentConsumer.ts` → updates order + clears cart + emits Socket.IO event |

**Flow**: Stripe confirm → `/confirm` route → verify with Stripe → publish PAYMENT_SUCCESS → consumer sets `paymentStatus: "paid"`, `status: "placed"`, deletes cart → POSTs to realtime `/api/internal/emit` with `"order:new"` event.

Both services use a `ready` promise pattern in `config/rabbitmq.ts` to prevent race conditions on channel creation.

---

## Stripe Integration
- `stripepay.ts` — `createPaymentIntent(amount)` → cents conversion
- `/confirm` — retrieves PaymentIntent from Stripe, verifies `status === "succeeded"` before publishing
- Keys: publishable in `frontend/.env`, secret in `utils/.env`

---

## AI Service (Python/FastAPI)
- **Location**: `services/ai/`
- **Framework**: FastAPI + LangChain + Groq (llama-3.3-70b-versatile)
- **LangSmith**: Tracing enabled for `jettyOrders-Delivery` project
- **Auth**: JWT Bearer token verification (HS256) via `auth.py` middleware on all routes
- **Rate limiting**: 10 requests/min per endpoint via `slowapi`
- **Startup validation**: fails early if `GROQ_API_KEY` or `JWT_SECRET` missing
- **Field alignment**: Pydantic models accept camelCase from frontend via `Field(alias=...)`
- **Routes**: `suggest-dish`, `suggest-restaurants`, `generate-review`
- **Pattern**: Frontend passes context → AI returns text — no DB access

---

## API Config (Frontend)
All services import from a single `services/api.ts`:
- `RESTAURANT_API`, `UTILS_API`, `AUTH_API`, `AI_API`, `REALTIME_API`
- `RIDER_API` — `http://localhost:5004`
- `authHeaders()` — Bearer token helper
- `refreshToken` stored in `localStorage` alongside `token`; auto-refresh on 401 in AppContext

---

## Environment Variables

### Auth (`services/auth/.env`)
```
PORT=5000, MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET (optional, falls back to JWT_SECRET),
GOOGLE_CLIENT_ID/SECRET, SMTP_HOST/PORT/USER/PASS/FROM
```

### Restaurant (`services/restaurant/.env`)
```
PORT=5001, MONGO_URI, JWT_SECRET, INTERNAL_SERVICE_KEY,
UTILS_SERVICE, RABBITMQ_URL, PAYMENT_QUEUE, REALTIME_SERVICE_URL
```

### Utils (`services/utils/.env`)
```
PORT=5002, MONGO_URI, JWT_SECRET, CLOUDINARY_*,
RABBITMQ_URL, PAYMENT_QUEUE, RESTUARANT_SERVICE,
STRIPE_SECRET_KEY
```

### AI (`services/ai/.env`)
```
PORT=5003, GROQ_API_KEY, JWT_SECRET, LANGSMITH_TRACING, LANGSMITH_API_KEY
```

### Rider (`services/rider/.env`)
```
PORT=5004, MONGO_URI, JWT_SECRET, REALTIME_SERVICE_URL,
INTERNAL_SERVICE_KEY, RESTAURANT_SERVICE, UTILS_SERVICE,
RABBITMQ_URL, ORDER_EVENT_QUEUE
```

### Realtime (`services/realtime/.env`)
```
PORT=5005, CORS_ORIGIN, JWT_SECRET, INTERNAL_SERVICE_KEY
```

### Frontend (`frontend/.env`)
```
VITE_API_URL, VITE_RESTAURANT_API, VITE_UTILS_API,
VITE_AI_API, VITE_STRIPE_PUBLISHABLE_KEY, VITE_REALTIME_API, VITE_RIDER_API
```

---

## To Run
```bash
# Terminal 1 — Auth
cd services/auth && npx tsx watch src/index.ts

# Terminal 2 — Restaurant
cd services/restaurant && npx tsx watch src/index.ts

# Terminal 3 — Utils
cd services/utils && npx tsx watch src/index.ts

# Terminal 4 — AI
cd services/ai && uv run python src/main.py

# Terminal 5 — Realtime (Socket.IO)
cd services/realtime && npx tsx watch src/index.ts

# Terminal 6 — Rider
cd services/rider && npx tsx watch src/index.ts

# Terminal 7 — Frontend
cd frontend && npm run dev
```

---

## Known Issues / TODOs
### Fixed (this session — Production Audit Jul 26, 2026)
- ~~[ ] Password hash leaked in 5 auth response paths — added `.select("-password")` + safeUser spread~~ **(done)**
- ~~[ ] Any user could confirm anyone's payment — added JWT auth + amount mismatch check to confirmPayment~~ **(done)**
- ~~[ ] Payment always "succeeded" — added amount comparison against DB order total~~ **(done)**
- ~~[ ] Cart race condition — atomic `findOneAndUpdate` with `restaurantId` check~~ **(done)**
- ~~[ ] Refresh token rotation race — atomic `findOneAndUpdate` instead of find+save~~ **(done)**
- ~~[ ] Missing `ORDER_EVENT_QUEUE`/`STRIPE_SECRET_KEY`/`PAYMENT_QUEUE` from REQUIRED_ENV — added in rider/utils~~ **(done)**
- ~~[ ] Consumers started before RabbitMQ ready — `.then()` chains in restaurant/rider~~ **(done)**
- ~~[ ] `assignRiderToOrder` no status validation — added `status === "ready_for_rider"` check~~ **(done)**
- ~~[ ] `updateStatusRider` hardcoded zero coords — fetches restaurant location from DB~~ **(done)**
- ~~[ ] RabbitMQ nack `false` discards messages — changed to `true` (requeue)~~ **(done)**
- ~~[ ] Rider coords stored as strings — `Number()` conversion in all location handlers~~ **(done)**
- ~~[ ] Rider `driversLicenseNumber` leaked in all responses — stripped from all 5 response paths~~ **(done)**
- ~~[ ] `acceptOrder` missing `orderId` validation — added guard~~ **(done)**
- ~~[ ] Socket.IO CORS missing 127.0.0.1 — aligned with HTTP CORS~~ **(done)**
- ~~[ ] `location:update` no input validation — added `typeof` checks + non-silent error logging~~ **(done)**
- ~~[ ] AI service CORS missing 127.0.0.1 + no input size limits — added truncation/injection guardrails~~ **(done)**
- ~~[ ] Frontend `bg-grey-50` → `bg-gray-50` — Tailwind v4 class rename~~ **(done)**
- ~~[ ] `ProtectedRoute.tsx` blocked riders from `/account` — added exception~~ **(done)**
- ~~[ ] `Homepage.tsx` infinite re-fetch from `location` object dep — use lat/lng primitives~~ **(done)**
- ~~[ ] `MenuItems.tsx` missing `restaurantId` dep — added~~ **(done)**
- ~~[ ] `CartContext.tsx` clearCart unhandled rejection — graceful state reset~~ **(done)**
- ~~[ ] `Checkout.tsx` called `onSuccess()` even when confirmPayment failed — moved inside try block~~ **(done)**
- ~~[ ] `Account.tsx` called nonexistent `logout()` instead of `logoutUser()` — fixed~~ **(done)**
- ~~[ ] `trust proxy` missing on rate-limited services — added to all 5 services~~ **(done)**
- ~~[ ] `fetchRestaurantOrders` `limit(0)` returned all docs — default 50, cap 100~~ **(done)**
- ~~[ ] `services/restaurant/src/routes/internal.ts` → `rider.ts` to match resource naming convention~~ **(done)**

### Remaining (planned — after core logic complete)
- [ ] Finish core features / logic (in progress)
- [ ] Sales dashboard — aggregate seller view (placeholder)
- [ ] Tests — all 6 services + frontend
- [ ] Deploy frontend → Vercel
- [ ] Dockerize backend services
- [ ] Host backend → AWS + Render
- [ ] CI/CD pipeline — lint + typecheck + test gate
- [ ] Structured logging — pino/winston with correlation IDs
- [ ] Error tracking — Sentry
- [ ] HTTPS — reverse proxy or ALB
- [ ] internalLimiter on auth + utils internal routes
- [ ] Per-route body size limits (10kb auth, 10mb uploads)
- [ ] CORS — restrict to actual HTTP verbs per route
- [ ] DB migrations — migrate-mongo or similar

---

## File Tree (Key Files)
```
JettyOrders-Delivery/
├── services/
│   ├── ai/
│   │   ├── pyproject.toml
│   │   ├── .env
│   │   └── src/
│   │       ├── main.py, config.py, agents.py, auth.py
│   ├── auth/src/
│   │   ├── controllers/auth.ts
│   │   ├── middlewares/rateLimiter.ts
│   │   ├── models/User.ts
│   │   └── routes/auth.ts
│   ├── restaurant/src/
│   │   ├── config/rabbitmq.ts, db.ts, datauri.ts
│   │   ├── controllers/restaurant.ts, menuitem.ts, cart.ts, address.ts, order.ts
│   │   ├── events/paymentConsumer.ts, order.publisher.ts
│   │   ├── middlewares/isAuth.ts, multer.ts, tryCatch.ts, rateLimiter.ts
│   │   ├── models/Restaurant.ts, MenuItem.ts, CartModel.ts, Address.ts, Order.ts
│   │   ├── routes/restaurant.ts, menuitem.ts, cart.ts, address.ts, order.ts
│   │   └── index.ts
│   ├── rider/
│   │   ├── .env, tsconfig.json, package.json
│   │   └── src/
│   │       ├── config/db.ts, rabbitmq.ts, datauri.ts
│   │       ├── controllers/rider.ts
│   │       ├── events/order.consumer.ts
│   │       ├── middlewares/isAuth.ts, multer.ts, tryCatch.ts, internalAuth.ts, rateLimiter.ts
│   │       ├── models/Rider.ts
│   │       ├── routes/rider.ts
│   │       └── index.ts
│   ├── realtime/
│   │   ├── .env, tsconfig.json, package.json
│   │   └── src/
│   │       ├── index.ts, sockets.ts, internal.ts
│   └── utils/src/
│       ├── config/rabbitmq.ts, stripepay.ts
│       ├── controllers/payment.ts
│       ├── events/paymentProducer.ts
│       ├── routes/payment.ts, cloudinary.ts
│       └── index.ts
└── frontend/src/
    ├── components/ (Navbar, Account, AddResturant, RestuarantProfile, AddMenuItem, MenuItems, RestuarantOrder, AISuggestion, ProtectedRoute, PublicRoute)
    ├── pages/ (Homepage, Login, SelectRole, Restuarant, RestuarantPage, PublicMenu, BrowseMenu, Cart, Address, Order, Checkout, OrderConfirmation, ResetPassword, RiderDashboard, RestaurantMenu, MyOrders)
    ├── services/ (api.ts, authService, restaurantService, menuService, cartService, addressService, orderService, paymentService, aiService, realtimeService, riderService)
    ├── context/ (AppContext, CartContext, SocketContext)
    ├── assets/notification-951.wav
    ├── assets/software-interface-257.wav
    ├── types/types.ts
    ├── App.tsx, main.tsx, index.css
    └── .env
```

---

## Useful Commands
```bash
# AI service setup
cd services/ai && uv sync && uv run python src/main.py

# RabbitMQ (Docker)
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:management

# Check TypeScript compilation
npx tsc --noEmit
```

---

**End of AgentMemory.md**
