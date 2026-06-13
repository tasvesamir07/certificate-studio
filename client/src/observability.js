import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import { inject } from "@vercel/analytics";

export const initObservability = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
    console.log("✅ Sentry client-side initialized.");
  }

  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: "identified_only",
    });
    console.log("✅ PostHog client-side initialized.");
  }

  if (import.meta.env.PROD) {
    inject();
    console.log("✅ Vercel Analytics client-side injected.");
  }
};

export const trackEvent = (eventName, properties = {}) => {
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  if (posthogKey) {
    posthog.capture(eventName, properties);
  }
};
