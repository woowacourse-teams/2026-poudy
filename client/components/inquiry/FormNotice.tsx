import { Icon } from "@poudy/design-system/icon";

/**
 * 폼 안의 보조 안내(명세 FORM · 안내 행). 카드 바탕 없이 아이콘과 문장만 두어 오류 문구보다 약하게 보인다.
 *
 * 지금은 문의하기에서만 쓰고 상태가 없어 패키지에 넣지 않는다(#741). 다른 화면에서 두 번째로 쓰면 패키지로 올린다.
 */
export function FormNotice({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <section className="flex gap-2">
      {/* 아이콘은 제목 첫 줄 가운데에 맞춘다. 칸 높이는 제목 한 줄(13 × 1.4 ≈ 18)에 가깝게 둔다. */}
      <span aria-hidden="true" className="flex h-5 shrink-0 items-center text-text-secondary">
        <Icon name="info-circle" size={16} scalable />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body-sm leading-snug font-semibold text-text-body">{title}</span>
        <span className="text-body-sm text-text-secondary">{children}</span>
      </span>
    </section>
  );
}

export function PrivacyNotice() {
  return (
    <FormNotice title="개인정보는 빼고 보내 주세요">
      연락처, 주소, 비밀번호 등 개인정보는 글과 사진에서 빼 주세요.
    </FormNotice>
  );
}
