# JettyOrders-Delivery — Agent Memory

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 (port 5173)
- **Backend microservices**:
  - auth (5000), restaurant (5001), utils (5002), AI (5003), rider (5004), realtime (5005)
- **Socket.IO**: Customers join `user:{id}` room, sellers join `restaurant-{id}` room
- **RabbitMQ**: Payment events via `PAYMENT_QUEUE`, order lifecycle via `ORDER_EVENT_QUEUE`
- **Windows** case-insensitive filesystem

## What's Built

### Restaurant Service (port 5001)

**Routes:**
| Prefix | Routes |
|---|---|
| `/api/restaurant` | CRUD, status, nearby, all, single |
| `/api/menu-item` | CRUD, availability, public, all-available |
| `/api/cart` | get, add, update, remove, clear |
| `/api/address` | CRUD |
| `/api/order` | create, my-orders, restaurant orders, status update, single order |
| `/api/order/internal` | payment, current/rider, rider/status, assign-rider (internal key) |

**Order-specific endpoints:**
- `POST /create` — create order (unpaid)
- `GET /my-orders` — customer's paid orders
- `GET /restaurant/:restaurantId` — seller's orders
- `GET /:orderId` — single order
- `PUT /:orderId/status` — seller updates status (accepted/preparing/ready_for_rider)
- **Internal** (`/api/order/internal`):
  - `GET /payment/:orderId` — fetch for payment
  - `POST /current/rider` — rider's active orders
  - `PUT /rider/status` — rider updates pickedUp/delivered
  - `PUT /assign-rider` — assign rider to order

**Events:**
- `paymentConsumer.ts` — consumes `PAYMENT_QUEUE`, on `PAYMENT_SUCCESS` updates order to paid+placed, emits realtime `order:new` to restaurant room, publishes `ORDER_PLACED` to `ORDER_EVENT_QUEUE`
- `order.publisher.ts` — exports typed `publishOrderEvent` sending to `ORDER_EVENT_QUEUE`
- Event types: `ORDER_PLACED`, `ORDER_ACCEPTED`, `ORDER_PREPARING`, `ORDER_READY_FOR_RIDER`, `ORDER_RIDER_ASSIGNED`, `ORDER_PICKED_UP`, `ORDER_DELIVERED`

**Order model fields:**
`userId`, `restaurantId`, `restaurantName`, `riderId`, `riderPhone`, `riderName`, `riderImage`, `distance`, `riderAmount`, `items[]`, `subtotal`, `deliveryFee`, `platformFee`, `totalAmount`, `addressId`, `deliveryAddress` (formattedAddress, mobile, lat, lng), `status` (placed→accepted→preparing→ready_for_rider→rider_assigned→pickedUp→delivered/canceled), `paymentMethod`, `paymentStatus`, `expiresAt` (TTL 15min)

### Rider Service (port 5004)

**Routes:**
- `POST /register` — register rider profile (isAuth, uploadFile)
- `GET /me` — get profile
- `PUT /location` — update geo location
- `PATCH /availability` — toggle availability with location
- `PUT /available` — ~~same as availability (duplicate)~~ **(removed)**
- `POST /accept-order/:orderId` — rider accepts an order

**Events:**
- `order.consumer.ts` — consumes `ORDER_EVENT_QUEUE`, on `ORDER_PLACED` finds available+verified riders within 500m of restaurant (GeoJSON `$near`), emits `rider:order_available` to each rider's `user:{id}` room

**Rider model fields:**
`userId` (unique), `phone`, `image`, `driversLicenseNumber` (unique), `isAvailable`, `isVerified`, `totalDeliveries`, `lastActiveAt`, `currentLocation` (2dsphere Point)

### Real-time Flow
1. Customer creates order → unpaid, TTL 15min
2. Payment service processes → publishes `PAYMENT_SUCCESS` to RabbitMQ
3. `paymentConsumer` receives → order set to paid+placed → emits `order:new` to restaurant room → publishes `ORDER_PLACED` to `ORDER_EVENT_QUEUE`
4. Rider `order.consumer` receives `ORDER_PLACED` → finds nearby riders → emits `rider:order_available` to each
5. Rider accepts via `POST /accept-order/:orderId` → calls restaurant `PUT /assign-rider` → order set to `rider_assigned`, rider set unavailable → emits `order:update` to restaurant, customer, and rider rooms → publishes `ORDER_RIDER_ASSIGNED`
6. Seller updates status → emits `order:update` to customer → publishes `ORDER_ACCEPTED`/`ORDER_PREPARING`/`ORDER_READY_FOR_RIDER`
7. Rider updates status (pickedUp/delivered) → emits to customer + restaurant → publishes `ORDER_PICKED_UP`/`ORDER_DELIVERED`

