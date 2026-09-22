/**
 * 아이콘 스프라이트. 모든 아이콘을 문서에 한 번만 그려 두고 <use> 로 참조한다.
 * 같은 아이콘이 여러 번 나와도 path 는 한 벌만 내려간다.
 *
 * 아이콘은 Tabler(https://tabler.io/icons, MIT)에서 가져온다. 어느 이름에서 왔는지는
 * 심볼마다 적어 둔다. 새 아이콘을 넣을 때는 24x24 viewBox 의 path 만 옮겨 담고,
 * 원본 맨 앞의 투명한 사각형(`stroke="none" fill="none"`)은 옮기지 않는다. 홀로 쓰는
 * 파일에서 여백을 잡아 주는 것이라, 여기서는 그릴 것이 없으면서 stroke 설정만 어긋난다.
 *
 * 물방울만 예외로 직접 그린 것을 쓴다. 선이 아니라 면으로 그려야 해서 결이 다르다.
 */
export const ICON_IDS = [
  "home",
  "home-solid",
  "grid",
  "grid-solid",
  "search",
  "search-solid",
  "bookmark",
  "bookmark-solid",
  "chevron-down",
  "chevron-up",
  "chevron-right",
  "chevron-left",
  "check",
  "badge-check",
  "sparkles",
  "info",
  "x",
  "trash",
  "plus",
  "share",
  "instagram",
  "mail",
  "message-question",
  "trending-up",
  "trending-down",
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
        {/* Tabler · home */}
        <symbol id="icon-home" viewBox="0 0 24 24">
          <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
          <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
        </symbol>

        {/* Tabler · home (filled) */}
        <symbol id="icon-home-solid" viewBox="0 0 24 24">
          <path d="M12.707 2.293l9 9c.63 .63 .184 1.707 -.707 1.707h-1v6a3 3 0 0 1 -3 3h-1v-7a3 3 0 0 0 -2.824 -2.995l-.176 -.005h-2a3 3 0 0 0 -3 3v7h-1a3 3 0 0 1 -3 -3v-6h-1c-.89 0 -1.337 -1.077 -.707 -1.707l9 -9a1 1 0 0 1 1.414 0m.293 11.707a1 1 0 0 1 1 1v7h-4v-7a1 1 0 0 1 .883 -.993l.117 -.007z" />
        </symbol>

        {/* Tabler · category */}
        <symbol id="icon-grid" viewBox="0 0 24 24">
          <path d="M4 4h6v6h-6l0 -6" />
          <path d="M14 4h6v6h-6l0 -6" />
          <path d="M4 14h6v6h-6l0 -6" />
          <path d="M14 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
        </symbol>

        {/* Tabler · category (filled) */}
        <symbol id="icon-grid-solid" viewBox="0 0 24 24">
          <path d="M10 3h-6a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1 -1v-6a1 1 0 0 0 -1 -1z" />
          <path d="M20 3h-6a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1 -1v-6a1 1 0 0 0 -1 -1z" />
          <path d="M10 13h-6a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1 -1v-6a1 1 0 0 0 -1 -1z" />
          <path d="M17 13a4 4 0 1 1 -3.995 4.2l-.005 -.2l.005 -.2a4 4 0 0 1 3.995 -3.8z" />
        </symbol>

        {/* Tabler · search */}
        <symbol id="icon-search" viewBox="0 0 24 24">
          <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
          <path d="M21 21l-6 -6" />
        </symbol>

        {/* Tabler · search (filled) */}
        <symbol id="icon-search-solid" viewBox="0 0 24 24">
          <path d="M14 3.072a8 8 0 0 1 2.32 11.834l5.387 5.387a1 1 0 0 1 -1.414 1.414l-5.388 -5.387a8 8 0 1 1 -.905 -13.249" />
        </symbol>

        {/* Tabler · bookmarks */}
        <symbol id="icon-bookmark" viewBox="0 0 24 24">
          <path d="M15 10v11l-5 -3l-5 3v-11a3 3 0 0 1 3 -3h4a3 3 0 0 1 3 3" />
          <path d="M11 3h5a3 3 0 0 1 3 3v11" />
        </symbol>

        {/* Tabler · bookmarks (filled) */}
        <symbol id="icon-bookmark-solid" viewBox="0 0 24 24">
          <path d="M12 6a4 4 0 0 1 4 4v11a1 1 0 0 1 -1.514 .857l-4.486 -2.691l-4.486 2.691a1 1 0 0 1 -1.508 -.743l-.006 -.114v-11a4 4 0 0 1 4 -4h4z" />
          <path d="M16 2a4 4 0 0 1 4 4v11a1 1 0 0 1 -2 0v-11a2 2 0 0 0 -2 -2h-5a1 1 0 0 1 0 -2h5z" />
        </symbol>

        {/* Tabler · chevron-down */}
        <symbol id="icon-chevron-down" viewBox="0 0 24 24">
          <path d="M6 9l6 6l6 -6" />
        </symbol>

        {/* Tabler · chevron-up */}
        <symbol id="icon-chevron-up" viewBox="0 0 24 24">
          <path d="M6 15l6 -6l6 6" />
        </symbol>

        {/* Tabler · chevron-right */}
        <symbol id="icon-chevron-right" viewBox="0 0 24 24">
          <path d="M9 6l6 6l-6 6" />
        </symbol>

        {/* Tabler · chevron-left */}
        <symbol id="icon-chevron-left" viewBox="0 0 24 24">
          <path d="M15 6l-6 6l6 6" />
        </symbol>

        {/* Tabler · check */}
        <symbol id="icon-check" viewBox="0 0 24 24">
          <path d="M5 12l5 5l10 -10" />
        </symbol>

        {/* Tabler · rosette-discount-check */}
        <symbol id="icon-badge-check" viewBox="0 0 24 24">
          <path d="M5 7.2a2.2 2.2 0 0 1 2.2 -2.2h1a2.2 2.2 0 0 0 1.55 -.64l.7 -.7a2.2 2.2 0 0 1 3.12 0l.7 .7c.412 .41 .97 .64 1.55 .64h1a2.2 2.2 0 0 1 2.2 2.2v1c0 .58 .23 1.138 .64 1.55l.7 .7a2.2 2.2 0 0 1 0 3.12l-.7 .7a2.2 2.2 0 0 0 -.64 1.55v1a2.2 2.2 0 0 1 -2.2 2.2h-1a2.2 2.2 0 0 0 -1.55 .64l-.7 .7a2.2 2.2 0 0 1 -3.12 0l-.7 -.7a2.2 2.2 0 0 0 -1.55 -.64h-1a2.2 2.2 0 0 1 -2.2 -2.2v-1a2.2 2.2 0 0 0 -.64 -1.55l-.7 -.7a2.2 2.2 0 0 1 0 -3.12l.7 -.7a2.2 2.2 0 0 0 .64 -1.55v-1" />
          <path d="M9 12l2 2l4 -4" />
        </symbol>

        {/* Tabler · sparkles-2 */}
        <symbol id="icon-sparkles" viewBox="0 0 24 24">
          <path d="M14 6a9.3 9.3 0 0 0 1.516 -.546c.911 -.438 1.494 -1.015 1.937 -1.932c.207 -.428 .382 -.928 .547 -1.522c.165 .595 .34 1.095 .547 1.521c.443 .918 1.026 1.495 1.937 1.933c.426 .205 .925 .38 1.516 .546a9.3 9.3 0 0 0 -1.516 .547c-.911 .438 -1.494 1.015 -1.937 1.932a9 9 0 0 0 -.547 1.521c-.165 -.594 -.34 -1.095 -.547 -1.521c-.443 -.918 -1.026 -1.494 -1.937 -1.932a9 9 0 0 0 -1.516 -.547" />
          <path d="M3 14a21 21 0 0 0 1.652 -.532c2.542 -.953 3.853 -2.238 4.816 -4.806a20 20 0 0 0 .532 -1.662a20 20 0 0 0 .532 1.662c.963 2.567 2.275 3.853 4.816 4.806q .75 .28 1.652 .532a21 21 0 0 0 -1.652 .532c-2.542 .953 -3.854 2.238 -4.816 4.806a20 20 0 0 0 -.532 1.662a20 20 0 0 0 -.532 -1.662c-.963 -2.568 -2.275 -3.853 -4.816 -4.806a21 21 0 0 0 -1.652 -.532" />
        </symbol>

        {/* Tabler · info-square-rounded */}
        <symbol id="icon-info" viewBox="0 0 24 24">
          <path d="M12 9h.01" />
          <path d="M11 12h1v4h1" />
          <path d="M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9" />
        </symbol>

        {/* Tabler · x */}
        <symbol id="icon-x" viewBox="0 0 24 24">
          <path d="M18 6l-12 12" />
          <path d="M6 6l12 12" />
        </symbol>

        {/* Tabler · trash */}
        <symbol id="icon-trash" viewBox="0 0 24 24">
          <path d="M4 7l16 0" />
          <path d="M10 11l0 6" />
          <path d="M14 11l0 6" />
          <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
          <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
        </symbol>

        {/* Tabler · plus */}
        <symbol id="icon-plus" viewBox="0 0 24 24">
          <path d="M12 5l0 14" />
          <path d="M5 12l14 0" />
        </symbol>

        {/*
          Tabler · share

          점 세 개를 선으로 이은 모양이다. Lucide 의 것은 상자에서 화살표가 나가는 모양이라
          내려받기로 읽히기 쉬워 이쪽을 쓴다.

          path 가 24x24 안에서 3~21 만 쓰므로 사방 3 이 비어 있다. 예전에는 그만큼을 잘라
          내려고 viewBox 를 좁혔는데, 그러면 같은 size 를 주어도 그림만 1.2 배로 확대되어
          옆의 뒤로 가기 아이콘보다 크게 보였다. 다른 아이콘과 같은 24 단위를 쓰고 여백도
          그대로 둔다. 같은 size 를 주면 이제 다른 아이콘과 같은 기준으로 그려진다.
        */}
        <symbol id="icon-share" viewBox="0 0 24 24">
          <path d="M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
          <path d="M15 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
          <path d="M15 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
          <path d="M8.7 10.7l6.6 -3.4" />
          <path d="M8.7 13.3l6.6 3.4" />
        </symbol>

        {/* Tabler · brand-instagram */}
        <symbol id="icon-instagram" viewBox="0 0 24 24">
          <path d="M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4l0 -8" />
          <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
          <path d="M16.5 7.5v.01" />
        </symbol>

        {/* Tabler · mail */}
        <symbol id="icon-mail" viewBox="0 0 24 24">
          <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10" />
          <path d="M3 7l9 6l9 -6" />
        </symbol>

        {/* Tabler · message-circle-question */}
        <symbol id="icon-message-question" viewBox="0 0 24 24">
          <path d="M15.02 19.52c-2.341 .736 -5 .606 -7.32 -.52l-4.7 1l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c1.649 1.407 2.575 3.253 2.742 5.152" />
          <path d="M19 22v.01" />
          <path d="M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" />
        </symbol>

        {/*
          순위 변동. 이 둘만 Tabler(https://tabler.io/icons, MIT)에서 가져온다.

          원본 SVG 맨 앞의 투명한 사각형(`stroke="none" fill="none"`)은 옮기지 않는다.
          홀로 쓰는 파일에서 여백을 잡아 주는 것이라, 여기서는 그릴 것이 없으면서
          stroke 설정만 어긋나게 만든다.

          viewBox 를 24x24 그대로 두지 않고 그림에 맞춰 좁힌다. 두 아이콘의 path 는
          x 3~21, y 7~17 만 쓰므로 위아래로 7 씩 비어 있고, 그대로 두면 지정한 크기보다
          한참 작게 보인다. 선은 path 위에 가운데로 그려져 굵기의 절반(1.25)이 경계 밖으로
          나가므로 그만큼 넓혀 잘리지 않게 한다. 물방울도 같은 이유로 viewBox 를 좁혀 두었다.

          결과는 20.5x12.5 로 가로가 길다. 정사각형 크기를 주면 위아래가 남으므로,
          쓰는 쪽에서 width 와 height 를 비율에 맞춰 따로 준다.
        */}
        <symbol id="icon-trending-up" viewBox="1.75 5.75 20.5 12.5">
          <path d="M3 17l6 -6l4 4l8 -8" />
          <path d="M14 7l7 0l0 7" />
        </symbol>

        <symbol id="icon-trending-down" viewBox="1.75 5.75 20.5 12.5">
          <path d="M3 7l6 6l4 -4l8 8" />
          <path d="M21 10l0 7l-7 0" />
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
