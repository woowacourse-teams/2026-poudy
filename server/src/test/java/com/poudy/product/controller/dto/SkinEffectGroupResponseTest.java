package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.domain.SkinEffectGroup;
import com.poudy.tag.domain.SkinEffect;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("피부 작용 그룹 응답")
class SkinEffectGroupResponseTest {

    @Test
    @DisplayName("피부 작용의 ID, 코드, 이름과 성분 ID 를 응답으로 변환한다")
    void convertsSkinEffectGroups() {
        SkinEffect hydration = new SkinEffect(57L, "HYDRATION_RELATED", "피부 수분 관련");
        SkinEffectGroup group = new SkinEffectGroup(hydration, List.of(1012L, 3500L));

        List<SkinEffectGroupResponse> responses = SkinEffectGroupResponse.from(List.of(group));

        assertThat(responses)
                .containsExactly(
                        new SkinEffectGroupResponse(57L, "HYDRATION_RELATED", "피부 수분 관련", List.of(1012L, 3500L)));
    }
}
