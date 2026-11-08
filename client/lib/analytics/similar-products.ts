import { newFeatureFlow, rememberFeatureFlow } from "./feature-flow";
import { track } from "./track";

import { completeFeatureIntent } from "@/lib/analytics/feature-login";

export const selectSimilarSource = (
  productId: number,
  source: "search" | "shelf" | "popular_dupe",
  partId?: number,
): void => {
  if (source === "shelf") completeFeatureIntent("similar_shelf");
  const flow = newFeatureFlow("similar_products", source);
  rememberFeatureFlow("similar_products", productId, flow);
  track("similar_source_selected", {
    ...flow,
    base_product_id: productId,
    ...(partId === undefined ? {} : { base_part_id: partId }),
  });
};
