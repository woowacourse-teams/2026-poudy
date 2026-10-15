import { useState } from "react";

import { BottomSheet, BottomSheetBody, BottomSheetFooter, BottomSheetHeader } from "../src/bottom-sheet";
import { Button } from "../src/button";
import { ConfirmSheet } from "../src/confirm-sheet";
import { RadioGroup, RadioGroupItem } from "../src/radio-group";
import { TextField } from "../src/text-field";
import { Section } from "./section";

const CATEGORIES = ["전체", "스킨/토너", "에센스/세럼", "크림", "로션", "미스트", "오일"];

/** 시트 묶음(BottomSheet · ConfirmSheet) 견본 */
export function SheetSamples() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [category, setCategory] = useState("전체");
  const [draft, setDraft] = useState("전체");
  const [nestedConfirm, setNestedConfirm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stepOpen, setStepOpen] = useState(false);
  const [step, setStep] = useState<"list" | "detail">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [memo, setMemo] = useState("");
  const [log, setLog] = useState("");

  return (
    <Section title="BottomSheet · ConfirmSheet">
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setDraft(category);
            setFilterOpen(true);
          }}
        >
          필터 시트 열기 (제목 + ✕)
        </Button>
        <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
          확인 시트 열기 (위험)
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setStep("list");
            setStepOpen(true);
          }}
        >
          단계가 있는 시트 열기 (‹ 뒤로, 높이 전환)
        </Button>
        <Button variant="secondary" onClick={() => setFormOpen(true)}>
          입력이 있는 시트 열기 (키보드)
        </Button>
        <p className="text-caption text-text-secondary">
          고른 카테고리: {category} · 마지막 닫힘: {log || "없음"}
        </p>
      </div>

      <BottomSheet
        open={filterOpen}
        onClose={(reason) => {
          setLog(`필터 시트 ${reason}`);
          setFilterOpen(false);
        }}
      >
        <BottomSheetHeader title="카테고리" onClose={() => setFilterOpen(false)} />
        <BottomSheetBody>
          <RadioGroup aria-label="카테고리" variant="list" value={draft} onValueChange={setDraft}>
            {CATEGORIES.map((name) => (
              <RadioGroupItem key={name} value={name}>
                {name}
              </RadioGroupItem>
            ))}
          </RadioGroup>
        </BottomSheetBody>
        <BottomSheetFooter>
          <Button variant="secondary" onClick={() => setNestedConfirm(true)} className="flex-1">
            초기화
          </Button>
          <Button
            onClick={() => {
              setCategory(draft);
              setFilterOpen(false);
            }}
            className="flex-2"
          >
            제품 보기
          </Button>
        </BottomSheetFooter>
      </BottomSheet>

      <ConfirmSheet
        open={nestedConfirm}
        title="고른 조건을 모두 지울까요?"
        description="카테고리 선택이 '전체'로 돌아가요."
        confirmLabel="지우기"
        tone="destructive"
        onCancel={() => setNestedConfirm(false)}
        onConfirm={() => {
          setDraft("전체");
          setNestedConfirm(false);
        }}
      />

      <ConfirmSheet
        open={confirmOpen}
        title="선반에서 뺄까요?"
        description="평가와 메모도 함께 지워져요."
        confirmLabel="빼기"
        tone="destructive"
        onCancel={(reason) => {
          setLog(`확인 시트 ${reason}`);
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          setLog("확인 시트 실행");
          setConfirmOpen(false);
        }}
      >
        <div className="rounded-lg bg-surface p-4 text-body text-text-body">내용 칸(화면의 도메인 컴포넌트)</div>
      </ConfirmSheet>

      <BottomSheet open={stepOpen} onClose={() => setStepOpen(false)}>
        {step === "list" ? (
          <>
            <BottomSheetHeader title="피하고 싶은 성분" onClose={() => setStepOpen(false)} />
            <BottomSheetBody className="pb-6">
              <Button variant="secondary" onClick={() => setStep("detail")} className="w-full">
                자주 피하는 성분이란?
              </Button>
            </BottomSheetBody>
          </>
        ) : (
          <>
            <BottomSheetHeader title="자주 피하는 성분이란?" onBack={() => setStep("list")} />
            <BottomSheetBody className="pb-6">
              <p className="text-body leading-relaxed text-text-body">
                {"민감한 피부에서 자극을 일으킨다고 자주 알려진 성분이에요. 향료, 에탄올, 일부 방부제가 여기에 들어요. ".repeat(
                  4,
                )}
              </p>
            </BottomSheetBody>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)}>
        <BottomSheetHeader title="메모 남기기" onClose={() => setFormOpen(false)} />
        <BottomSheetBody>
          <p className="pb-4 text-body text-text-body">
            {"긴 안내 문구가 이어져 본문이 넘치면 본문만 스크롤해요. ".repeat(12)}
          </p>
          <TextField label="메모" value={memo} onChange={setMemo} placeholder="입력해 주세요" />
        </BottomSheetBody>
        <BottomSheetFooter>
          <Button onClick={() => setFormOpen(false)} className="flex-1">
            저장
          </Button>
        </BottomSheetFooter>
      </BottomSheet>
    </Section>
  );
}
