/**
 * 지금 주소를 읽고 문서를 옮기는 일을 한곳에 둔다. window.location 은 바꿀 수 없는 속성이라,
 * 테스트는 이 모듈을 목으로 바꿔 실제 이동을 막고 읽히는 주소를 정한다.
 */
export const currentUrl = (): URL => new URL(window.location.href);

export const assignLocation = (url: string): void => {
  window.location.assign(url);
};

export const replaceLocation = (url: string): void => {
  window.location.replace(url);
};

export const reloadLocation = (): void => {
  window.location.reload();
};
