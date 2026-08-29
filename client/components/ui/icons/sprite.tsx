/**
 * 아이콘 스프라이트. 모든 아이콘을 문서에 한 번만 그려 두고 <use> 로 참조한다.
 * 같은 아이콘이 여러 번 나와도 path 는 한 벌만 내려간다.
 *
 * 아이콘은 Lucide(https://lucide.dev, ISC)에서 가져온다.
 * 새 아이콘을 넣을 때는 24x24 viewBox 의 path 만 옮겨 담는다.
 */
export const ICON_IDS = [
  "home",
  "grid",
  "search",
  "bookmark",
  "chevron-down",
  "chevron-up",
  "chevron-right",
  "chevron-left",
  "check",
  "badge-check",
  "sparkles",
  "info",
  "x",
  "plus",
  "sliders",
  "arrow-up-down",
  "share",
  "instagram",
  "mail",
  "droplet",
  "droplet-solid",
] as const;

export type IconId = (typeof ICON_IDS)[number];

/**
 * 문서에 한 번만 넣는다. 레이아웃 최상단에 두어 모든 화면이 참조하게 한다.
 * 화면에는 보이지 않아야 하므로 크기를 0 으로 두고 스크린리더에서도 감춘다.
 */
export function IconSprite() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        {/* Lucide · house */}
        <symbol id="icon-home" viewBox="0 0 24 24">
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </symbol>

        {/* Lucide · layout-grid */}
        <symbol id="icon-grid" viewBox="0 0 24 24">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </symbol>

        {/* Lucide · search */}
        <symbol id="icon-search" viewBox="0 0 24 24">
          <path d="m21 21-4.34-4.34" />
          <circle cx="11" cy="11" r="8" />
        </symbol>

        {/* Lucide · bookmark */}
        <symbol id="icon-bookmark" viewBox="0 0 24 24">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </symbol>

        {/* Lucide · chevron-down */}
        <symbol id="icon-chevron-down" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </symbol>

        {/* Lucide · chevron-up */}
        <symbol id="icon-chevron-up" viewBox="0 0 24 24">
          <path d="m18 15-6-6-6 6" />
        </symbol>

        {/* Lucide · chevron-right */}
        <symbol id="icon-chevron-right" viewBox="0 0 24 24">
          <path d="m9 18 6-6-6-6" />
        </symbol>

        {/* Lucide · chevron-left */}
        <symbol id="icon-chevron-left" viewBox="0 0 24 24">
          <path d="m15 18-6-6 6-6" />
        </symbol>

        {/* Lucide · check */}
        <symbol id="icon-check" viewBox="0 0 24 24">
          <path d="M20 6 9 17l-5-5" />
        </symbol>

        {/* Lucide · badge-check */}
        <symbol id="icon-badge-check" viewBox="0 0 24 24">
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
          <path d="m9 12 2 2 4-4" />
        </symbol>

        {/* Lucide · sparkles */}
        <symbol id="icon-sparkles" viewBox="0 0 24 24">
          <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
          <path d="M20 2v4" />
          <path d="M22 4h-4" />
          <circle cx="4" cy="20" r="2" />
        </symbol>

        {/* Lucide · info */}
        <symbol id="icon-info" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </symbol>

        {/* Lucide · x */}
        <symbol id="icon-x" viewBox="0 0 24 24">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </symbol>

        {/* Lucide · plus */}
        <symbol id="icon-plus" viewBox="0 0 24 24">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </symbol>

        {/* Lucide · sliders-horizontal */}
        <symbol id="icon-sliders" viewBox="0 0 24 24">
          <line x1="21" x2="14" y1="4" y2="4" />
          <line x1="10" x2="3" y1="4" y2="4" />
          <line x1="21" x2="12" y1="12" y2="12" />
          <line x1="8" x2="3" y1="12" y2="12" />
          <line x1="21" x2="16" y1="20" y2="20" />
          <line x1="12" x2="3" y1="20" y2="20" />
          <line x1="14" x2="14" y1="2" y2="6" />
          <line x1="8" x2="8" y1="10" y2="14" />
          <line x1="16" x2="16" y1="18" y2="22" />
        </symbol>

        {/* Lucide · arrow-up-down */}
        <symbol id="icon-arrow-up-down" viewBox="0 0 24 24">
          <path d="m21 16-4 4-4-4" />
          <path d="M17 20V4" />
          <path d="m3 8 4-4 4 4" />
          <path d="M7 4v16" />
        </symbol>

        {/* Lucide · share */}
        <symbol id="icon-share" viewBox="0 0 24 24">
          <path d="M12 15V3" />
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 8 5-5 5 5" />
        </symbol>

        {/* Lucide · instagram */}
        <symbol id="icon-instagram" viewBox="0 0 24 24">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </symbol>

        {/* Lucide · mail */}
        <symbol id="icon-mail" viewBox="0 0 24 24">
          <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
          <rect x="2" y="4" width="20" height="16" rx="2" />
        </symbol>

        {/*
          물방울. 다른 아이콘과 달리 선이 아니라 면으로 그린다. 테두리까지 path 안에
          담겨 있어 stroke 를 쓰지 않으므로, Icon 이 이 둘만 fill 로 그린다.

          viewBox 는 물방울 경계(5 2 14 20)에 맞춘다. 24x24 그대로 두면 여백 때문에
          지정한 높이보다 작게 보인다.
        */}
        <symbol id="icon-droplet" viewBox="5 2 14 20">
          <path d="M7 15C7 16.3261 7.52678 17.5979 8.46447 18.5355C9.40215 19.4732 10.6739 20 12 20C13.3261 20 14.5979 19.4732 15.5355 18.5355C16.4732 17.5979 17 16.3261 17 15C17 13.274 15.34 9.969 12 5.347C8.66 9.969 7 13.274 7 15ZM12 2C16.6667 8.09 19 12.4233 19 15C19 16.8565 18.2625 18.637 16.9497 19.9497C15.637 21.2625 13.8565 22 12 22C10.1435 22 8.36301 21.2625 7.05025 19.9497C5.7375 18.637 5 16.8565 5 15C5 12.4233 7.33333 8.09 12 2Z" />
        </symbol>

        <symbol id="icon-droplet-solid" viewBox="5 2 14 20">
          <path d="M12 2.06494C16.6667 8.15494 19 12.4883 19 15.0649C19 16.9215 18.2625 18.7019 16.9497 20.0147C15.637 21.3274 13.8565 22.0649 12 22.0649C10.1435 22.0649 8.36301 21.3274 7.05025 20.0147C5.7375 18.7019 5 16.9215 5 15.0649C5 12.4883 7.33333 8.15494 12 2.06494Z" />
        </symbol>
      </defs>
    </svg>
  );
}
