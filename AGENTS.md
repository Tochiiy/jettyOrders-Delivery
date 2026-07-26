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

## Production Audit — Complete (Jul 26, 2026)

### CRITICAL (4/4 fixed)
| Bug | Service | Fix |
|---|---|---|
| Password hash leaked in 5 auth responses | auth | `.select("-password")` + safeUser spread |
| Any user could confirm anyone's payment | utils | Added JWT auth + amount mismatch check to confirmPayment |
| Payment always "succeeded" | utils | Added `paymentIntent.amount !== Math.round(orderData.amount * 100)` |
| Rider `latitude === undefined` rejected 0 | rider | Changed to `latitude == null` everywhere |

### HIGH (9/9 fixed)
| Bug | Service | Fix |
|---|---|---|
| Cart race condition | restaurant | Atomic `findOneAndUpdate` with `restaurantId` check |
| Refresh token rotation race | auth | Atomic `findOneAndUpdate` instead of find+save |
| Missing `ORDER_EVENT_QUEUE` in rider env validation | rider | Added to REQUIRED_ENV |
| Missing `STRIPE_SECRET_KEY`, `PAYMENT_QUEUE` in utils env validation | utils | Added to REQUIRED_ENV |
| Rider consumer started before RabbitMQ ready | rider | `.then()` chain |
| `updateStatusRider` hardcoded zero coords | restaurant | Fetches restaurant via `findById().lean()` |
| `assignRiderToOrder` no status validation | restaurant | Validates `status === "ready_for_rider"` |
| `Account.tsx` `logout()` → `logoutUser()` | frontend | Fixed method name |
| `Checkout.tsx` called `onSuccess()` after confirmPayment failed | frontend | Moved `onSuccess()` inside try block |

### MEDIUM (12/12 fixed)
| Bug | Service | Fix |
|---|---|---|
| Missing `.lean()` on 2 queries | restaurant | Added `.lean()` |
| RabbitMQ nack `false` on all consumers | restaurant, rider | Changed to `true` (requeue) |
| Rider coords stored as strings | rider | `Number()` conversion in register/toggle/updateLocation |
| `acceptOrder` missing `orderId` validation | rider | Added `if (!orderId)` check |
| Rider response leaks (`driversLicenseNumber`) | rider | Stripped from all 5 response paths |
| Socket.IO CORS didn't include 127.0.0.1 | realtime | Added to origin array |
| `location:update` no input validation | realtime | Added `typeof` checks |
| Silent `.catch(() => {})` on location persist | realtime | Added `console.error` |
| AI service CORS didn't include 127.0.0.1 | AI | Added to allow_origins |
| AI input size limits / injection guardrails | AI | Capped items at 50, strings truncated |
| `updateOrderStatus` no null-safe coords | restaurant | Added `?.` + `?? 0` |
| `fetchRestaurantOrders` `limit(0)` returned all | restaurant | Default 50, cap 100 |

### Infrastructure (5/5 fixed)
| Change | Services |
|---|---|
| `app.set("trust proxy", 1)` for rate-limit IP accuracy | auth, restaurant, rider, utils, realtime |
| Payment consumer started after RabbitMQ ready | restaurant |
| Order consumer started after RabbitMQ ready | rider |
| `createOrder` NaN riderAmount guard | restaurant |
| `updateOrderStatus`/`updateStatusRider` null-safe coords | restaurant |

### Frontend Only (8/8 fixed)
| Bug | Fix |
|---|---|
| `bg-grey-50` → `bg-gray-50` (Tailwind v4) | Account.tsx, RestaurantOrders.tsx |
| `ProtectedRoute.tsx` blocked riders from `/account` | Added `/account` exception |
| `Homepage.tsx` infinite re-fetch from object dep | `[location]` → `[location?.latitude, location?.longitude]` |
| `MenuItems.tsx` missing `restaurantId` dep | Added to deps array |
| `CartContext.tsx` clearCart unhandled rejection | Swallows error, resets all state to 0 |

## Next Steps / Where to Continue
1. ~~**All (38+ fixes)** — Production audit completed, all critical/high/medium bugs resolved (Jul 26, 2026)~~ **(done)**
2. **Finish core logic & features** (in progress)
3. **Sales dashboard**: Sellers have `SellerOrders` but no aggregate sales view (placeholder only)
4. **Tests**: Write tests across all 6 services and frontend
5. **Frontend deploy**: Vercel
6. **Dockerize**: All backend services
7. **Host**: AWS (backend services) + Render
8. **CI/CD pipeline**: Lint + typecheck + test gate
9. **Structured logging**: Levels + correlation IDs (pino/winston)
10. **Error tracking**: Sentry or similar
11. **HTTPS**: Reverse proxy (nginx/Caddy) or ALB
12. **Internal rate limiters**: Add `internalLimiter` to auth + utils
13. **Body size limits**: Tighten per-route (10kb on auth, 10mb on uploads)
14. **CORS methods**: Restrict to actual HTTP verbs per route
15. **DB migrations**: Tool like migrate-mongo for schema changes

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
