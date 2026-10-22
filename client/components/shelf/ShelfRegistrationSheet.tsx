"use client";

import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { TextField } from "@poudy/design-system/text-field";
import { useState } from "react";

import { requestProductRegistration } from "@/lib/api/feedback";

type ShelfRegistrationSheetProps = {
  readonly open: boolean;
  /** 검색하던 말. 제품명 칸을 미리 채운다(S53h). */
  readonly keyword: string;
  readonly onClose: () => void;
  /** 요청을 보냈다. 쓰는 쪽이 시트를 닫고 토스트로 알린다. */
  readonly onSent: () => void;
};

/** 제품 등록 요청 시트(S53h). 찾는 제품이 없을 때 브랜드와 제품명을 보낸다. */
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
  const ready = brandName.trim().length > 0 && productName.trim().length > 0;

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
      <BottomSheetHeader
        title="제품 등록 요청"
        description="확인 후 등록되면 검색에서 찾을 수 있어요."
        onBack={onClose}
      />
      <BottomSheetBody>
        {/* 브랜드 칸은 안내도 오류도 생기지 않아 문구 자리를 두지 않는다. 칸 사이는 16 이다. */}
        <div className="flex flex-col gap-4 pb-2">
          <TextField
            label="브랜드"
            value={brandName}
            onChange={setBrandName}
            placeholder="예: 라운드랩"
            reserveMessage={false}
          />
          <TextField
            label="제품명"
            value={productName}
            onChange={setProductName}
            serverError={failed ? "요청을 보내지 못했어요. 잠시 뒤 다시 보내 주세요." : undefined}
          />
          {/*
            명세의 전성분 사진 첨부(ImageAttachment, 선택)는 두지 않는다. 서버의 등록 요청 API 에 사진을 받을 자리가 없어
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
          // 비어 있으면 이유 문구 없이 막기만 한다(S53h). 칸 라벨이 무엇을 채울지 이미 말한다.
          disabled: !ready,
        }}
      />
    </>
  );
}
