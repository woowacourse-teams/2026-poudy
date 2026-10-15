"use client";

import { Button } from "@poudy/design-system/button";
import { TextField } from "@poudy/design-system/text-field";
import { useState } from "react";

// TODO(#727): BottomSheet 가 디자인 시스템에 들어오면 그릇만 바꾼다. 지금은 client 의 옛 BottomSheet 를 쓴다.
import { BottomSheet } from "@/components/ui/BottomSheet";
import { requestProductRegistration } from "@/lib/api/feedback";

type ShelfRegistrationSheetProps = {
  readonly open: boolean;
  /** 검색하던 말. 제품명 칸을 미리 채운다(S53h). */
  readonly keyword: string;
  readonly onClose: () => void;
};

/** 제품 등록 요청 시트(S53h). 찾는 제품이 없을 때 브랜드와 제품명을 보낸다. */
export function ShelfRegistrationSheet({ open, keyword, onClose }: ShelfRegistrationSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      {open ? <RegistrationForm keyword={keyword} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function RegistrationForm({ keyword, onClose }: { readonly keyword: string; readonly onClose: () => void }) {
  const [brandName, setBrandName] = useState("");
  const [productName, setProductName] = useState(keyword);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = brandName.trim().length > 0 && productName.trim().length > 0;

  const submit = () => {
    setBusy(true);
    setFailed(false);
    // TODO(#728): 보낸 뒤에는 토스트로 알린다.
    requestProductRegistration({ productName: productName.trim(), brandName: brandName.trim() }).then(onClose, () => {
      setBusy(false);
      setFailed(true);
    });
  };

  return (
    <>
      <BottomSheet.CustomHeader>
        <div className="flex flex-col gap-1 px-5 pt-3 pb-5">
          <BottomSheet.Title className="text-screen font-bold text-text-primary">제품 등록 요청</BottomSheet.Title>
          <p className="text-body-sm text-text-secondary">확인 후 등록되면 검색에서 찾을 수 있어요.</p>
        </div>
      </BottomSheet.CustomHeader>
      <BottomSheet.Body>
        <div className="flex flex-col gap-2 pb-2">
          <TextField label="브랜드" value={brandName} onChange={setBrandName} placeholder="예: 라운드랩" />
          <TextField
            label="제품명"
            value={productName}
            onChange={setProductName}
            serverError={failed ? "요청을 보내지 못했어요. 잠시 뒤 다시 보내 주세요." : undefined}
          />
          {/*
            TODO(#729): 전성분 사진 첨부(ImageAttachment, 선택). 부품이 들어와도 서버의 등록 요청 API 에
            사진을 받을 자리가 없어 함께 보낼 수 없다(보고의 서버 공백 참고).
          */}
        </div>
      </BottomSheet.Body>
      <BottomSheet.Footer>
        <Button className="flex-1" disabled={!ready} busy={busy} onClick={submit}>
          요청 보내기
        </Button>
      </BottomSheet.Footer>
    </>
  );
}
