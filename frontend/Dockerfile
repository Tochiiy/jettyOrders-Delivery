FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_API_URL=http://localhost:5007
ARG VITE_RESTAURANT_API=http://localhost:5007
ARG VITE_UTILS_API=http://localhost:5007
ARG VITE_AI_API=http://localhost:5007
ARG VITE_RIDER_API=http://localhost:5007
ARG VITE_ADMIN_API=http://localhost:5007
ARG VITE_REALTIME_API=http://localhost:5007
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_GA_MEASUREMENT_ID
ARG VITE_SENTRY_DSN

ENV VITE_API_URL=$VITE_API_URL \
    VITE_RESTAURANT_API=$VITE_RESTAURANT_API \
    VITE_UTILS_API=$VITE_UTILS_API \
    VITE_AI_API=$VITE_AI_API \
    VITE_RIDER_API=$VITE_RIDER_API \
    VITE_ADMIN_API=$VITE_ADMIN_API \
    VITE_REALTIME_API=$VITE_REALTIME_API \
    VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY \
    VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
