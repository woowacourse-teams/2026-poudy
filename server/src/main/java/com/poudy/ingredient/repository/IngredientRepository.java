package com.poudy.ingredient.repository;

import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;

@Repository
public class IngredientRepository {

    private static final String INGREDIENTS_FILE_NAME = "ingredients.json";

    private final Ingredients ingredients;

    public IngredientRepository(JsonDataReader jsonDataReader) {
        List<Ingredient> values = jsonDataReader.readList(INGREDIENTS_FILE_NAME, Ingredient.class);
        validateUniqueIds(values);
        validateDetailFields(values);
        this.ingredients = new Ingredients(values);
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

    public List<Ingredient> findByIds(List<Long> ids) {
        return ingredients.findAllById(ids).values();
    }

    public List<Ingredient> findByIds(List<Long> ids, String keyword) {
        if (keyword == null) {
            return findByIds(ids);
        }
        return ingredients.findAllById(ids).search(keyword);
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
