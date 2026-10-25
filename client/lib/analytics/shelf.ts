"use client";

import type { ShelfIntent } from "./events";
import { ensureShelfJourney, readShelfJourney, shelfJourneyProperties, updateShelfJourney } from "./shelf-journey";
import { track } from "./track";

export const requestShelfLogin = (intent?: ShelfIntent): void => {
  ensureShelfJourney(intent);
  updateShelfJourney({ loginRequested: true, ...(intent ? { intent } : {}) });
  track("shelf_login_requested", { auth_state: "signed_out", ...shelfJourneyProperties() });
};
export const completeShelfIntent = (intent: ShelfIntent, productId?: number): void => {
  const journey = readShelfJourney();
  if (!journey?.loginSucceeded || journey.completed || journey.intent !== intent) return;
  if (intent !== "view_shelf" && journey.productId !== undefined && journey.productId !== productId) return;
  updateShelfJourney({ completed: true });
  track("shelf_intent_completed", {
    ...shelfJourneyProperties(journey),
    intent,
    ...(productId === undefined ? {} : { product_id: productId }),
    auth_state: "signed_in",
  });
};
