"use client";

import { GoogleAnalytics } from "@next/third-parties/google";

export function GA4() {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  if (!measurementId) {
    return null;
  }

  return <GoogleAnalytics gaId={measurementId} />;
}
