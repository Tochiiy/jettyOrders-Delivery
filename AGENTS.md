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
| `/api/order` | create, payment, my-orders, restaurant orders, status update, single order |

**Order-specific endpoints:**
- `POST /create` — create order (unpaid)
- `GET /payment/:orderId` — fetch for payment (internal key)
- `GET /my-orders` — customer's paid orders
- `GET /restaurant/:restaurantId` — seller's orders
- `POST /current/rider` — rider's active orders (internal key)
- `PUT /rider/status` — rider updates pickedUp/delivered (internal key)
- `PUT /assign-rider` — assign rider to order (internal key)
- `GET /:orderId` — single order
- `PUT /:orderId/status` — seller updates status (accepted/preparing/ready_for_rider)

**Events:**
- `paymentConsumer.ts` — consumes `PAYMENT_QUEUE`, on `PAYMENT_SUCCESS` updates order to paid+placed, emits realtime `order:new` to restaurant room, publishes `ORDER_PLACED` to `ORDER_EVENT_QUEUE`
- `order.publisher.ts` — exports typed `publishOrderEvent` sending to `ORDER_EVENT_QUEUE`
- Event types: `ORDER_PLACED`, `ORDER_ACCEPTED`, `ORDER_PREPARING`, `ORDER_READY_FOR_PICKUP`, `ORDER_RIDER_ASSIGNED`, `ORDER_PICKED_UP`, `ORDER_DELIVERED`

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
6. Seller updates status → emits `order:update` to customer → publishes `ORDER_ACCEPTED`/`ORDER_PREPARING`/`ORDER_READY_FOR_PICKUP`
7. Rider updates status (pickedUp/delivered) → emits to customer + restaurant → publishes `ORDER_PICKED_UP`/`ORDER_DELIVERED`

### Naming Conventions
- `Restuarant` → `Restaurant` (fixed)
- `fetchSingleRestuarant` → `fetchSingleRestaurant` (fixed)
- `restuarantName` → `restaurantName` (fixed)

### Frontend Rider Dashboard
- `pages/RiderDashboard.tsx` — registration form, profile card, availability toggle with geolocation, stats, available orders, active deliveries
- `services/riderService.ts` — API calls
- `components/ProtectedRoute.tsx` — rider role redirects to RiderDashboard
- `components/Navbar.tsx` — cart/browse hidden for riders

## Next Steps / Where to Continue
1. ~~**Frontend**: Build rider order acceptance UI — listen for `rider:order_available` event, show available orders, call `acceptOrder`~~ **(done)**
2. ~~**Frontend**: Build rider active orders view — call `POST /current/rider` to fetch assigned orders, show status + action buttons (pickedUp, delivered)~~ **(done)**
3. ~~**Cleanup**: Rename `fetchSingleRestuarant` → `fetchSingleRestaurant` and `restuarantName` → `restaurantName` across codebase~~ **(done)**
4. ~~**Cleanup**: Remove duplicate `PUT /available` route in rider service or consolidate with `PATCH /availability`~~ **(done)**
5. ~~**Backend**: Fix Mongoose `{ new: true }` deprecation — `returnDocument: "after"` in `order.ts:252` + `rider.ts:102`~~ **(done)**
6. ~~**Socket**: Fix reconnection on JWT change — `useSyncExternalStore` + `token-changed` event dispatched in all 6 token-save locations~~ **(done)**
7. ~~**Auth TS errors**: Add `restaurantId` to `User` model (interface + schema) — 4 TS errors fixed~~ **(done)**
8. ~~**Cleanup**: Swap sound files — `software-interface-257.wav` → RiderDashboard, `notification-951.wav` → RestaurantOrders~~ **(done)**
9. ~~**Cleanup**: `PUT /add/role` → `POST /add/role` for proper REST semantics~~ **(done)**
10. ~~**Backend**: Wire rider's `updateLocation` into the order consumer to refresh rider position periodically~~ **(done — internal location endpoint + socket-to-DB persistence + frontend socket emit)**
11. **Sales dashboard**: Sellers have `SellerOrders` but no aggregate sales view (placeholder only)
12. ~~**Rate limiting / input validation middleware**: No protection on any backend endpoint~~ **(done — `express-rate-limit` on all 5 services)**
13. **Tests**: Zero tests across all 5 services and frontend

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
