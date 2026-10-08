/**
 * 시트로 여는 링크의 누름. 새 탭이나 새 창으로 열려는 누름은 링크에 맡기고, 그냥 누를 때만 시트로 연다.
 *
 * 링크로 그려 두면 검색 로봇과 새 탭으로 여는 사람은 그 화면으로 가고, 그냥 누르는 사람은 화면을 떠나지 않는다.
 */
export const openInPlace = (event: React.MouseEvent<HTMLAnchorElement>, open: () => void) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  open();
};
