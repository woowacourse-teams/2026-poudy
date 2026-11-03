package com.poudy.routine.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import com.poudy.routine.domain.Routine;
import com.poudy.routine.domain.RoutineMemo;
import com.poudy.routine.domain.RoutineName;
import com.poudy.routine.domain.RoutineProducts;
import com.poudy.routine.domain.RoutineView;
import com.poudy.routine.repository.RoutineRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoutineService {

    private final RoutineRepository routineRepository;
    private final ProductRepository productRepository;

    public RoutineService(RoutineRepository routineRepository, ProductRepository productRepository) {
        this.routineRepository = routineRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public RoutineView create(
        long userId,
        RoutineName name,
        RoutineMemo memo,
        boolean isPublic,
        RoutineProducts products
    ) {
        Products catalog = Products.from(productRepository.findAllById(products.productIds()));
        if (!catalog.containsAll(products.productIds())) {
            throw new InvalidRequestException(ErrorCode.INVALID_REQUEST_BODY);
        }
        long routineId = routineRepository.save(userId, name, memo, isPublic, products);
        return new Routine(routineId, name, memo, isPublic, products).resolve(catalog);
    }

    public List<RoutineView> findMine(long userId) {
        List<Routine> routines = routineRepository.findAllByUserId(userId);
        List<Long> productIds = routines.stream()
            .flatMap(routine -> routine.productIds().stream())
            .distinct()
            .toList();
        Products catalog = Products.from(productRepository.findAllById(productIds));
        return routines.stream().map(routine -> routine.resolve(catalog)).toList();
    }

    public RoutineView findMine(long userId, long routineId) {
        Routine routine = routineRepository.findByIdAndUserId(routineId, userId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ROUTINE_NOT_FOUND));
        return routine.resolve(Products.from(productRepository.findAllById(routine.productIds())));
    }

    @Transactional
    public RoutineView update(long userId, long routineId, RoutineName name, RoutineMemo memo, boolean isPublic) {
        if (!routineRepository.update(routineId, userId, name, memo, isPublic)) {
            throw new ResourceNotFoundException(ErrorCode.ROUTINE_NOT_FOUND);
        }
        return findMine(userId, routineId);
    }

    @Transactional
    public void delete(long userId, long routineId) {
        if (!routineRepository.delete(routineId, userId)) {
            throw new ResourceNotFoundException(ErrorCode.ROUTINE_NOT_FOUND);
        }
    }
}
