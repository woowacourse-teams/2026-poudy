package com.poudy.product.domain;

import com.poudy.ingredient.domain.Ingredient;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.List;

@Entity
@Table(name = "product_component")
public class ProductComponent {

    @Id
    private Long id;

    @Column(name = "display_order")
    private Integer displayOrder;

    @ManyToMany
    @JoinTable(name = "product_ingredient", joinColumns = @JoinColumn(name = "component_id"), inverseJoinColumns = @JoinColumn(name = "ingredient_id"))
    @OrderColumn(name = "display_order")
    private List<Ingredient> ingredients;

    protected ProductComponent() {
    }

    public List<Ingredient> ingredients() {
        return ingredients;
    }
}
