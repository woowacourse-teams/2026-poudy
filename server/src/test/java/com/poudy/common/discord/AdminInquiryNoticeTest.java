package com.poudy.common.discord;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("관리자 화면 확인 안내")
class AdminInquiryNoticeTest {

    @Test
    @DisplayName("관리자 화면 주소가 있으면 안내 문구 아래에 주소를 붙인다")
    void appendsAdminUrl() {
        assertThat(AdminInquiryNotice.of(" https://poudy.example/admin "))
            .isEqualTo("내용은 관리자 화면에서 확인하세요.\nhttps://poudy.example/admin");
    }

    @Test
    @DisplayName("관리자 화면 주소가 없으면 안내 문구만 보낸다")
    void guidesWithoutUrl() {
        assertThat(AdminInquiryNotice.of("")).isEqualTo("내용은 관리자 화면에서 확인하세요.");
        assertThat(AdminInquiryNotice.of(null)).isEqualTo("내용은 관리자 화면에서 확인하세요.");
    }
}
