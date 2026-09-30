package com.poudy.openapi;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredientgroup.controller.dto.IngredientGroupMemberResponse;
import com.poudy.ingredientgroup.controller.dto.IngredientGroupResponse;
import com.poudy.product.controller.dto.IngredientGroupSummaryResponse;
import com.poudy.product.controller.dto.ProductDetailResponse;
import com.poudy.product.controller.dto.ProductPartResponse;
import com.poudy.product.controller.dto.ProductPartSummaryResponse;
import com.poudy.product.controller.dto.SkinEffectItemResponse;
import com.poudy.searchkeyword.controller.dto.RankingChangeItem;
import com.poudy.searchkeyword.controller.dto.RankingItem;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class OptionalResponseFieldsTest {

    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void omitsMissingObjectsButKeepsPresentObjects() {
        assertThat(mapper.valueToTree(new RankingItem(1, "토너", null)).has("change")).isFalse();
        assertThat(
            mapper.valueToTree(new RankingItem(1, "토너", new RankingChangeItem("UP", 1)))
                .path("change").path("steps").asInt()
        ).isEqualTo(1);

        assertThat(mapper.valueToTree(new SkinEffectItemResponse(null, List.of())).has("ingredientGroup")).isFalse();
        assertThat(
            mapper.valueToTree(
                new SkinEffectItemResponse(
                    new IngredientGroupSummaryResponse("CERAMIDES", "세라마이드"),
                    List.of()
                )
            )
                .path("ingredientGroup").path("code").asString()
        ).isEqualTo("CERAMIDES");

        assertThat(mapper.valueToTree(detail(null)).has("selectedPart")).isFalse();
        var part = mapper.valueToTree(detail(new ProductPartResponse(1L, null, List.of(), List.of(), List.of())))
            .path("selectedPart");
        assertThat(part.path("id").asLong()).isEqualTo(1L);
        assertThat(part.has("name")).isFalse();
        assertThat(mapper.valueToTree(new ProductPartSummaryResponse(1L, null, 0L)).has("name")).isFalse();
        assertThat(
            mapper.valueToTree(new IngredientGroupResponse("TEST", "성분군", null, "", List.of()))
                .has("englishName")
        ).isFalse();
        assertThat(
            mapper.valueToTree(new IngredientGroupMemberResponse(1L, "성분", null))
                .has("englishName")
        ).isFalse();
    }

    private ProductDetailResponse detail(ProductPartResponse part) {
        return new ProductDetailResponse(1L, "제품", null, List.of(), "", List.of(), 0, 0, List.of(), part, null);
    }
}
