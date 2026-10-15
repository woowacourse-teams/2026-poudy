import { useState } from "react";

import { Badge } from "../src/badge";
import { FilterChip } from "../src/filter-chip";
import { Tag } from "../src/tag";
import { ToggleChip, ToggleGroup } from "../src/toggle-chip";
import { Icon } from "./icons";
import { Section } from "./section";

const QUICK_FILTERS = ["자극성 방부제", "향료/알레르기 성분", "에탄올", "인공 색소"];
const LONG_NAME = "비스-베헤닐/아이소스테아릴/피토스테릴/옥틸도데실 라우로일 글루타메이트";

/** 칩 묶음(FilterChip · ToggleChip · ToggleGroup · Tag · Badge) 견본 */
export function ChipSamples() {
  const [open, setOpen] = useState<string>();
  const [quick, setQuick] = useState<readonly string[]>(["향료/알레르기 성분"]);
  const [any, setAny] = useState(false);
  const [chips, setChips] = useState(["나이아신아마이드", "판테놀", LONG_NAME, "향료/알레르기 성분"]);

  return (
    <>
      <Section title="FilterChip">
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="성분"
            expanded={open === "성분"}
            onOpen={() => setOpen(open === "성분" ? undefined : "성분")}
          />
          <FilterChip label="피부 타입" value="건성" expanded={false} onOpen={() => undefined} />
          <FilterChip label="브랜드" value="닥터지 외 2개" expanded={false} onOpen={() => undefined} />
        </div>
      </Section>

      <Section title="ToggleGroup · ToggleChip md (빠른 필터)">
        <p id="quick-title" className="text-body font-bold text-text-primary">
          피하고 싶은 성분
        </p>
        <ToggleGroup aria-labelledby="quick-title">
          {QUICK_FILTERS.map((name) => (
            <ToggleChip
              key={name}
              pressed={quick.includes(name)}
              onPressedChange={(pressed) =>
                setQuick((current) => (pressed ? [...current, name] : current.filter((item) => item !== name)))
              }
            >
              {name}
            </ToggleChip>
          ))}
        </ToggleGroup>
      </Section>

      <Section title="ToggleChip sm (범위 슬라이더 머리줄의 '상관없음')">
        <div className="flex items-center">
          <span className="flex-1 text-section font-bold text-text-primary">수분감</span>
          <ToggleChip size="sm" pressed={any} onPressedChange={setAny} aria-label="수분감 상관없음">
            상관없음
          </ToggleChip>
        </div>
      </Section>

      <Section title="Tag · selected (선택 성분 칩, 길게 누르기·올려 두기로 전체 이름)">
        <div className="flex flex-wrap gap-2">
          {chips.map((name) => (
            <Tag
              key={name}
              variant="selected"
              onRemove={() => setChips((current) => current.filter((item) => item !== name))}
            >
              {name}
            </Tag>
          ))}
        </div>
      </Section>

      <Section title="Tag · condition (적용 조건 칩)">
        <div className="flex flex-wrap gap-2">
          <Tag variant="condition">나이아신아마이드</Tag>
          <Tag variant="condition">향료/알레르기 성분</Tag>
          <Tag variant="condition">{LONG_NAME}</Tag>
        </div>
      </Section>

      <Section title="Tag · label (효과 · 주의 · 기능 태그)">
        <div className="flex flex-wrap gap-2">
          <Tag variant="label" tone="neutral" icon={<Icon name="share" size={14} />}>
            수분
          </Tag>
          <Tag variant="label" tone="caution">
            향료
          </Tag>
          <Tag variant="label" tone="info">
            보습
          </Tag>
          <Tag variant="label" tone="success">
            진정
          </Tag>
          <Tag variant="label" tone="warning">
            각질 케어
          </Tag>
          <Tag variant="label" tone="muted">
            일반
          </Tag>
          <Tag variant="label" tone="ai">
            피부 장벽
          </Tag>
        </div>
      </Section>

      <Section title="Badge">
        <div className="flex items-center gap-3">
          <Badge variant="ai" />
          <Badge variant="rating" rating="good" />
          <Badge variant="rating" rating="bad" />
        </div>
      </Section>
    </>
  );
}
