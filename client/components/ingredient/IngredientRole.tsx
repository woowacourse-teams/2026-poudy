import type { FormulationRoleResponse } from "@poudy/api/api.zod";
import { Badge } from "@poudy/design-system/badge";
import type { ReactNode } from "react";

/**
 * '무슨 역할을 하나요?' 머리와 설명(명세 S25 역할 카드, S24a·S24b 시트의 역할 설명).
 * 성분 설명·성분군 설명 화면과 두 시트가 함께 쓴다. 설명은 화면이 그려서 넘긴다. 시트는 받아 오는 동안 자리를 채운다.
 */
export function IngredientRole({
  description,
  roles,
}: {
  readonly description: ReactNode;
  /** 배합 목적. 성분군에는 없다. */
  readonly roles?: readonly Pick<FormulationRoleResponse, "id" | "name">[];
}) {
  return (
    <section className="flex flex-col gap-3">
      {/* 기기에서 글자를 키워 제목과 배지가 한 줄에 들어가지 않으면 배지가 다음 줄로 내려간다. */}
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="text-section font-bold text-text-primary">무슨 역할을 하나요?</h2>
        <Badge variant="ai" />
      </div>

      {description}

      {/*
        제형에서 맡는 배합 목적이다. 피부에 주는 효과(skinEffects)와 다른 축이라
        머리 아래 효과 태그와 섞지 않고 설명 아래에 따로 둔다.
      */}
      {roles && roles.length > 0 ? (
        <ul aria-label="배합 목적" className="flex flex-wrap items-center gap-2">
          {roles.map((role) => (
            <li
              key={role.id}
              className="flex h-7 items-center rounded-full bg-layer px-3 text-caption font-medium text-text-body"
            >
              {role.name}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** 설명 글. 화면과 시트가 같은 크기(14)와 행간(relaxed)으로 쓴다. */
export function RoleDescriptionText({ children }: { readonly children: ReactNode }) {
  return <p className="text-body leading-relaxed text-pretty text-text-body">{children}</p>;
}
