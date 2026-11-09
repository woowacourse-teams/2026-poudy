package com.poudy.common.discord;

import org.springframework.util.StringUtils;

/**
 * 문의 알림 끝에 붙이는 확인 안내.
 *
 * <p>Discord 에는 이용자가 쓴 내용을 보내지 않는다. 국외로 넘어가는 사본을 만들지 않고,
 * 문의 보유 기간 정리 작업이 지울 수 없는 사본을 남기지 않기 위해서다. 내용은 관리자 화면에서 본다.
 */
public final class AdminInquiryNotice {

    private static final String GUIDE = "내용은 관리자 화면에서 확인하세요.";

    private AdminInquiryNotice() {
    }

    public static String of(String adminUrl) {
        if (!StringUtils.hasText(adminUrl)) {
            return GUIDE;
        }
        return GUIDE + "\n" + adminUrl.trim();
    }
}
