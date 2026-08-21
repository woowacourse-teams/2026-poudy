import type { Metadata } from "next";
import Link from "next/link";

import { LegalArticle, LegalDocument, LegalList } from "@/components/legal/LegalDocument";
import { OPERATOR } from "@/components/legal/operator";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { TopBar } from "@/components/ui/TopBar";

/*
 * 무료로 정보를 보여 주기만 하는 서비스라 결제·청약철회 조항은 두지 않는다.
 * 실질은 제5조다. 성분 정보를 근거로 판단했다가 생긴 일까지 팀이 떠안지 않도록
 * 자료의 출처와 한계를 밝히는 자리다. 법률 검토를 받은 문서는 아니다.
 */

export const metadata: Metadata = {
  title: "이용약관",
  description: "Poudy 를 이용할 때 적용되는 약관입니다.",
};

export default function TermsPage() {
  return (
    <>
      <TopBar title="이용약관" variant="sub" />

      <LegalDocument
        title={`${OPERATOR.serviceName} 이용약관`}
        effectiveDate={OPERATOR.effectiveDate}
        lastRevisedDate={OPERATOR.lastRevisedDate}
      >
        <LegalArticle heading="제1조 목적">
          <p>
            이 약관은 {OPERATOR.name}(이하 &quot;팀&quot;)이 제공하는 {OPERATOR.serviceName}(이하 &quot;서비스&quot;)의
            이용 조건과 절차, 팀과 이용자의 권리·의무를 정하는 것을 목적으로 합니다.
          </p>
        </LegalArticle>

        <LegalArticle heading="제2조 용어의 정의">
          <LegalList>
            <li>이용자 — 이 약관에 따라 서비스를 이용하는 사람을 말합니다.</li>
            <li>서비스 — 팀이 웹과 모바일 앱으로 제공하는 화장품 제품·성분 정보 조회, 검색, 필터 기능을 말합니다.</li>
            <li>
              성분 정보 — 화장품 제조사와 판매처가 표기한 전성분과 공개된 자료를 팀이 모아 정리한 내용을 말합니다.
            </li>
          </LegalList>
        </LegalArticle>

        <LegalArticle heading="제3조 약관의 효력과 변경">
          <p>
            이 약관은 서비스 화면에 게시함으로써 효력이 생깁니다. 팀은 관련 법령을 어기지 않는 범위에서 약관을 바꿀 수
            있으며, 바뀐 약관은 시행일 7일 전부터 이 화면에 공지합니다. 이용자에게 불리한 변경은 30일 전부터 공지합니다.
            공지 후에도 서비스를 계속 이용하면 바뀐 약관에 동의한 것으로 봅니다.
          </p>
        </LegalArticle>

        <LegalArticle heading="제4조 서비스의 내용과 이용">
          <p>
            서비스는 회원가입 없이 무료로 제공되며, 이용자는 별도의 절차 없이 이용할 수 있습니다. 팀은 서비스의 내용과
            구성을 운영상·기술상 필요에 따라 바꿀 수 있습니다.
          </p>
        </LegalArticle>

        <LegalArticle heading="제5조 정보의 성격과 한계">
          <p>
            서비스가 보여 주는 성분 정보는 제조사와 판매처의 표기, 공개 자료를 정리한 참고 자료입니다. 팀은 자료를 최신
            상태로 유지하려고 노력하지만 다음을 보장하지 않습니다.
          </p>
          <LegalList>
            <li>제조사가 제품 성분을 바꾼 뒤 서비스의 표기가 즉시 따라가는 것</li>
            <li>표기와 실제 제품의 완전한 일치</li>
            <li>특정 성분이 모든 사람에게 안전하거나 위험하다는 판단</li>
          </LegalList>
          <p>
            서비스의 성분 분류와 필터는 의학적·약학적 조언이 아니며 질병의 진단, 치료, 예방에 쓸 수 없습니다. 피부
            이상이나 알레르기가 걱정된다면 반드시 전문의와 상담하시고, 제품 구매와 사용 여부는 실제 제품에 표기된
            전성분을 확인한 뒤 이용자가 스스로 판단하시기 바랍니다.
          </p>
        </LegalArticle>

        <LegalArticle heading="제6조 이용자의 의무">
          <p>이용자는 서비스를 이용하면서 다음 행위를 해서는 안 됩니다.</p>
          <LegalList>
            <li>자동화된 수단으로 서비스의 자료를 대량으로 수집하거나 복제하는 행위</li>
            <li>서비스의 정상적인 운영을 방해할 정도로 반복해서 요청을 보내는 행위</li>
            <li>서비스의 자료를 팀의 동의 없이 영리 목적으로 재배포하거나 판매하는 행위</li>
            <li>다른 이용자나 제3자의 권리를 침해하거나 법령을 어기는 행위</li>
          </LegalList>
        </LegalArticle>

        <LegalArticle heading="제7조 지식재산권">
          <p>
            서비스의 화면 구성, 디자인, 편집물에 대한 권리는 팀에 있습니다. 제조사와 판매처가 표기한 성분 자료의 권리는
            해당 권리자에게 있습니다. 이용자는 팀의 동의 없이 이를 영리 목적으로 이용할 수 없습니다.
          </p>
        </LegalArticle>

        <LegalArticle heading="제8조 서비스의 중단">
          <p>
            팀은 설비 점검, 교체, 고장이나 통신 두절 등 부득이한 사유가 있으면 서비스 제공을 일시적으로 멈출 수
            있습니다. 미리 알릴 수 있는 경우에는 서비스 화면에 공지하고, 예상하지 못한 사유로 멈춘 경우에는 사유를 안
            뒤에 알립니다.
          </p>
        </LegalArticle>

        <LegalArticle heading="제9조 책임의 제한">
          <p>
            팀은 천재지변이나 이에 준하는 불가항력, 이용자의 고의나 과실로 생긴 손해에 대해 책임지지 않습니다. 서비스가
            무료로 제공되는 점을 고려하여, 팀은 관련 법령이 허용하는 범위에서 서비스 이용으로 생긴 손해에 대한 책임을
            지지 않습니다. 다만 팀의 고의나 중대한 과실로 생긴 손해는 그러하지 않습니다.
          </p>
        </LegalArticle>

        <LegalArticle heading="제10조 개인정보의 보호">
          <p>
            팀은 관련 법령에 따라 이용자의 개인정보를 보호합니다. 자세한 내용은{" "}
            <Link href="/privacy">개인정보 처리방침</Link>에서 확인하실 수 있습니다.
          </p>
        </LegalArticle>

        <LegalArticle heading="제11조 준거법과 분쟁 해결">
          <p>
            이 약관과 서비스 이용에는 대한민국 법을 적용합니다. 서비스 이용과 관련해 분쟁이 생기면 팀과 이용자는 원만한
            해결을 위해 성실히 협의하며, 협의가 되지 않으면 민사소송법에 따른 관할 법원에 소를 제기할 수 있습니다.
          </p>
        </LegalArticle>

        <LegalArticle heading="문의">
          <LegalList>
            <li>이메일 — {OPERATOR.officer.email}</li>
          </LegalList>
        </LegalArticle>

        <LegalArticle heading="부칙">
          <LegalList>
            <li>{OPERATOR.effectiveDate} — 제정</li>
          </LegalList>
        </LegalArticle>
      </LegalDocument>

      <BottomNavigation />
    </>
  );
}
