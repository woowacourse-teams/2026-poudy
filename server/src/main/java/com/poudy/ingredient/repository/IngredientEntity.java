package com.poudy.ingredient.repository;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientTag;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.List;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "ingredient")
public class IngredientEntity {

    @Id
    private Long id;

    @Column(name = "korean_name")
    private String koreanName;

    @Column(name = "english_name")
    private String englishName;

    @Column(name = "description")
    private String description;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    protected IngredientEntity() {
    }

    public Long id() {
        return id;
    }

    public Ingredient toDomain(List<String> aliases, List<IngredientTag> tags, String descriptionEvidence) {
        return new Ingredient(
            id,
            koreanName,
            englishName,
            null,
            description,
            descriptionEvidence,
            aliases,
            tags,
            null,
            updatedAt
        );
    }
}