### Naming Conventions
- `Restuarant` → `Restaurant` (fixed)
- `fetchSingleRestuarant` → `fetchSingleRestaurant` (fixed)
- `restuarantName` → `restaurantName` (fixed)

### Frontend AI Features
- `components/AISuggestion.tsx` — reusable AI suggestion card with star icon (amber/orange gradient), manages input/loading/result/error state internally
- Uses `BiStar` icon (matches modern recommendation UI), mounted via props: `title`, `description`, `placeholder`, `buttonText`, `apiCall`, `extractResult`
- Mounted in 3 pages:
  - `RestaurantMenu.tsx` — suggest a dish based on menu items + user preference
  - `Homepage.tsx` — restaurant recommendations based on craving input
  - `MyOrders.tsx` — generate review on delivered orders

### AI Service (port 5003)
- **Auth**: JWT verification via `auth.py` (Bearer token, HS256)
- **Rate limiting**: 10 requests/min per endpoint via `slowapi`
- **Startup validation**: fails early if `GROQ_API_KEY` or `JWT_SECRET` missing
- **Field alignment**: Pydantic models accept camelCase from frontend via `Field(alias=...)`

### Sound Notifications
- `notification-951.wav` — restaurant new order alert (`RestaurantOrders.tsx`, plays on `order:new`)
- `software-interface-257.wav` — rider available delivery alert (`RiderDashboard.tsx`, plays on `rider:order_available`)
- Both have unlock banners for browser autoplay policy

### Frontend Rider Dashboard
- `pages/RiderDashboard.tsx` — registration form, profile card, availability toggle with geolocation, stats, available orders, active deliveries
- `services/riderService.ts` — API calls
- `components/ProtectedRoute.tsx` — rider role redirects to RiderDashboard
- `components/Navbar.tsx` — cart/browse hidden for riders

## Refresh Token Rotation
- **Backend**: `refreshToken` field (sha256 hashed) on User model, `POST /api/auth/refresh` validates + rotates, `POST /api/auth/logout` clears it
- **Token format**: Access token (7d JWT) + opaque refresh token (30d, rotated on each use)
- **Frontend**: `refreshToken` stored in localStorage alongside `token`, auto-refresh on 401 in `AppContext.tsx` (`fetchUser` retry flow)
- All login/register/add-role endpoints return both `token` and `refreshToken`

## Recent Security Hardening & Cleanup

### Critical
- ~~`jwt.decode()` → `jwt.verify()` in `restaurant.ts:94` — no longer accepts tampered/expired tokens~~ **(done)**
- ~~CORS restricted (`localhost:5173` + `127.0.0.1:5173`) on Rider, Utils, Realtime — was wide-open~~ **(done)**
- ~~`express.json({ limit: "10mb" })` on all services — was unlimited (DoS vector)~~ **(done)**

### High — Security
- ~~Multer: 5MB file size limit + MIME whitelist (JPEG/PNG/WebP/GIF/AVIF) on restaurant + rider~~ **(done)**
- ~~TryCatch: returns generic `"Server error"` instead of leaking `error.message` (stack traces, MongoDB details)~~ **(done)**
- ~~Reset token no longer returned in API response when SMTP not configured~~ **(done)**
- ~~Env var validation at startup in all 6 services — fails early if `JWT_SECRET`, `MONGO_URI`, etc. missing~~ **(done)**
- ~~`RESTUARANT_SERVICE` → `RESTAURANT_SERVICE` typo fixed in `paymentHeader.ts`~~ **(done)**
- ~~Internal endpoints moved to dedicated `/api/order/internal` routes with rate limiter~~ **(done)**
- ~~Express error handler for Multer errors (LIMIT_FILE_SIZE, invalid file type)~~ **(done)**

### High — Database
- ~~Compound indexes on `Order` (`userId+paymentStatus`, `restaurantId+paymentStatus+createdAt`, `riderId+status`, `status+expiresAt`)~~ **(done)**
- ~~Compound index on `Rider` (`isAvailable+isVerified+currentLocation:2dsphere`)~~ **(done)**
- ~~N+1 query in `createOrder`: single `MenuItem.find({ $in })` replaces per-item loop~~ **(done)**
- ~~`.lean()` added to 25+ read-only queries across all services~~ **(done)**

