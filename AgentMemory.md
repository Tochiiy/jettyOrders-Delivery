# AgentMemory.md — JettyOrders-Delivery Project State

## Last Updated: July 5, 2026

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

**Order** — userId, restaurantId, items[{ name, menuItemId, price, quantity }], subtotal, deliveryFee, platformFee, totalAmount, riderId/Name/Phone, distance, riderAmount, addressId, deliveryAddress, status enum ("placed"→"delivered"), paymentMethod ("stripe"), paymentStatus ("paid"|"unpaid"), expiresAt (TTL index, 15min)

---

## Backend Endpoints

### Auth Service (`/api/auth`)
| Method | Path               | Auth | Description            |
|--------|--------------------|------|------------------------|
| POST   | `/register`        | No   | Email/password register |
| POST   | `/login`           | No   | Email/password login   |
| POST   | `/login/google`    | No   | Google OAuth           |
| GET    | `/me`              | Yes  | Fetch current user     |
| PUT    | `/add/role`        | Yes  | Assign role            |
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
| Method | Path                   | Auth | Description                                       |
|--------|------------------------|------|---------------------------------------------------|
| POST   | `/create`              | Yes  | Create order (validates address, cart, restaurant) |
| GET    | `/my-orders`           | Yes  | Get customer's orders                             |
| GET    | `/:id`                 | Yes  | Fetch single order                                |
| GET    | `/restaurant/:id`      | Yes  | Get restaurant's orders (seller)                  |
| PATCH  | `/:orderId/status`     | Yes  | Update order status (seller)                      |
| GET    | `/payment/:orderId`    | Int  | Fetch order for payment (x-internal-key)          |

### Utils Service (`/api/upload`)
| Method | Path | Auth | Description          |
|--------|------|------|----------------------|
| POST   | `/`  | No   | Upload to Cloudinary |

### Utils Service (`/api/payment`)
| Method | Path                        | Auth | Description                          |
|--------|-----------------------------|------|--------------------------------------|
| POST   | `/create-payment-intent`    | No   | Create Stripe PaymentIntent          |
| POST   | `/confirm`                  | No   | Confirm payment (verifies Stripe)    |

### AI Service (`/api/ai`)
| Method | Path                    | Description                        |
|--------|-------------------------|------------------------------------|
| POST   | `/suggest-dish`         | Suggest a dish from menu context   |
| POST   | `/suggest-restaurants`  | Recommend restaurants              |
| POST   | `/generate-review`      | Generate order review text         |

### Realtime Service (`/api/internal`)
| Method | Path      | Auth           | Description                          |
|--------|-----------|----------------|--------------------------------------|
| POST   | `/emit`   | x-internal-key | Emit Socket.IO event to a room       |

---

## Frontend Pages

| File                        | Route                  | Auth      | Description                    |
|-----------------------------|------------------------|-----------|--------------------------------|
| `Homepage.tsx`              | `/`                    | Protected | Nearby restaurants with verified toggle |
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
| `Account.tsx`               | —                      | Component | User dropdown                  |

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
| `RestuarantOrder.tsx`  | Seller order list + real-time new order notifications |
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

### Key Detail — JWT `restaurantId`
- Auth service signs JWT with `{ userId, restaurantId }` (`restaurantId` may be null for new users)
- Socket.IO auth middleware extracts `restaurantId` from decoded JWT
- Seller's socket joins `restaurant-{id}` room only when `restaurantId` is present
- When seller creates a restaurant, `addRestaurant` returns a new JWT with the restaurantId
- `fetchMyRestaurant` also detects missing `restaurantId` in old tokens and returns a new one

### Notification Sound
- `notification-951.wav` in `src/assets/`
- Browser autoplay policy: user must click "Enable Sound" button before audio plays
- `RestuarantOrder.tsx` unlocks audio via user gesture, then plays on `"order:new"` event

---

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
- **Routes**: `suggest-dish`, `suggest-restaurants`, `generate-review`
- **Pattern**: Frontend passes context → AI returns text — no DB access

---

## API Config (Frontend)
All services import from a single `services/api.ts`:
- `RESTAURANT_API`, `UTILS_API`, `AUTH_API`, `AI_API`, `REALTIME_API`
- `authHeaders()` — Bearer token helper

---

## Environment Variables

### Auth (`services/auth/.env`)
```
PORT=5000, MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID/SECRET,
SMTP_HOST/PORT/USER/PASS/FROM
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
PORT=5003, GROQ_API_KEY, LANGSMITH_TRACING, LANGSMITH_API_KEY
```

### Rider (`services/rider/.env`)
```
PORT=5004, MONGO_URI, JWT_SECRET, REALTIME_SERVICE_URL, INTERNAL_SERVICE_KEY
```

### Realtime (`services/realtime/.env`)
```
PORT=5005, CORS_ORIGIN, JWT_SECRET, INTERNAL_SERVICE_KEY
```

### Frontend (`frontend/.env`)
```
VITE_API_URL, VITE_RESTAURANT_API, VITE_UTILS_API,
VITE_AI_API, VITE_STRIPE_PUBLISHABLE_KEY, VITE_REALTIME_API
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
- [ ] Mongoose deprecation: `new: true` → `returnDocument: "after"` in payment consumer
- [ ] Distance hardcoded as `1` in Order.tsx — calculate from lat/lng
- [ ] Order history page for customers (`/orders`)
- [ ] `BrowseMenu` cart is UI-only — no persistence
- [ ] `Sales` tab in seller dashboard is placeholder
- [ ] No rate limiting / validation middleware
- [ ] No tests
- [ ] **Socket does not reconnect when JWT token changes** — after creating a restaurant, the new JWT (with restaurantId) is saved to localStorage but the existing Socket.IO connection still uses the old token, so the seller doesn't join the `restaurant-{id}` room until a page reload
- [ ] Seller order management UI is basic — only shows order IDs, no status update controls yet
- [ ] Rider service has no frontend yet

---

## File Tree (Key Files)
```
JettyOrders-Delivery/
├── services/
│   ├── ai/
│   │   ├── pyproject.toml
│   │   ├── .env
│   │   └── src/
│   │       ├── main.py, config.py, agents.py
│   ├── auth/src/
│   │   ├── controllers/auth.ts
│   │   ├── models/User.ts
│   │   └── routes/auth.ts
│   ├── restaurant/src/
│   │   ├── config/rabbitmq.ts, db.ts, datauri.ts
│   │   ├── controllers/restaurant.ts, menuitem.ts, cart.ts, address.ts, order.ts
│   │   ├── events/paymentConsumer.ts
│   │   ├── middlewares/isAuth.ts, multer.ts, tryCatch.ts
│   │   ├── models/Restaurant.ts, MenuItem.ts, CartModel.ts, Address.ts, Order.ts
│   │   ├── routes/restaurant.ts, menuitem.ts, cart.ts, address.ts, order.ts
│   │   └── index.ts
│   ├── rider/
│   │   ├── .env, tsconfig.json, package.json
│   │   └── src/
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
    ├── components/ (Navbar, Account, AddResturant, RestuarantProfile, AddMenuItem, MenuItems, RestuarantOrder, ProtectedRoute, PublicRoute)
    ├── pages/ (Homepage, Login, SelectRole, Restuarant, RestuarantPage, PublicMenu, BrowseMenu, Cart, Address, Order, Checkout, OrderConfirmation, ResetPassword)
    ├── services/ (api.ts, authService, restaurantService, menuService, cartService, addressService, orderService, paymentService, aiService, realtimeService)
    ├── context/ (AppContext, CartContext, SocketContext)
    ├── assets/notification-951.wav
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
