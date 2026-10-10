const S3_IMAGE_HOST = "techcourse-project-2026.s3.ap-northeast-2.amazonaws.com";
const S3_IMAGE_PATH_PREFIX = "/poudy/images/";

/** Routes only Poudy's shared S3 image objects through the optional CDN host. */
export function imageDeliveryUrl(source: string, cdnBaseUrl = process.env.NEXT_PUBLIC_IMAGE_CDN_BASE_URL): string {
  if (!cdnBaseUrl) return source;

  try {
    const imageUrl = new URL(source);
    const cdnUrl = new URL(cdnBaseUrl);

    if (imageUrl.hostname !== S3_IMAGE_HOST || !imageUrl.pathname.startsWith(S3_IMAGE_PATH_PREFIX)) return source;

    const cdnPath = cdnUrl.pathname.replace(/\/+$/, "");
    return `${cdnUrl.origin}${cdnPath}${imageUrl.pathname}${imageUrl.search}${imageUrl.hash}`;
  } catch {
    return source;
  }
}
