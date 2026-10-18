import { ActionTextLink } from "./AccountActionArea";

/** '로그인 없이 둘러보기'(높이 44 글자 버튼). 로그인 화면과 가입 확인 시트, 업데이트 안내가 함께 쓴다. */
export function BrowseWithoutLoginLink() {
  return <ActionTextLink href="/">로그인 없이 둘러보기</ActionTextLink>;
}
