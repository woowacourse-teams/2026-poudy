"use client";
import { Icon } from "@poudy/design-system/icon";
import Image from "next/image";
import { useLayoutEffect, useRef } from "react";

import { startGuideAnimation } from "./guide-animation";
import styles from "./ShelfGuideScene.module.css";

import { BOTTOM_NAVIGATION_TABS, type BottomNavigationTab } from "@/components/ui/bottom-navigation-path";
function GuideNavigation({ active }: { readonly active: BottomNavigationTab }) {
  return (
    <div className={styles["nav"]}>
      {BOTTOM_NAVIGATION_TABS.map((tab) => (
        <div key={tab.key} className={tab.key === active ? styles.on : ""}>
          <Icon name={tab.icon} size={20} filled={tab.key === active} />
          {tab.label}
        </div>
      ))}
    </div>
  );
}
const TONERS = [
  { id: 2, brand: "닥터지", name: "레드 블레미쉬 클리어 수딩 토너", m: 2.5, o: 0.5, price: 39000, vol: 500 },
  { id: 1, brand: "닥터지", name: "블랙 스네일 토너", m: 2.5, o: 0.5, price: 18000, vol: 150, hit: "향료" },
  { id: 15, brand: "셀퓨전씨", name: "PH 컨디션 토너", m: 2, o: 1, price: 24000, vol: 200 },
  {
    id: 94,
    brand: "아누아",
    name: "어성초 77 히알루론산 수분 진정 토너",
    m: 2.5,
    o: 0.5,
    price: 25000,
    vol: 250,
    hit: "시트릭애씨드",
  },
  {
    id: 112,
    brand: "브링그린",
    name: "티트리 시카 수딩 토너",
    m: 2,
    o: 0.5,
    price: 27000,
    vol: 250,
    hit: "시트릭애씨드",
  },
  {
    id: 48,
    brand: "바이오더마",
    name: "센시비오 토너",
    m: 2,
    o: 0.5,
    price: 29500,
    vol: 250,
    hit: "시트릭애씨드 · 폴리솔베이트20",
  },
  { id: 79, brand: "에스트라", name: "에이시카365 수분토너 pH4.5", m: 2.5, o: 0.5, price: 28000, vol: 200 },
  { id: 295, brand: "라운드랩", name: "1025 독도 토너", m: 2.5, o: 0.5, price: 30000, vol: 500 },
] as const;
const LEVELS = ["없음", "낮음", "보통", "높음"] as const;
function Drops({ value, kind }: { readonly value: number; readonly kind: "m" | "o" }) {
  const level = Math.floor(value);
  return (
    <span className={styles[kind]}>
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < Math.max(level, 1) ? "" : styles.off}>
          <Icon name="droplet" size={16} />
        </i>
      ))}
      {kind === "m" ? "수분감" : "유분감"} {LEVELS[level]}
    </span>
  );
}
function GuideTonerList() {
  return (
    <div className={styles["clist"]} data-guide-id="clist">
      {TONERS.map((product) => (
        <div key={product.id} className={[styles.prow, "hit" in product ? styles.bad : ""].join(" ")}>
          <div className={styles["thumb"]}>
            <Image src={`/images/pouch-guide/${product.id}.webp`} alt="" width={80} height={88} draggable={false} />
          </div>
          <div className={styles["tx"]}>
            <span className={styles["br"]}>{product.brand}</span>
            <span className={styles["nm"]}>{product.name}</span>
            <span className={styles["lvl"]}>
              <Drops value={product.m} kind="m" />
              <Drops value={product.o} kind="o" />
            </span>
            <span className={styles["price"]}>
              {product.price.toLocaleString("ko-KR")}원 · {product.vol}ml · ml당{" "}
              {Math.round(product.price / product.vol).toLocaleString("ko-KR")}원
            </span>
          </div>
          {"hit" in product ? (
            <span className={styles["tag"]}>
              <i>
                <Icon name="alert-circle" size={16} />
              </i>
              {product.hit}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
/** 06 시안의 장면을 JSX로 옮긴다. 실제 제품·평가 API를 호출하지 않는 그림이다. */
export function ShelfGuideScene({
  step,
  reduced,
  onComplete,
  active = true,
}: {
  readonly step: number;
  readonly reduced: boolean;
  readonly onComplete: () => void;
  readonly active?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!root.current || !active) return;
    return startGuideAnimation({ root: root.current, step, reduced, onComplete });
  }, [step, reduced, onComplete, active]);
  return (
    <div className={styles.mini} aria-hidden="true" inert>
      <div ref={root} className={styles.sceneRoot} data-guide-scene={step + 1} data-active={active}>
        {
          [
            <Scene1 key="1" />,
            <Scene2 key="2" />,
            <Scene3 key="3" />,
            <FilterScene key="filter" />,
            <Scene4 key="4" />,
          ][step]
        }
      </div>
    </div>
  );
}
function Scene1() {
  return (
    <>
      <div className={styles["top"]}>
        <i className={styles["icon"]}>
          <Icon name="chevron-left" size={20} />
        </i>
        <span className={styles["c"]}>제품 추가</span>
        <i className={styles["icon"]}>
          <Icon name="search" size={20} />
        </i>
      </div>
      <div className={styles["sbox"]}>
        <i className={styles["icon"]}>
          <Icon name="search" size={20} />
        </i>
        <span className={styles["typed"]}></span>
        <span className={styles["caret"]}></span>
        <span className={styles["ph"]}>제품명이나 브랜드로 찾기</span>
      </div>
      <div className={styles["hint"]}>
        <b>어떤 제품을 쓰고 있나요?</b>
        <span>제품명이나 브랜드로 찾아서 파우치에 저장해 보세요.</span>
      </div>
      <div className={styles["results"]}>
        <p className={styles["cap"]}>제품 · 3</p>
        <div className={styles["prow"]}>
          <div className={styles["thumb"]}>
            <Image alt="" src="/images/pouch-guide/1309.webp" width={64} height={64} draggable={false} />
          </div>
          <div className={styles["tx"]}>
            <span className={styles["br"]}>에스티 로더</span>
            <span className={styles["nm"]}>
              리-<b>뉴트리브</b> 얼티미트 다이아몬드 에이지 리버설 <b>로션</b>
            </span>
          </div>
          <span className={styles["obtn"]}>추가</span>
        </div>
        <div className={[styles["prow"], styles["target"]].join(" ")}>
          <div className={styles["thumb"]}>
            <Image alt="" src="/images/pouch-guide/1353.webp" width={64} height={64} draggable={false} />
          </div>
          <div className={styles["tx"]}>
            <span className={styles["br"]}>에스티 로더</span>
            <span className={styles["nm"]}>
              리-<b>뉴트리브</b> 소프트닝 <b>로션</b>
            </span>
          </div>
          <span className={[styles["obtn"], styles["addbtn"]].join(" ")}>추가</span>
        </div>
        <div className={styles["prow"]}>
          <div className={styles["thumb"]}>
            <Image alt="" src="/images/pouch-guide/1347.webp" width={64} height={64} draggable={false} />
          </div>
          <div className={styles["tx"]}>
            <span className={styles["br"]}>에스티 로더</span>
            <span className={styles["nm"]}>
              리-<b>뉴트리브</b> 얼티미트 리프트 리제너레이팅 유쓰 트리트먼트 <b>로션</b>
            </span>
          </div>
          <span className={styles["obtn"]}>추가</span>
        </div>
      </div>
      <div className={styles["dim"]}></div>
      <div className={styles["preview"]}>
        <h4>나와 안 맞을 수 있는 성분</h4>
        <p className={styles["pvsub"]}>지금 결과 · 안 맞은 제품 2개 기준</p>
        <div className={styles["chips"]}>
          <span className={styles["chip"]}>
            폴리솔베이트20{" "}
            <small className={styles["n"]} data-a="2개" data-b="3개">
              2개
            </small>
          </span>
          <span className={styles["chip"]}>
            시트릭애씨드 <small className={styles["n"]}>2개</small>
          </span>
          <span className={[styles["chip"], styles["new"]].join(" ")}>
            향료 <small>2개</small>
          </span>
        </div>
      </div>
      <div className={styles["rsheet"]}>
        <div className={styles["ph"]}>
          <div className={styles["thumb"]}>
            <Image alt="" src="/images/pouch-guide/1353.webp" width={64} height={64} draggable={false} />
          </div>
          <div>
            <div className={styles["br"]}>에스티 로더</div>
            <div className={styles["nm"]}>리-뉴트리브 소프트닝 로션</div>
          </div>
        </div>
        <div className={styles["h2"]}>
          <i className={styles["icon"]}>
            <Icon name="chevron-left" size={20} />
          </i>
          사용감은 어땠나요?
        </div>
        <div className={styles["prog"]}>
          <i className={styles["f"]}></i>
          <i className={styles["p2bar"]}></i>
        </div>
        <div className={[styles["pg"], styles["pg1"], styles["on"]].join(" ")}>
          <div className={styles["q"]}>지금 쓰고 있나요?</div>
          <div className={styles["choice"]}>
            <div className={styles["useYes"]}>네</div>
            <div>아니요</div>
          </div>
          <div className={styles["q"]}>
            피부에 맞았나요? <small>선택</small>
          </div>
          <div className={styles["choice"]}>
            <div>
              <i className={styles["icon"]}>
                <Icon name="thumb-up" size={20} />
              </i>
              잘 맞았어요
            </div>
            <div className={styles["fitBad"]}>
              <i className={styles["icon"]}>
                <Icon name="thumb-down" size={20} />
              </i>
              안 맞았어요
            </div>
          </div>
        </div>

        <div className={styles["sfoot"]}>
          <div className={[styles["btn"], styles["sub"], styles["secondary"]].join(" ")}>나중에</div>
          <div className={[styles["btn"], styles["primary"]].join(" ")}>다음</div>
        </div>
      </div>
      <div className={styles["toast"]}>
        파우치에 저장했어요. 평가는 파우치에서 언제든 할 수 있어요<u>되돌리기</u>
      </div>
      <div className={styles["cursor"]}></div>
    </>
  );
}
function Scene2() {
  return (
    <>
      <div className={styles["top"]}>
        <h1>파우치</h1>
        <i className={styles["icon"]}>
          <Icon name="help-circle" size={20} />
        </i>
        <i className={styles["icon"]}>
          <Icon name="plus" size={20} />
        </i>
        <i className={styles["icon"]}>
          <Icon name="search" size={20} />
        </i>
      </div>
      <div className={styles["tabs2"]}>
        <span className={styles["on"]}>전체 3</span>
        <span>사용 중 3</span>
        <span>사용 완료 0</span>
      </div>
      <div className={styles["sec"]}>사용 중 · 3</div>
      <div className={styles["prow"]}>
        <div className={styles["thumb"]}>
          <Image alt="" src="/images/pouch-guide/46.webp" width={64} height={64} draggable={false} />
          <span className={styles["badge"]}>
            <i className={styles["icon"]}>
              <Icon name="thumb-down" size={20} />
            </i>
          </span>
        </div>
        <div className={styles["tx"]}>
          <span className={styles["br"]}>바이오더마</span>
          <span className={styles["nm"]}>하이드라비오 토너</span>
          <span className={styles["mt"]}>수분감 2 · 유분감 0.5</span>
        </div>
        <i className={styles["icon"]}>
          <Icon name="dots-vertical" size={20} />
        </i>
      </div>
      <div className={styles["prow"]}>
        <div className={styles["thumb"]}>
          <Image alt="" src="/images/pouch-guide/831.webp" width={64} height={64} draggable={false} />
          <span className={styles["badge"]}>
            <i className={styles["icon"]}>
              <Icon name="thumb-down" size={20} />
            </i>
          </span>
        </div>
        <div className={styles["tx"]}>
          <span className={styles["br"]}>이솝</span>
          <span className={styles["nm"]}>이매큘레이트 페이셜 토닉</span>
          <span className={styles["mt"]}>수분감 2 · 유분감 0.5</span>
        </div>
        <i className={styles["icon"]}>
          <Icon name="dots-vertical" size={20} />
        </i>
      </div>
      <div className={styles["prow"]}>
        <div className={styles["thumb"]}>
          <Image alt="" src="/images/pouch-guide/1353.webp" width={64} height={64} draggable={false} />
          <span className={styles["badge"]} data-guide-id="badge2">
            <i className={styles["icon"]}>
              <Icon name="thumb-down" size={20} />
            </i>
          </span>
        </div>
        <div className={styles["tx"]}>
          <span className={styles["br"]}>에스티 로더</span>
          <span className={styles["nm"]}>리-뉴트리브 소프트닝 로션</span>
        </div>
        <span className={styles["obtn"]} data-guide-id="rate2">
          평가하기
        </span>
        <i className={styles["icon"]}>
          <Icon name="dots-vertical" size={20} />
        </i>
      </div>
      <div className={styles["dim"]}></div>
      <div className={styles["preview"]}>
        <h4>나와 안 맞을 수 있는 성분</h4>
        <p className={styles["pvsub"]}>지금 결과 · 안 맞은 제품 2개 기준</p>
        <div className={styles["chips"]}>
          <span className={styles["chip"]}>
            폴리솔베이트20{" "}
            <small className={styles["n"]} data-a="2개" data-b="3개">
              2개
            </small>
          </span>
          <span className={styles["chip"]}>
            시트릭애씨드 <small className={styles["n"]}>2개</small>
          </span>
          <span className={[styles["chip"], styles["new"]].join(" ")}>
            향료 <small>2개</small>
          </span>
        </div>
      </div>
      <div className={styles["rsheet"]}>
        <div className={styles["ph"]}>
          <div className={styles["thumb"]}>
            <Image alt="" src="/images/pouch-guide/1353.webp" width={64} height={64} draggable={false} />
          </div>
          <div>
            <div className={styles["br"]}>에스티 로더</div>
            <div className={styles["nm"]}>리-뉴트리브 소프트닝 로션</div>
          </div>
        </div>
        <div className={[styles["pg"], styles["pg1"], styles["on"]].join(" ")}>
          <div className={styles["q"]}>지금 쓰고 있나요?</div>
          <div className={styles["choice"]}>
            <div className={styles["useYes"]}>네</div>
            <div>아니요</div>
          </div>
          <div className={styles["q"]}>
            피부에 맞았나요? <small>선택</small>
          </div>
          <div className={styles["choice"]}>
            <div>
              <i className={styles["icon"]}>
                <Icon name="thumb-up" size={20} />
              </i>
              잘 맞았어요
            </div>
            <div className={styles["fitBad"]}>
              <i className={styles["icon"]}>
                <Icon name="thumb-down" size={20} />
              </i>
              안 맞았어요
            </div>
          </div>
        </div>
        <div className={styles["sfoot"]}>
          <div className={[styles["btn"], styles["primary"]].join(" ")}>평가 저장</div>
        </div>
      </div>
      <GuideNavigation active={"shelf"} />
      <div className={styles["cursor"]}></div>
    </>
  );
}
function Scene3() {
  return (
    <>
      <div className={styles["top"]}>
        <h1>파우치</h1>
        <i className={styles["icon"]}>
          <Icon name="help-circle" size={20} />
        </i>
        <i className={styles["icon"]}>
          <Icon name="plus" size={20} />
        </i>
        <i className={styles["icon"]}>
          <Icon name="search" size={20} />
        </i>
      </div>
      <div className={styles["acard"]}>
        <div className={styles["hd"]}>
          <span className={styles["ic"]}>
            <i className={styles["icon"]}>
              <Icon name="flask-conical" size={20} filled />
            </i>
          </span>
          <b>안 맞을 수 있는 성분</b>
          <span>필터 관리 ›</span>
        </div>
        <div className={styles["sub"]}>안 맞은 제품 2개 이상에 함께 든 성분</div>
        <div className={styles["chips"]} data-guide-id="ac3">
          <span className={styles["empty"]}>찾는 중…</span>
          <span className={styles["chip"]} data-k="폴리솔베이트20">
            폴리솔베이트20 <small>3개</small>
          </span>
          <span className={styles["chip"]} data-k="시트릭애씨드">
            시트릭애씨드 <small>2개</small>
          </span>
          <span className={styles["chip"]} data-k="향료">
            향료 <small>2개</small>
          </span>
        </div>
        <div className={styles["btn"]}>검색에서 제외할 성분 고르기</div>
      </div>
      <div className={styles["sec"]}>안 맞았어요 · 3</div>
      <div className={styles["prow"]}>
        <div className={styles["thumb"]}>
          <Image alt="" src="/images/pouch-guide/46.webp" width={64} height={64} draggable={false} />
          <span className={styles["badge"]}>
            <i className={styles["icon"]}>
              <Icon name="thumb-down" size={20} />
            </i>
          </span>
        </div>
        <div className={styles["tx"]}>
          <span className={styles["br"]}>바이오더마</span>
          <span className={styles["nm"]}>하이드라비오 토너</span>
        </div>
      </div>
      <div className={styles["ings"]}>
        <span className={[styles["ing"], styles["k"]].join(" ")}>폴리솔베이트20</span>
        <span className={[styles["ing"], styles["k"]].join(" ")}>시트릭애씨드</span>
        <span className={[styles["ing"], styles["k"]].join(" ")}>향료</span>
      </div>
      <div className={styles["prow"]}>
        <div className={styles["thumb"]}>
          <Image alt="" src="/images/pouch-guide/831.webp" width={64} height={64} draggable={false} />
          <span className={styles["badge"]}>
            <i className={styles["icon"]}>
              <Icon name="thumb-down" size={20} />
            </i>
          </span>
        </div>
        <div className={styles["tx"]}>
          <span className={styles["br"]}>이솝</span>
          <span className={styles["nm"]}>이매큘레이트 페이셜 토닉</span>
        </div>
      </div>
      <div className={styles["ings"]}>
        <span className={styles["ing"]}>벤질알코올</span>
        <span className={[styles["ing"], styles["k"]].join(" ")}>폴리솔베이트20</span>
        <span className={[styles["ing"], styles["k"]].join(" ")}>시트릭애씨드</span>
      </div>
      <div className={styles["prow"]}>
        <div className={styles["thumb"]}>
          <Image alt="" src="/images/pouch-guide/1353.webp" width={64} height={64} draggable={false} />
          <span className={styles["badge"]}>
            <i className={styles["icon"]}>
              <Icon name="thumb-down" size={20} />
            </i>
          </span>
        </div>
        <div className={styles["tx"]}>
          <span className={styles["br"]}>에스티 로더</span>
          <span className={styles["nm"]}>리-뉴트리브 소프트닝 로션</span>
        </div>
      </div>
      <div className={styles["ings"]}>
        <span className={styles["ing"]}>녹차추출물</span>
        <span className={[styles["ing"], styles["k"]].join(" ")}>폴리솔베이트20</span>
        <span className={[styles["ing"], styles["k"]].join(" ")}>향료</span>
      </div>
    </>
  );
}
function Scene4() {
  return (
    <>
      <div className={styles["top"]}>
        <i className={styles["icon"]}>
          <Icon name="chevron-left" size={20} />
        </i>
        <h1 className={styles["categoryTitle"]}>스킨/토너</h1>
        <i className={styles["icon"]}>
          <Icon name="search" size={20} />
        </i>
      </div>
      <div className={styles["ctabs"]}>
        <span>전체</span>
        <span className={styles["on"]}>스킨/토너</span>
        <span>에센스/세럼/앰플</span>
        <span>크림</span>
      </div>
      <div className={styles["fchips"]}>
        <span className={[styles["fchip"], styles["r"]].join(" ")}>
          <i className={styles["icon"]}>
            <Icon name="rotate" size={20} />
          </i>
        </span>
        <span className={styles["fchip"]} data-guide-id="mf4">
          <i className={styles["icon"]}>
            <Icon name="user-check" size={20} />
          </i>
          나만의 필터
        </span>
        <span className={styles["fchip"]}>
          성분{" "}
          <i className={styles["icon"]}>
            <Icon name="chevron-down" size={20} />
          </i>
        </span>
        <span className={styles["fchip"]}>
          브랜드{" "}
          <i className={styles["icon"]}>
            <Icon name="chevron-down" size={20} />
          </i>
        </span>
      </div>
      <div className={styles["cnt"]}>
        <span>
          총 <b data-guide-id="n4">299</b>개
        </span>
        <span>기본순 ⌄</span>
      </div>
      <GuideTonerList />
      <GuideNavigation active={"category"} />
      <div className={styles["cursor"]}></div>
    </>
  );
}

/** 실제 성분 추가 화면의 제목·선택 행·버튼을 보여 주는 고정 예시다. */
function FilterScene() {
  return (
    <>
      <div className={styles.top}>
        <h1>파우치</h1>
        <Icon name="help-circle" size={24} />
        <Icon name="plus" size={24} />
        <Icon name="search" size={24} />
      </div>
      <div className={styles.acard}>
        <div className={styles.hd}>
          <span className={styles.ic}>
            <Icon name="flask-conical" size={20} filled />
          </span>
          <b>안 맞을 수 있는 성분</b>
          <span>필터 관리 ›</span>
        </div>
        <div className={styles.sub}>안 맞은 제품 2개 이상에 함께 든 성분</div>
        <div className={styles.chips}>
          {["폴리솔베이트20", "시트릭애씨드", "향료"].map((name, i) => (
            <span key={name} className={`${styles.chip} ${styles.on}`}>
              {name} <small>{i === 0 ? 3 : 2}개</small>
            </span>
          ))}
        </div>
        <div className={styles.btn} data-guide-id="open-filter">
          검색에서 제외할 성분 고르기
        </div>
      </div>
      <p className={styles.sec}>안 맞았어요 · 3</p>
      <div className={styles.exampleProducts}>
        {[
          { id: 46, brand: "바이오더마", name: "하이드라비오 토너" },
          { id: 831, brand: "이솝", name: "이매큘레이트 페이셜 토닉" },
          { id: 1353, brand: "에스티 로더", name: "리-뉴트리브 소프트닝 로션" },
        ].map((product) => (
          <div key={product.id} className={styles.prow}>
            <div className={styles.thumb}>
              <Image src={`/images/pouch-guide/${product.id}.webp`} alt="" width={64} height={64} draggable={false} />
              <span className={styles.badge}>
                <Icon name="thumb-down" size={16} />
              </span>
            </div>
            <div className={styles.tx}>
              <span className={styles.br}>{product.brand}</span>
              <span className={styles.nm}>{product.name}</span>
            </div>
          </div>
        ))}
      </div>
      <GuideNavigation active="shelf" />
      <div className={styles.filterPage}>
        <div className={styles.top}>
          <Icon name="chevron-left" size={24} />
          <span className={styles.c}>나만의 필터에 추가</span>
        </div>
        <div className={styles.filterHeading}>
          <h2>검색할 때 뺄 성분을 골라 주세요</h2>
          <p>
            안 맞았던 제품에 함께 든 성분이에요.
            <br />
            피하고 싶은 성분을 골라 나만의 필터에 넣어 보세요.
          </p>
        </div>
        <div className={styles.filterRows}>
          {["폴리솔베이트20", "시트릭애씨드", "향료"].map((name, i) => (
            <div key={name} className={styles.filterRow} data-guide-id={`filter-${i}`}>
              <span className={styles.checkBox}>
                <Icon name="check" size={16} />
              </span>
              <span>
                <b>{name}</b>
                <small>안 맞은 제품 {i === 0 ? 3 : 2}개에 들어 있어요</small>
              </span>
            </div>
          ))}
        </div>
        <div className={styles.filterFooter}>
          <div className={styles.btn} data-guide-id="add-filter">
            성분을 골라 주세요
          </div>
        </div>
      </div>
      <div className={styles.toast}>성분 3개를 나만의 필터에 넣었어요</div>
      <div className={styles.cursor} />
    </>
  );
}
