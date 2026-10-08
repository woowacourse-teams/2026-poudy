import { Fragment } from "react";

/**
 * 빗금 뒤에 줄을 바꿀 수 있는 자리를 둔다. `향료/알레르기`, `스킨/토너` 처럼 빗금으로 이은 이름에 쓴다.
 *
 * 글자는 그대로라 링크 이름과 검색에는 영향이 없다. 폭 없는 공백을 넣으면 화면 읽기 프로그램과
 * 링크 이름에 그 글자가 섞인다.
 */
export const slashBreakable = (label: string) =>
  label.split("/").map((part, index) => (
    <Fragment key={index}>
      {index > 0 && (
        <>
          /<wbr />
        </>
      )}
      {part}
    </Fragment>
  ));
