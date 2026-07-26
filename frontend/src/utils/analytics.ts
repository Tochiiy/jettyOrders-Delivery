import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

let initialized = false;

export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID || initialized) return;
  ReactGA.initialize(GA_MEASUREMENT_ID);
  initialized = true;
}

export function trackPageView(path: string): void {
  if (!initialized) return;
  ReactGA.send({ hitType: "pageview", page: path });
}
