import type { BannerResponse, CurationBannerTargetResponse } from "@poudy/api/api.zod";

export type CurationBanner = BannerResponse & { readonly target: CurationBannerTargetResponse };

export const isCurationBanner = (banner: BannerResponse): banner is CurationBanner => banner.target.type === "CURATION";
