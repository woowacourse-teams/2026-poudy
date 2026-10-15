import { useState } from "react";

import { BottomActionBar } from "../src/bottom-action-bar";
import { BottomNavigation } from "../src/bottom-navigation";
import type { BottomNavigationTab } from "../src/bottom-navigation";
import { Icon, ICON_NAMES, ICON_SIZES, IconSprite } from "../src/icon";
import { ImageAttachment } from "../src/image-attachment";
import type { AttachedImage } from "../src/image-attachment";
import { TopBar } from "../src/top-bar";
import { Section } from "./section";

const PHOTO = "/images/products/roundlab-1025-toner.png";
const noop = () => undefined;

/** 화면 폭 견본. 미리보기 본문의 거터를 빼고 화면 끝까지 그린다. */
function Frame({ children }: { readonly children: React.ReactNode }) {
  return <div className="-mx-(--gutter) border-y border-dashed border-border-strong">{children}</div>;
}

function AttachmentSample() {
  const [images, setImages] = useState<readonly AttachedImage[]>([
    { key: "a", src: PHOTO, status: "uploaded" },
    { key: "b", src: PHOTO, status: "uploading" },
    { key: "c", src: PHOTO, status: "failed" },
  ]);
  const failed = images.filter((image) => image.status === "failed").length;
  const uploading = images.filter((image) => image.status === "uploading").length;
  const drop = (key: string) => setImages((current) => current.filter((image) => image.key !== key));

  return (
    <ImageAttachment
      label="사진"
      optional
      images={images}
      max={5}
      accept="image/jpeg,image/png,image/heic,image/heif"
      onSelect={(files) =>
        setImages((current) => [
          ...current,
          ...files.map((file) => ({
            key: `${file.name}-${Date.now()}`,
            src: URL.createObjectURL(file),
            status: "uploading" as const,
          })),
        ])
      }
      onRemove={drop}
      onCancel={drop}
      onRetry={(key) =>
        setImages((current) => current.map((image) => (image.key === key ? { ...image, status: "uploaded" } : image)))
      }
      onOpen={noop}
      status={`${images.length} / 5장 · ${uploading > 0 ? `${uploading}장 올리는 중 · ` : ""}장당 5MB 이하 · JPG, PNG, HEIC`}
      error={failed > 0 ? `${failed}장을 올리지 못했어요. 사진을 눌러 다시 시도해 주세요.` : undefined}
    />
  );
}

export function LayoutSamples() {
  const [tab, setTab] = useState<BottomNavigationTab>("home");

  return (
    <>
      <IconSprite />

      <Section title="Icon · 크기 단계 (12 · 14 · 16 · 20 · 24 · 28 · 40)">
        <div className="flex items-end gap-3 text-text-primary">
          {ICON_SIZES.map((size) => (
            <Icon key={size} name="search" size={size} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-text-secondary">
          {ICON_NAMES.map((name) => (
            <Icon key={name} name={name} size={24} />
          ))}
        </div>
        {/* scalable: 브라우저 글자 크기를 키우면 꺾쇠가 옆 글자와 함께 커진다. */}
        <div className="flex items-center gap-1 text-body text-text-primary">
          전성분 보기
          <Icon name="chevron-right" size={16} scalable />
        </div>
        <div className="flex gap-3 text-brand-strong">
          {(["home", "grid", "search", "archive", "user", "bookmark", "bookmarks"] as const).map((name) => (
            <Icon key={name} name={name} size={24} filled />
          ))}
        </div>
      </Section>

      <Section title="TopBar · sub (하위 화면)">
        <Frame>
          <TopBar variant="sub" title="탐색 조건 설정" back={{ onClick: noop }} />
        </Frame>
        <Frame>
          <TopBar
            variant="sub"
            title="탐색 조건 설정"
            back={{ onClick: noop }}
            action={{ text: "초기화", onClick: noop }}
          />
        </Frame>
        <Frame>
          <TopBar
            variant="sub"
            title="성분 설명"
            back={{ asChild: <a href="#home" />, label: "홈으로" }}
            action={{ icon: "share", label: "나이아신아마이드 공유", onClick: noop }}
          />
        </Frame>
      </Section>

      <Section title="TopBar · explore (탐색 앱바 56)">
        <Frame>
          <TopBar variant="explore" align="start" title="스킨케어" back={{ onClick: noop }} />
        </Frame>
        <Frame>
          <TopBar variant="explore" align="center" title="라운드랩" back={{ onClick: noop }} />
        </Frame>
      </Section>

      <Section title="TopBar · large (탭 첫 화면)">
        <Frame>
          <TopBar
            variant="large"
            title="선반"
            actions={[
              { icon: "help-circle", label: "선반 설명 보기", onClick: noop, haspopup: "dialog" },
              { icon: "plus", label: "제품 추가", onClick: noop },
            ]}
          />
        </Frame>
        <Frame>
          <TopBar variant="large" title="카테고리" />
        </Frame>
      </Section>

      <Section title="BottomActionBar">
        <Frame>
          <BottomActionBar position="above-nav" action={{ label: "472개 제품 보기", onClick: noop }} />
        </Frame>
        <Frame>
          <BottomActionBar
            position="screen-end"
            notice="문의 내용을 입력하면 접수할 수 있어요"
            action={{ label: "문의 접수하기", disabled: true, onClick: noop }}
          />
        </Frame>
        <Frame>
          <BottomActionBar position="screen-end" action={{ label: "탈퇴하기", tone: "destructive", onClick: noop }} />
        </Frame>
      </Section>

      <Section title="BottomNavigation (5칸)">
        <Frame>
          <BottomNavigation
            current={tab}
            hrefs={{ home: "#home", category: "#category", explore: "#explore", shelf: "#shelf", my: "#my" }}
            onSelect={setTab}
          />
        </Frame>
      </Section>

      <Section title="ImageAttachment · 문의하기(S40)">
        <AttachmentSample />
      </Section>

      <Section title="ImageAttachment · 전성분 사진(S53h)">
        <ImageAttachment
          label="전성분 사진"
          optional
          images={[]}
          max={1}
          accept="image/jpeg,image/png,image/heic,image/heif"
          onSelect={noop}
          onRemove={noop}
          onCancel={noop}
          onRetry={noop}
          aside={
            <>
              뒷면 전성분이 보이게 찍어 주시면
              <br />더 빨리 등록할 수 있어요
            </>
          }
        />
      </Section>
    </>
  );
}
