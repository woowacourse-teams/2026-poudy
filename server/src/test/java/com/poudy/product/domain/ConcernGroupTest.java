package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredientgroup.domain.IngredientGroup;
import com.poudy.ingredientgroup.domain.IngredientGroupCatalog;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConcernGroupTest {

    @Test
    void definesSevenConcernsAndNineConnectionsInPublicOrder() {
        ProductPart part = partOf(
            ingredient(
                1L,
                "HYDRATION_RELATED",
                "BARRIER_SUPPORT_RELATED",
                "SEBUM_CONTROL_RELATED",
                "ACNE_RELATED",
                "PIGMENTATION_RELATED",
                "BRIGHTENING_RELATED",
                "WRINKLE_RELATED",
                "EXFOLIATION_RELATED"
            )
        );
        assertThat(Concern.values()).extracting(Concern::displayName)
            .containsExactly("건조·당김", "번들거림", "여드름", "색소·잡티", "칙칙한 톤", "주름", "거친 피부결");
        List<ConcernEffect> effects = Arrays.stream(Concern.values())
            .flatMap(concern -> concern.effectsIn(part.ingredients()).stream())
            .toList();
        assertThat(effects).extracting(effect -> effect.effect().code())
            .containsExactly(
                "HYDRATION_RELATED",
                "BARRIER_SUPPORT_RELATED",
                "SEBUM_CONTROL_RELATED",
                "ACNE_RELATED",
                "PIGMENTATION_RELATED",
                "BRIGHTENING_RELATED",
                "WRINKLE_RELATED",
                "EXFOLIATION_RELATED",
                "HYDRATION_RELATED"
            );
        assertThat(part.concernGroups(IngredientGroupCatalog.empty())).extracting(ConcernGroup::concern)
            .containsExactly(Concern.DRYNESS, Concern.OILINESS, Concern.ACNE);
    }

    @Test
    void considersAllIngredientsAndEffectsBeforeSelectingTopThreeConcerns() {
        ProductPart part = partOf(
            ingredient(9L, "EXFOLIATION_RELATED"),
            ingredient(8L, "WRINKLE_RELATED"),
            ingredient(7L, "BRIGHTENING_RELATED"),
            ingredient(6L, "PIGMENTATION_RELATED"),
            ingredient(5L, "ACNE_RELATED"),
            ingredient(4L, "SEBUM_CONTROL_RELATED"),
            ingredient(3L, "BARRIER_SUPPORT_RELATED", "HYDRATION_RELATED"),
            ingredient(2L, "HYDRATION_RELATED")
        );

        assertThat(part.skinEffectGroups()).hasSize(3);
        List<ConcernGroup> result = part.concernGroups(IngredientGroupCatalog.empty());
        assertThat(result).extracting(ConcernGroup::concern)
            .containsExactly(Concern.UNEVEN_TEXTURE, Concern.DRYNESS, Concern.OILINESS);
        assertThat(result.getFirst().effects()).extracting(SkinEffect::code)
            .containsExactly("EXFOLIATION_RELATED", "HYDRATION_RELATED");
        assertThat(result.get(1).effects()).extracting(SkinEffect::code)
            .containsExactly("HYDRATION_RELATED", "BARRIER_SUPPORT_RELATED");
        assertThat(result.get(1).items()).flatExtracting(item -> item.ingredientIds())
            .containsExactly(3L, 2L);
        assertThat(result.getFirst().items()).flatExtracting(item -> item.ingredientIds())
            .containsExactly(9L, 3L, 2L);
    }

    @Test
    void ranksByUniqueIngredientIdsAcrossEffectsIncludingEveryGroupedMember() {
        Ingredient first = ingredient(1L, "HYDRATION_RELATED", "BARRIER_SUPPORT_RELATED");
        ProductPart part = partOf(
            first,
            ingredient(2L, "HYDRATION_RELATED", "BARRIER_SUPPORT_RELATED"),
            ingredient(3L, "BRIGHTENING_RELATED", "SEBUM_CONTROL_RELATED"),
            ingredient(4L, "BRIGHTENING_RELATED", "SEBUM_CONTROL_RELATED"),
            ingredient(5L, "BRIGHTENING_RELATED", "SEBUM_CONTROL_RELATED"),
            ingredient(6L, "BRIGHTENING_RELATED"),
            ingredient(7L, "ACNE_RELATED"),
            first
        );
        IngredientGroupCatalog catalog = new IngredientGroupCatalog(
            List.of(
                new IngredientGroup("HYDRATORS", "수분 성분군", List.of(1L, 2L)),
                new IngredientGroup("BRIGHTENERS", "미백 성분군", List.of(3L, 4L, 5L, 6L))
            )
        );

        List<ConcernGroup> result = part.concernGroups(catalog);
        assertThat(result).extracting(ConcernGroup::concern)
            .containsExactly(Concern.DULLNESS, Concern.OILINESS, Concern.DRYNESS);
        assertThat(result.getFirst().items()).singleElement()
            .satisfies(item -> assertThat(item.ingredientIds()).containsExactly(3L, 4L, 5L, 6L));
        assertThat(result.getLast().effects()).hasSize(2);
    }

    @Test
    void bundlesOnlyMatchingMembersAndPreservesFirstOccurrenceOrderWithoutDuplicates() {
        Ingredient first = ingredient(30L, "HYDRATION_RELATED", "HYDRATION_RELATED");
        ProductPart part = partOf(
            first,
            ingredient(10L, "HYDRATION_RELATED"),
            ingredient(20L, "HYDRATION_RELATED"),
            first,
            ingredient(40L, "BARRIER_SUPPORT_RELATED")
        );
        IngredientGroupCatalog groups = new IngredientGroupCatalog(
            List.of(
                new IngredientGroup("GROUP", "성분군", List.of(20L, 30L, 40L, 50L))
            )
        );

        ConcernGroup result = part.concernGroups(groups).getFirst();
        assertThat(result.items()).satisfiesExactly(
            item -> {
                assertThat(item.group().code()).isEqualTo("GROUP");
                assertThat(item.ingredientIds()).containsExactly(30L, 20L, 40L);
            },
            item -> {
                assertThat(item.group()).isNull();
                assertThat(item.ingredientIds()).containsExactly(10L);
            }
        );
        assertThat(result.effects()).extracting(SkinEffect::code)
            .containsExactly("HYDRATION_RELATED", "BARRIER_SUPPORT_RELATED");
        assertThat(part.ingredients().ids()).containsExactly(30L, 10L, 20L, 30L, 40L);
    }

    @Test
    void omitsMissingEffectsAndConcernsAndNeverUsesFormulationRoles() {
        Ingredient roleOnly = Ingredient.create(
            1L,
            "배합 목적만 있는 성분",
            null,
            null,
            null,
            null,
            List.of(new IngredientTag(new Tag("HYDRATION_RELATED", TagCategory.FUNCTION, "배합 목적"), List.of())),
            null
        );
        assertThat(
            partOf(roleOnly, ingredient(2L, "UNKNOWN_RELATED"))
                .concernGroups(IngredientGroupCatalog.empty())
        ).isEmpty();
        assertThat(partOf().concernGroups(IngredientGroupCatalog.empty())).isEmpty();

        List<ConcernGroup> result = partOf(ingredient(3L, "BARRIER_SUPPORT_RELATED"))
            .concernGroups(IngredientGroupCatalog.empty());
        assertThat(result).singleElement().satisfies(group -> {
            assertThat(group.concern()).isEqualTo(Concern.DRYNESS);
            assertThat(group.effects()).singleElement()
                .satisfies(effect -> assertThat(effect.code()).isEqualTo("BARRIER_SUPPORT_RELATED"));
        });
    }

    @Test
    void bundlesMembersFromDifferentEffectsOnceInFullIngredientOrder() {
        ProductPart part = partOf(
            ingredient(2L, "BARRIER_SUPPORT_RELATED"),
            ingredient(1L, "HYDRATION_RELATED", "BARRIER_SUPPORT_RELATED"),
            ingredient(3L, "HYDRATION_RELATED")
        );
        var catalog = new IngredientGroupCatalog(List.of(new IngredientGroup("GROUP", "성분군", List.of(1L, 2L))));

        ConcernGroup result = part.concernGroups(catalog).getFirst();
        assertThat(result.items()).satisfiesExactly(
            item -> {
                assertThat(item.group().code()).isEqualTo("GROUP");
                assertThat(item.ingredientIds()).containsExactly(2L, 1L);
            },
            item -> {
                assertThat(item.group()).isNull();
                assertThat(item.ingredientIds()).containsExactly(3L);
            }
        );
    }

    private static ProductPart partOf(Ingredient... ingredients) {
        return new ProductPart(1L, null, new Ingredients(List.of(ingredients)));
    }

    private static Ingredient ingredient(Long id, String... effects) {
        return Ingredient.create(
            id,
            "성분 " + id,
            null,
            null,
            null,
            null,
            Arrays.stream(effects).map(
                code -> new IngredientTag(
                    new Tag(code, TagCategory.BIOLOGICAL_EFFECT, "승인된 " + code),
                    List.of("근거")
                )
            ).toList(),
            null
        );
    }
}
