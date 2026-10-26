"use client";

import { useState, useSyncExternalStore } from "react";

import { useEventExposure } from "./useEventExposure";

import type { AnalyticsAuthState, EventMap, ShelfEntrySource, ShelfIntent } from "@/lib/analytics/events";
import { analyticsAuthState, subscribeAnalyticsIdentity } from "@/lib/analytics/identity";
import {
  beginShelfJourney,
  createAnalyticsId,
  readShelfJourney,
  shelfJourneyProperties,
} from "@/lib/analytics/shelf-journey";
import { track } from "@/lib/analytics/track";

const unknown = (): AnalyticsAuthState => "unknown";
type ShelfEntryOptions = {
  readonly source: ShelfEntrySource;
  readonly placement: string;
  readonly intent?: ShelfIntent;
  readonly productId?: number;
  readonly authState?: AnalyticsAuthState;
  readonly enabled?: boolean;
  readonly viewKey?: string;
};
const selectShelfEntry = (properties: EventMap["shelf_entry_viewed"], intent: ShelfIntent, productId?: number) => {
  const pending = readShelfJourney();
  const resuming =
    pending?.loginSucceeded && !pending.completed && pending.intent === intent && pending.productId === productId;
  const journey = resuming
    ? pending
    : beginShelfJourney({ source: properties.source, intent, entryAuthState: properties.auth_state, productId });
  track("shelf_entry_selected", { ...properties, ...shelfJourneyProperties(journey) });
};
export const useShelfEntry = ({
  source,
  placement,
  intent = "view_shelf",
  productId,
  authState,
  enabled = true,
  viewKey = "page",
}: ShelfEntryOptions) => {
  const memberState = useSyncExternalStore(subscribeAnalyticsIdentity, analyticsAuthState, unknown);
  const key = `${viewKey}:${authState ?? memberState}`;
  const [view, setView] = useState(() => ({ key, id: createAnalyticsId() }));
  if (view.key !== key) setView({ key, id: createAnalyticsId() });
  const properties = { source, placement, entry_view_id: view.id, auth_state: authState ?? memberState };
  const ref = useEventExposure("shelf_entry_viewed", properties, {
    enabled: enabled && properties.auth_state !== "unknown",
    viewKey: view.id,
  });
  const select = () => {
    if (enabled) selectShelfEntry(properties, intent, productId);
  };
  return { ref, select };
};
