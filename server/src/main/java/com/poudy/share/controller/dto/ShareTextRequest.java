package com.poudy.share.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ShareTextRequest(
        @NotBlank @Size(max = ShareTextRequest.MAX_LENGTH) @Schema(description = "공유받은 텍스트 원문. 가공하지 않고 그대로 보낸다", example = "[튜브타입/단독기획] 닥터지 레드 블레미쉬 클리어 수딩크림 EX 70ml 튜브 기획 (+30ml+세럼10ml*2ea) 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/WUJMmVgJuA6yGc") String text) {

    // 상한이 없으면 서버 앞단이 414 로 끊어 400 계약이 지켜지지 않는다.
    public static final int MAX_LENGTH = 1000;
}
