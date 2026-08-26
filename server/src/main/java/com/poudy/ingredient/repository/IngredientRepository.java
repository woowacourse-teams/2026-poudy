package com.poudy.ingredient.repository;

import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.DeferredTagEvidenceException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.Tags;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JacksonModule;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.module.SimpleModule;

@Repository
public class IngredientRepository {

    private static final String INGREDIENTS_FILE_NAME = "ingredients.json";
    private static final String ID_FIELD = "id";
    private static final String KOREAN_NAME_FIELD = "korean_name";
    private static final String ENGLISH_NAME_FIELD = "english_name";
    private static final String ORIGIN_DEFINITION_FIELD = "origin_definition";
    private static final String DESCRIPTION_FIELD = "description";
    private static final String DESCRIPTION_EVIDENCE_FIELD = "description_evidence";
    private static final String ALIASES_FIELD = "aliases";
    private static final String TAG_MAPPINGS_FIELD = "tag_mappings";
    private static final String TAG_ID_FIELD = "tag_id";
    private static final String SOURCE_FIELD = "source";
    private static final String CREATED_AT_FIELD = "created_at";
    private static final String UPDATED_AT_FIELD = "updated_at";

    private final Ingredients ingredients;

    public IngredientRepository(JsonDataReader jsonDataReader, Tags tags) {
        List<Ingredient> values = jsonDataReader.readList(INGREDIENTS_FILE_NAME, Ingredient.class, resolvedWith(tags));
        validateUniqueIds(values);
        validateDetailFields(values);
        this.ingredients = new Ingredients(values);
    }

    private static JacksonModule resolvedWith(Tags tags) {
        SimpleModule resolution = new SimpleModule("성분 태그 참조 해석");
        resolution.addDeserializer(Ingredient.class, new ValueDeserializer<Ingredient>() {

            @Override
            public Ingredient deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
                JsonNode ingredient = context.readTree(parser);
                Long ingredientId = longOf(ingredient, ID_FIELD, context);

                try {
                    return new Ingredient(
                            ingredientId,
                            nullableTextOf(ingredient, KOREAN_NAME_FIELD, context),
                            nullableTextOf(ingredient, ENGLISH_NAME_FIELD, context),
                            nullableTextOf(ingredient, ORIGIN_DEFINITION_FIELD, context),
                            nullableTextOf(ingredient, DESCRIPTION_FIELD, context),
                            nullableTextOf(ingredient, DESCRIPTION_EVIDENCE_FIELD, context),
                            aliasesOf(ingredient, context),
                            tagMappingsOf(ingredient, ingredientId, tags, context),
                            dateTimeOf(ingredient, CREATED_AT_FIELD, context),
                            dateTimeOf(ingredient, UPDATED_AT_FIELD, context));
                } catch (DeferredTagEvidenceException exception) {
                    throw new InfrastructureException(
                            "성분의 태그 근거를 해석하지 못했습니다. ingredient_id=%d".formatted(ingredientId),
                            exception);
                }
            }
        });

        return resolution;
    }

    private static List<String> aliasesOf(JsonNode ingredient, DeserializationContext context)
            throws JacksonException {
        JsonNode aliases = ingredient.get(ALIASES_FIELD);
        if (aliases == null || aliases.isNull()) {
            return List.of();
        }
        if (!aliases.isArray()) {
            return context.reportInputMismatch(Ingredient.class, "성분의 aliases 필드는 배열이어야 합니다.");
        }

        List<String> values = new ArrayList<>();
        for (JsonNode alias : aliases) {
            if (!alias.isTextual()) {
                return context.reportInputMismatch(Ingredient.class, "성분의 aliases 항목은 문자열이어야 합니다.");
            }
            values.add(alias.asText());
        }
        return values;
    }

    private static List<IngredientTag> tagMappingsOf(
            JsonNode ingredient,
            Long ingredientId,
            Tags tags,
            DeserializationContext context)
            throws JacksonException {
        JsonNode mappings = ingredient.get(TAG_MAPPINGS_FIELD);
        if (mappings == null || mappings.isNull()) {
            return List.of();
        }
        if (!mappings.isArray()) {
            return context.reportInputMismatch(Ingredient.class, "성분의 tag_mappings 필드는 배열이어야 합니다.");
        }

        List<IngredientTag> values = new ArrayList<>();
        for (JsonNode mapping : mappings) {
            Long tagId = longOf(mapping, TAG_ID_FIELD, context);
            Tag tag = tags.findById(tagId).orElseThrow(
                    () -> new InfrastructureException(
                            "성분이 존재하지 않는 태그 ID를 참조합니다. ingredient_id=%d, tag_id=%s"
                                    .formatted(ingredientId, tagId)));
            values.add(new IngredientTag(tag, nullableTextOf(mapping, SOURCE_FIELD, context)));
        }
        return values;
    }

    private static Long longOf(JsonNode value, String field, DeserializationContext context) throws JacksonException {
        JsonNode number = value.get(field);
        if (number == null || !number.isIntegralNumber()) {
            return context.reportInputMismatch(Ingredient.class, "성분의 \"%s\" 필드는 정수여야 합니다.", field);
        }
        return number.asLong();
    }

    private static String nullableTextOf(JsonNode value, String field, DeserializationContext context)
            throws JacksonException {
        JsonNode text = value.get(field);
        if (text == null || text.isNull()) {
            return null;
        }
        if (!text.isTextual()) {
            return context.reportInputMismatch(Ingredient.class, "성분의 \"%s\" 필드는 문자열 또는 null이어야 합니다.", field);
        }
        return text.asText();
    }

    private static OffsetDateTime dateTimeOf(JsonNode value, String field, DeserializationContext context)
            throws JacksonException {
        String dateTime = nullableTextOf(value, field, context);
        if (dateTime == null) {
            return null;
        }
        try {
            return OffsetDateTime.parse(dateTime);
        } catch (DateTimeParseException exception) {
            return context.reportInputMismatch(Ingredient.class, "성분의 \"%s\" 필드는 날짜와 시간이어야 합니다.", field);
        }
    }

    public Ingredients findAll() {
        return ingredients;
    }

    public List<Ingredient> search(String keyword) {
        return ingredients.search(keyword);
    }

    public Optional<Ingredient> findById(Long id) {
        return ingredients.findById(id);
    }

    private static void validateDetailFields(List<Ingredient> values) {
        List<Long> invalidIds = values.stream()
                .filter(ingredient -> ingredient.description() == null || ingredient.updatedAt() == null)
                .map(Ingredient::id)
                .toList();
        if (!invalidIds.isEmpty()) {
            throw new InfrastructureException(
                    "성분 상세 필수값(description, updated_at)이 누락되었습니다: %s".formatted(invalidIds));
        }
    }

    private static void validateUniqueIds(List<Ingredient> values) {
        List<Long> duplicateIds = values.stream()
                .collect(Collectors.groupingBy(Ingredient::id, Collectors.counting()))
                .entrySet().stream()
                .filter(entry -> entry.getValue() > 1)
                .map(Map.Entry::getKey)
                .sorted()
                .toList();
        if (!duplicateIds.isEmpty()) {
            throw new InfrastructureException("성분 ID가 중복되었습니다: %s".formatted(duplicateIds));
        }
    }
}