### High — Frontend
- ~~`"strict": true` enabled in `tsconfig.app.json`~~ **(done)**
- ~~`ErrorBoundary` component wrapping all routes in `App.tsx`~~ **(done)**
- ~~`SocketContext`: stale `ref` → reactive `state` so socket changes propagate to consumers~~ **(done)**
- ~~`Order.tsx`: seller redirect moved from render → `useEffect` (React 19 warning)~~ **(done)**

## Next Steps / Where to Continue
1. ~~**Frontend**: Build rider order acceptance UI~~ **(done)**
2. ~~**Frontend**: Build rider active orders view~~ **(done)**
3. ~~**Cleanup**: Rename `fetchSingleRestuarant` → `fetchSingleRestaurant` and `restuarantName` → `restaurantName`~~ **(done)**
4. ~~**Cleanup**: Remove duplicate `PUT /available` route~~ **(done)**
5. ~~**Backend**: Fix Mongoose `{ new: true }` deprecation~~ **(done)**
6. ~~**Socket**: Fix reconnection on JWT change~~ **(done)**
7. ~~**Auth TS errors**: Add `restaurantId` to `User` model~~ **(done)**
8. ~~**Cleanup**: Swap sound files (notification-951.wav → restaurant, software-interface-257.wav → rider)~~ **(done)**
9. ~~**Cleanup**: `PUT /add/role` → `POST /add/role`~~ **(done)**
10. ~~**Backend**: Wire rider's `updateLocation` into the order consumer~~ **(done)**
11. ~~**Security**: JWT decode fix, CORS, body limits, file validation, TryCatch, env validation, internal routes~~ **(done)**
12. ~~**Rate limiting / input validation middleware**~~ **(done)**
13. ~~**Database**: Compound indexes, N+1 fix, `.lean()` on read-only queries~~ **(done)**
14. ~~**Frontend**: strict mode, error boundary, socket context fix~~ **(done)**
15. ~~**Cleanup**: Remove `ready_for_pickup` status, unify to `ready_for_rider` across backend model, frontend types, and all pages~~ **(done)**
16. ~~**Cleanup**: Rename `ORDER_READY_FOR_PICKUP` event → `ORDER_READY_FOR_RIDER` in publisher, controller, AGENTS.md~~ **(done)**
17. ~~**AI service**: Add JWT auth, rate limiting (slowapi), startup env validation~~ **(done)**
18. ~~**Frontend AI**: Build AISuggestion component, integrate into 3 pages (RestaurantMenu, Homepage, MyOrders)~~ **(done)**
19. ~~**Refresh token rotation**: Added refreshToken field to User, POST /auth/refresh with rotation, POST /auth/logout, auto-refresh on 401 in AppContext~~ **(done)**
20. **Sales dashboard**: Sellers have `SellerOrders` but no aggregate sales view (placeholder only)
21. **Tests**: Zero tests across all 6 services and frontend

## Rider Dashboard Features (added)
- **Registration**: phone, drivers license, photo upload, location
- **Profile card**: image, verification badge, phone, stats
- **Availability toggle**: geolocation-based online/offline toggle
- **Available orders**: listens for `rider:order_available` socket events, shows distance + rider amount, Accept button
- **Active deliveries**: fetches assigned orders, shows restaurant, items, total, delivery address; action buttons for Picked Up / Delivered
- **Sound notification**: `software-interface-257.wav` plays on new available order, unlock banner for browser autoplay policy

## Rider Service Backend (added)
- **Controllers**: `getActiveOrders` (proxies restaurant `POST /api/order/current/rider`), `updateOrderStatus` (proxies restaurant `PUT /api/order/rider/status`)
- **Routes**: `GET /active-orders`, `PUT /order-status`, both `isAuth`

## Env Files

### Restaurant (.env)
```
PORT=5001
MONGO_URI=...
JWT_SECRET=...
INTERNAL_SERVICE_KEY=...
UTILS_SERVICE=http://localhost:5002
RABBITMQ_URL=amqp://...
PAYMENT_QUEUE=payment_event
REALTIME_SERVICE_URL=http://localhost:5005
ORDER_EVENT_QUEUE=order_events
```

### AI Service (.env)
```
PORT=5003
GROQ_API_KEY=...
JWT_SECRET=...
```

### Rider (.env)
```
PORT=5004
MONGO_URI=...
JWT_SECRET=...
INTERNAL_SERVICE_KEY=...
RESTAURANT_SERVICE=http://localhost:5001
UTILS_SERVICE=http://localhost:5002
RABBITMQ_URL=amqp://...
REALTIME_SERVICE_URL=http://localhost:5005
ORDER_EVENT_QUEUE=order_events
```
