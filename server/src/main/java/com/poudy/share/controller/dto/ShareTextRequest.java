package com.poudy.share.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShareTextRequest(
        @NotBlank @Size(max = ShareTextRequest.MAX_LENGTH) @Schema(example = "[튜브타입/단독기획] 닥터지 레드 블레미쉬 클리어 수딩크림 EX 70ml 튜브 기획 (+30ml+세럼10ml*2ea) 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/WUJMmVgJuA6yGc") String text) {

    // 한글은 URL 인코딩에서 한 글자가 9 바이트다. 요청 줄이 컨테이너 한도 8KB 를 넘으면
    // @Size 가 걸리기 전에 끊겨 ProblemDetail 이 아니라 HTML 이 나간다.
    public static final int MAX_LENGTH = 500;
}
