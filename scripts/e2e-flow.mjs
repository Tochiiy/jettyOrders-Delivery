#!/usr/bin/env node
/**
 * End-to-end test for the JettyOrders order lifecycle.
 *
 * Drives the public HTTP API through the gateway exactly like the SPA does:
 *   register -> roles -> restaurant + menu -> address + cart -> order
 *   -> Stripe test payment -> seller accept/prepare/ready
 *   -> rider accept/pickup/deliver -> verify final state + realtime events.
 *
 * Requirements:
 *   - `docker compose up -d` is running and healthy
 *   - services/utils/.env has a Stripe *test* key (sk_test_...)
 *
 * Usage: node scripts/e2e-flow.mjs
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GATEWAY = process.env.E2E_GATEWAY || "http://localhost:5007";
const RUN = Date.now().toString(36);
const PASSWORD = "E2ePass123!";

// ---------- tiny helpers ----------

const readEnv = (file) => {
  const out = {};
  for (const raw of readFileSync(path.join(ROOT, file), "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
};

const rootEnv = readEnv(".env");
const utilsEnv = readEnv("services/utils/.env");
const DB_NAME = rootEnv.MONGO_DB || "jettyorders";
const STRIPE_SECRET = utilsEnv.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
// Set when running the stack outside compose (e.g. a plain `docker run` mongo).
const MONGO_CONTAINER = process.env.E2E_MONGO_CONTAINER;

const requireFromFrontend = createRequire(path.join(ROOT, "frontend", "package.json"));

const results = [];
let stepNo = 0;

function log(msg) {
  process.stdout.write(msg);
}

function dump(data) {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return text.length > 700 ? `${text.slice(0, 700)}...` : text;
}

async function step(name, fn, { soft = false } = {}) {
  stepNo += 1;
  const started = Date.now();
  log(`\n[${String(stepNo).padStart(2, "0")}] ${name} ... `);
  try {
    const value = await fn();
    log(`PASS (${Date.now() - started}ms)`);
    results.push({ name, ok: true });
    return value;
  } catch (err) {
    log(`FAIL (${Date.now() - started}ms)\n     ${err.message}`);
    results.push({ name, ok: false, error: err.message });
    if (!soft) {
      summary();
      process.exit(1);
    }
    return undefined;
  }
}

function summary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log("\n" + "=".repeat(64));
  console.log(`E2E summary: ${passed}/${results.length} checks passed`);
  if (failed.length) {
    for (const f of failed) console.log(`  ✗ ${f.name}\n    ${f.error}`);
  }
  console.log("=".repeat(64));
}

async function api(method, urlPath, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${GATEWAY}${urlPath}`, { method, headers, body: payload });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expect(method, urlPath, opts, expected, label) {
  const res = await api(method, urlPath, opts);
  const ok = Array.isArray(expected) ? expected.includes(res.status) : res.status === expected;
  if (!ok) {
    throw new Error(`${label || `${method} ${urlPath}`} -> HTTP ${res.status}: ${dump(res.data)}`);
  }
  return res.data;
}

const filePart = (name, mime) => ({
  blob: new Blob([PNG], { type: mime }),
  name,
});

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function multipart(fields, file) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) fd.append(key, String(value));
  }
  if (file) fd.append("file", file.blob, file.name);
  return fd;
}

function promoteAdmin(email) {
  const script = `db.getSiblingDB(${JSON.stringify(DB_NAME)}).users.updateOne({email:${JSON.stringify(email)}},{$set:{role:"admin"}})`;
  const args = MONGO_CONTAINER
    ? ["exec", MONGO_CONTAINER, "mongosh", "--quiet", "--eval", script]
    : ["compose", "exec", "-T", "mongo", "mongosh", "--quiet", "--eval", script];
  execFileSync("docker", args, { cwd: ROOT, encoding: "utf8" });
}

async function confirmStripeIntent(paymentIntentId) {
  assert(STRIPE_SECRET, "STRIPE_SECRET_KEY missing from services/utils/.env");
  assert(STRIPE_SECRET.startsWith("sk_test_"), "E2E requires a Stripe test secret key (sk_test_...)");
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ payment_method: "pm_card_visa", return_url: GATEWAY }),
  });
  const data = await res.json();
  assert(res.ok, `Stripe confirm failed: ${dump(data)}`);
  assert(data.status === "succeeded", `Stripe intent status is ${data.status}`);
  return data;
}

async function waitFor(label, fn, { timeoutMs = 15000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`${label} timed out after ${timeoutMs}ms${lastErr ? `: ${lastErr.message}` : ""}`);
}

// ---------- flow ----------

let socket;
let orderId;

try {
  // health
  await step("Gateway health endpoint", async () => {
    const data = await expect("GET", "/health", {}, 200, "GET /health");
    assert(data.status === "ok", `unexpected health payload: ${dump(data)}`);
  });

  // accounts
  const customer = await step("Register customer + add customer role", async () => {
    const created = await expect(
      "POST",
      "/api/auth/register",
      { body: { name: "E2E Customer", email: `e2e+${RUN}-customer@example.com`, password: PASSWORD } },
      201,
      "register customer",
    );
    const role = await expect(
      "POST",
      "/api/auth/add/role",
      { token: created.token, body: { role: "customer" } },
      200,
      "add customer role",
    );
    return { ...created, token: role.token, user: role.user };
  });

  const seller = await step("Register seller + add seller role", async () => {
    const created = await expect(
      "POST",
      "/api/auth/register",
      { body: { name: "E2E Seller", email: `e2e+${RUN}-seller@example.com`, password: PASSWORD } },
      201,
      "register seller",
    );
    const role = await expect(
      "POST",
      "/api/auth/add/role",
      { token: created.token, body: { role: "seller" } },
      200,
      "add seller role",
    );
    return { ...created, token: role.token, user: role.user };
  });

  const riderUser = await step("Register rider + add rider role", async () => {
    const created = await expect(
      "POST",
      "/api/auth/register",
      { body: { name: "E2E Rider", email: `e2e+${RUN}-rider@example.com`, password: PASSWORD } },
      201,
      "register rider",
    );
    const role = await expect(
      "POST",
      "/api/auth/add/role",
      { token: created.token, body: { role: "rider" } },
      200,
      "add rider role",
    );
    return { ...created, token: role.token, user: role.user };
  });

  const admin = await step("Register admin + promote in MongoDB", async () => {
    const created = await expect(
      "POST",
      "/api/auth/register",
      { body: { name: "E2E Admin", email: `e2e+${RUN}-admin@example.com`, password: PASSWORD } },
      201,
      "register admin",
    );
    promoteAdmin(created.user.email);
    const me = await expect("GET", "/api/auth/me", { token: created.token }, 200, "admin /me");
    assert(me.user.role === "admin", `admin role was not applied (got ${me.user.role})`);
    return created;
  });

  // restaurant
  const restaurantCoordinates = { latitude: 40.7128, longitude: -74.006 };

  const restaurant = await step("Seller creates restaurant (image upload via utils)", async () => {
    const data = await expect(
      "POST",
      "/api/restaurant/new",
      {
        token: seller.token,
        form: multipart(
          {
            name: `E2E Kitchen ${RUN}`,
            description: "Automated end-to-end restaurant",
            latitude: restaurantCoordinates.latitude,
            longitude: restaurantCoordinates.longitude,
            formattedAddress: "1 E2E Plaza, New York, NY",
            phone: "5551234567",
          },
          filePart("e2e-restaurant.png", "image/png"),
        ),
      },
      201,
      "create restaurant",
    );
    assert(data.restaurant?._id, "restaurant id missing from response");
    assert(data.restaurant.image?.startsWith("http"), "restaurant image was not uploaded");
    return { ...data.restaurant, token: data.token || seller.token };
  });

  await step("Admin verifies restaurant", async () => {
    await expect("PATCH", `/api/admin/verify/restaurant/${restaurant._id}`, { token: admin.token }, 200, "verify restaurant");
  });

  const menuItem = await step("Seller creates menu item with image", async () => {
    const data = await expect(
      "POST",
      "/api/menu-item/new",
      {
        token: restaurant.token,
        form: multipart(
          { name: "E2E Burger", price: "12.50", description: "Test burger", category: "Main" },
          filePart("e2e-item.png", "image/png"),
        ),
      },
      201,
      "create menu item",
    );
    assert(data.menuItem?._id, "menu item id missing");
    assert(data.menuItem.image?.startsWith("http"), "menu item image was not uploaded");
    return data.menuItem;
  });

  await step("Public restaurant + menu endpoints expose the new data", async () => {
    // Include the unique run id in `search` so the Upstash list/nearby cache
    // never returns a payload cached by a previous run.
    const search = encodeURIComponent(`E2E Kitchen ${RUN}`);
    const list = await expect("GET", `/api/restaurant/all?verified=true&search=${search}`, {}, 200, "list restaurants");
    assert(list.restaurants.some((r) => r._id === restaurant._id), "restaurant missing from /all?verified=true");

    const nearby = await expect(
      "GET",
      `/api/restaurant/nearby?latitude=${restaurantCoordinates.latitude}&longitude=${restaurantCoordinates.longitude}&radius=2000&search=${search}`,
      {},
      200,
      "nearby restaurants",
    );
    assert(nearby.restaurants.some((r) => r._id === restaurant._id), "restaurant missing from /nearby");

    const menu = await expect("GET", `/api/menu-item/public/${restaurant._id}`, {}, 200, "public menu");
    assert(menu.menuItems.some((m) => m._id === menuItem._id), "menu item missing from public menu");
  });

  // customer checkout
  const address = await step("Customer adds delivery address", async () => {
    const data = await expect(
      "POST",
      "/api/address/add",
      {
        token: customer.token,
        body: {
          mobile: "5559876543",
          formattedAddress: "2 E2E Street, New York, NY",
          latitude: restaurantCoordinates.latitude + 0.01,
          longitude: restaurantCoordinates.longitude + 0.01,
        },
      },
      201,
      "add address",
    );
    assert(data.address?._id, "address id missing");
    return data.address;
  });

  await step("Customer adds item to cart", async () => {
    const data = await expect(
      "POST",
      "/api/cart/add",
      { token: customer.token, body: { menuItemId: menuItem._id, quantity: 2 } },
      200,
      "add cart item",
    );
    assert(Number(data.cartTotal) > 0, "cart total was not calculated");
  });

  const order = await step("Customer creates order", async () => {
    const data = await expect(
      "POST",
      "/api/order/create",
      { token: customer.token, body: { paymentMethod: "stripe", addressId: address._id } },
      201,
      "create order",
    );
    assert(data.orderId, "order id missing");
    assert(Number(data.amount) > 0, "order amount missing");
    orderId = data.orderId;
    return data;
  });

  const intent = await step("Create Stripe payment intent", async () =>
    expect(
      "POST",
      "/api/payment/create-payment-intent",
      { token: customer.token, body: { orderId: order.orderId, amount: order.amount } },
      200,
      "create payment intent",
    ),
  );

  await step("Confirm Stripe test payment (pm_card_visa)", async () => {
    await confirmStripeIntent(intent.paymentIntentId);
  });

  await step("Customer confirms payment through payment service", async () => {
    await expect(
      "POST",
      "/api/payment/confirm",
      { token: customer.token, body: { paymentIntentId: intent.paymentIntentId, orderId: order.orderId } },
      200,
      "confirm payment",
    );
  });

  await step("Order becomes paid/placed after payment event", async () => {
    await waitFor("order to become paid", async () => {
      const data = await expect("GET", `/api/order/${order.orderId}`, { token: customer.token }, 200, "get order");
      return data.order.paymentStatus === "paid" && data.order.status === "placed";
    });
  });

  // realtime
  await step("Customer connects to Socket.IO through the gateway", async () => {
    const { io } = requireFromFrontend("socket.io-client");
    socket = io(GATEWAY, {
      auth: { token: customer.token },
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
      timeout: 8000,
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("socket connect timeout")), 8000);
      socket.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once("connect_error", (err) => {
        clearTimeout(timer);
        reject(new Error(`connect_error: ${err.message}`));
      });
    });
    assert(socket.connected, "socket is not connected");
  });

  // kitchen
  const kitchenUpdates = [
    ["accepted", "ORDER_ACCEPTED"],
    ["preparing", "ORDER_PREPARING"],
    ["ready_for_rider", "ORDER_READY_FOR_RIDER"],
  ];

  for (const [status] of kitchenUpdates) {
    const received = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no order:update (${status}) within 10s`)), 10000);
      const handler = (payload) => {
        if (payload?.orderId === order.orderId && payload?.status === status) {
          clearTimeout(timer);
          socket.off("order:update", handler);
          resolve(payload);
        }
      };
      socket.on("order:update", handler);
    });

    await step(`Seller moves order to ${status}`, async () => {
      const data = await expect(
        "PUT",
        `/api/order/${order.orderId}/status`,
        { token: restaurant.token, body: { status } },
        200,
        `update order -> ${status}`,
      );
      assert(data.order.status === status, `expected ${status}, got ${data.order.status}`);
    });

    await step(`Customer socket receives order:update -> ${status}`, async () => {
      const payload = await received;
      assert(payload.orderId === order.orderId, "wrong order in realtime payload");
    });
  }

  // rider
  const rider = await step("Rider registers profile (image upload via utils)", async () => {
    const data = await expect(
      "POST",
      "/api/rider/register",
      {
        token: riderUser.token,
        form: multipart(
          {
            phone: "5557778888",
            driversLicenseNumber: `DL-${RUN}`,
            aadharNumber: `AAD-${RUN}`,
            latitude: restaurantCoordinates.latitude + 0.0005,
            longitude: restaurantCoordinates.longitude + 0.0005,
          },
          filePart("e2e-rider.png", "image/png"),
        ),
      },
      201,
      "register rider",
    );
    assert(data.rider?._id, "rider id missing");
    assert(data.rider.image?.startsWith("http"), "rider image was not uploaded");
    return data.rider;
  });

  await step("Admin verifies rider", async () => {
    await expect("PATCH", `/api/admin/verify/rider/${rider._id}`, { token: admin.token }, 200, "verify rider");
  });

  await step("Rider goes online near the restaurant", async () => {
    const data = await expect(
      "PATCH",
      "/api/rider/availability",
      {
        token: riderUser.token,
        body: {
          isAvailable: true,
          latitude: restaurantCoordinates.latitude + 0.0005,
          longitude: restaurantCoordinates.longitude + 0.0005,
        },
      },
      200,
      "rider availability",
    );
    assert(data.rider.isVerified === true, "rider should be verified");
    assert(data.rider.isAvailable === true, "rider should be available");
  });

  await step("Rider accepts the ready order", async () => {
    const data = await expect(
      "POST",
      `/api/rider/accept-order/${order.orderId}`,
      { token: riderUser.token },
      200,
      "accept order",
    );
    assert(data.order.status === "rider_assigned", `expected rider_assigned, got ${data.order.status}`);
    assert(String(data.order.riderId) === String(riderUser.user._id), "wrong rider assigned");
  });

  for (const status of ["pickedUp", "delivered"]) {
    await step(`Rider marks order ${status}`, async () => {
      const data = await expect(
        "PUT",
        "/api/rider/order-status",
        { token: riderUser.token, body: { orderId: order.orderId, status } },
        200,
        `rider -> ${status}`,
      );
      assert(data.order.status === status, `expected ${status}, got ${data.order.status}`);
    });
  }

  await step("Final order state is delivered + paid", async () => {
    const data = await expect("GET", `/api/order/${order.orderId}`, { token: customer.token }, 200, "get order");
    assert(data.order.status === "delivered", `expected delivered, got ${data.order.status}`);
    assert(data.order.paymentStatus === "paid", `expected paid, got ${data.order.paymentStatus}`);
  });

  await step("Customer order history contains the order", async () => {
    const data = await expect("GET", "/api/order/my-orders", { token: customer.token }, 200, "my orders");
    assert(data.orders.some((o) => o._id === order.orderId), "order missing from customer history");
  });

  await step("Cart was cleared after payment", async () => {
    const data = await expect("GET", "/api/cart/all", { token: customer.token }, 200, "get cart");
    assert((data.cart.items || []).length === 0, "cart was not cleared");
  });
} catch (err) {
  console.error(`\nUnexpected failure: ${err.stack || err.message}`);
  results.push({ name: "unexpected failure", ok: false, error: err.message });
} finally {
  if (socket) socket.close();
  summary();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
