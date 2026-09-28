package com.poudy.ingredientgroup.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.ingredientgroup.domain.IngredientGroupDetail;
import com.poudy.ingredientgroup.repository.IngredientGroupRepository;
import org.springframework.stereotype.Service;

@Service
public class IngredientGroupService {

    private final IngredientGroupRepository ingredientGroupRepository;

    public IngredientGroupService(IngredientGroupRepository ingredientGroupRepository) {
        this.ingredientGroupRepository = ingredientGroupRepository;
    }

    public IngredientGroupDetail findDetail(String code) {
        return ingredientGroupRepository.findDetail(code)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.INGREDIENT_GROUP_NOT_FOUND));
    }
}
