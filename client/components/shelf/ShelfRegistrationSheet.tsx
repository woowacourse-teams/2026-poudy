"use client";

import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { TextField } from "@poudy/design-system/text-field";
import { useState } from "react";

import { requestProductRegistration } from "@/lib/api/feedback";
import { RETRY_LATER } from "@/lib/domain/messages";

type ShelfRegistrationSheetProps = {
  readonly open: boolean;
  /** 검색하던 말. 제품명 칸을 미리 채운다(S53h). */
  readonly keyword: string;
  readonly onClose: () => void;
  /** 요청을 보냈다. 쓰는 쪽이 시트를 닫고 토스트로 알린다. */
  readonly onSent: () => void;
};

/** 제품 등록 요청 시트(S53h). 찾는 제품이 없을 때 제품명과, 적었다면 브랜드를 보낸다. */
export function ShelfRegistrationSheet({ open, keyword, onClose, onSent }: ShelfRegistrationSheetProps) {
  // 열 때마다 입력을 새로 시작한다. 닫히는 전환 동안에는 앞의 입력을 그대로 둔다.
  // 열린 횟수는 렌더 중에 앞 값과 견주어 센다(effect 없이 상태를 맞추는 방식).
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((count) => count + 1);
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <RegistrationForm key={session} keyword={keyword} onClose={onClose} onSent={onSent} />
    </BottomSheet>
  );
}

function RegistrationForm({ keyword, onClose, onSent }: Omit<ShelfRegistrationSheetProps, "open">) {
  const [brandName, setBrandName] = useState("");
  const [productName, setProductName] = useState(keyword);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = productName.trim().length > 0;

  const submit = () => {
    setBusy(true);
    setFailed(false);
    requestProductRegistration({ productName: productName.trim(), brandName: brandName.trim() }).then(onSent, () => {
      setBusy(false);
      setFailed(true);
    });
  };

  return (
    <>
      <BottomSheetHeader title="제품 등록 요청" onBack={onClose} />
      <BottomSheetBody>
        {/* 브랜드는 API 가 요구하지 않아 선택 입력이다. 안내도 오류도 생기지 않아 문구 자리를 두지 않는다. 칸 사이는 16 이다. */}
        <div className="flex flex-col gap-4 pb-2">
          <TextField
            label="브랜드"
            optional
            value={brandName}
            onChange={setBrandName}
            placeholder="예: 라운드랩"
            reserveMessage={false}
          />
          <TextField
            label="제품명"
            value={productName}
            onChange={setProductName}
            serverError={failed ? `요청을 보내지 못했어요. ${RETRY_LATER}` : undefined}
          />
          {/*
            전성분 사진 첨부(ImageAttachment)는 두지 않는다(S53h). 서버의 등록 요청 API 에 사진을 받을 자리가 없어
            함께 보낼 수 없다. 서버가 사진을 받게 되면 이 자리에 둔다.
          */}
        </div>
      </BottomSheetBody>
      <BottomSheetFooter
        divided
        primary={{
          label: "요청 보내기",
          onClick: submit,
          busy,
          // 제품명만 필수다. 비어 있으면 막고 버튼 위에 이유를 적는다(S53h, FEEDBACK F06).
          disabledReason: ready ? undefined : "제품명을 입력해 주세요",
        }}
      />
    </>
  );
}
