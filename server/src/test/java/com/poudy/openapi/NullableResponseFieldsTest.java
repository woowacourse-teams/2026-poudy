package com.poudy.openapi;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredientgroup.controller.dto.IngredientGroupMemberResponse;
import com.poudy.ingredientgroup.controller.dto.IngredientGroupResponse;
import com.poudy.product.controller.dto.IngredientGroupSummaryResponse;
import com.poudy.product.controller.dto.ProductDetailResponse;
import com.poudy.product.controller.dto.ProductPartResponse;
import com.poudy.product.controller.dto.ProductPartSummaryResponse;
import com.poudy.product.controller.dto.SkinEffectItemResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class NullableResponseFieldsTest {

    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void writesNullForMissingValuesAndKeepsPresentObjects() {
        assertThat(mapper.valueToTree(new SkinEffectItemResponse(null, List.of())).path("ingredientGroup").isNull())
            .isTrue();
        assertThat(
            mapper.valueToTree(
                new SkinEffectItemResponse(
                    new IngredientGroupSummaryResponse("CERAMIDES", "세라마이드"),
                    List.of()
                )
            )
                .path("ingredientGroup").path("code").asString()
        ).isEqualTo("CERAMIDES");

        assertThat(mapper.valueToTree(detail(null)).path("selectedPart").isNull()).isTrue();
        var part = mapper.valueToTree(detail(new ProductPartResponse(1L, null, List.of(), List.of(), List.of())))
            .path("selectedPart");
        assertThat(part.path("id").asLong()).isEqualTo(1L);
        assertThat(part.path("name").isNull()).isTrue();
        assertThat(mapper.valueToTree(new ProductPartSummaryResponse(1L, null, 0L)).path("name").isNull()).isTrue();
        assertThat(
            mapper.valueToTree(new IngredientGroupResponse("TEST", "성분군", null, "", List.of()))
                .path("englishName").isNull()
        ).isTrue();
        assertThat(
            mapper.valueToTree(new IngredientGroupMemberResponse(1L, "성분", null))
                .path("englishName").isNull()
        ).isTrue();
    }

    private ProductDetailResponse detail(ProductPartResponse part) {
        return new ProductDetailResponse(1L, "제품", null, List.of(), "", List.of(), 0, 0, List.of(), part, null);
    }
}
