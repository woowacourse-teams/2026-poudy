package com.poudy.ingredient.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.DeferredTagEvidenceException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.MatchedIngredient;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.Tags;
import com.poudy.tag.repository.TagRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class IngredientRepository {

    private final IngredientCatalog ingredients;

    public IngredientRepository(
        IngredientJpaRepository ingredientJpaRepository,
        TagRepository tagRepository,
        SnapshotReader snapshotReader
    ) {
        this.ingredients = snapshotReader.read(() -> load(ingredientJpaRepository, tagRepository));
    }

    private static IngredientCatalog load(
        IngredientJpaRepository ingredientJpaRepository,
        TagRepository tagRepository
    ) {
        Tags tags = tagRepository.findAll();
        Map<Long, List<String>> aliases = ingredientJpaRepository.findAllAliases().stream()
            .collect(groupingBy(IngredientAliasEntity::ingredientId, mapping(IngredientAliasEntity::alias, toList())));
        List<IngredientSourceEntity> allSources = ingredientJpaRepository.findAllSources();
        Map<Long, List<String>> effectSources = allSources.stream()
            .filter(IngredientSourceEntity::isEffect)
            .collect(
                groupingBy(
                    IngredientSourceEntity::ingredientId,
                    mapping(IngredientSourceEntity::content, toList())
                )
            );
        Map<Long, List<IngredientTag>> tagMappings = ingredientJpaRepository.findAllTags().stream()
            .map(IngredientTagEntity::id)
            .collect(
                groupingBy(
                    IngredientTagId::ingredientId,
                    mapping(id -> ingredientTagOf(id, tags, effectSources.get(id.ingredientId())), toList())
                )
            );
        Map<Long, List<String>> sources = allSources.stream()
            .filter(IngredientSourceEntity::isInfo)
            .collect(
                groupingBy(
                    IngredientSourceEntity::ingredientId,
                    mapping(IngredientSourceEntity::content, toList())
                )
            );
        List<Ingredient> values = ingredientJpaRepository.findAllIngredients().stream()
            .map(
                ingredient -> ingredient.toDomain(
                    aliases.getOrDefault(ingredient.id(), List.of()),
                    tagMappings.getOrDefault(ingredient.id(), List.of()),
                    sources.getOrDefault(ingredient.id(), List.of())
                )
            )
            .toList();
        try {
            return IngredientCatalog.from(values);
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException(exception.getMessage(), exception);
        }
    }

    private static IngredientTag ingredientTagOf(IngredientTagId id, Tags tags, List<String> evidence) {
        Tag tag = tags.findById(id.tagCode()).orElseThrow(
            () -> new InfrastructureException(
                "성분이 존재하지 않는 태그 코드를 참조합니다. ingredient_id=%d, tag_code=%s"
                    .formatted(id.ingredientId(), id.tagCode())
            )
        );
        try {
            return new IngredientTag(tag, evidence);
        } catch (DeferredTagEvidenceException exception) {
            throw new InfrastructureException(
                "성분의 태그 근거를 해석하지 못했습니다. ingredient_id=%d".formatted(id.ingredientId()),
                exception
            );
        }
    }

    public IngredientCatalog findAll() {
        return ingredients;
    }

    public List<MatchedIngredient> suggest(String keyword) {
        return ingredients.suggest(keyword);
    }

    public Optional<Ingredient> findById(Long id) {
        return ingredients.findById(id);
    }
}
