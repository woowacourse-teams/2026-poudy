package com.poudy.routine.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.repository.S3ImageRepository;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import com.poudy.routine.domain.Routine;
import com.poudy.routine.domain.RoutineMemo;
import com.poudy.routine.domain.RoutineName;
import com.poudy.routine.domain.RoutineProducts;
import com.poudy.routine.domain.RoutineView;
import com.poudy.routine.domain.SharedRoutine;
import com.poudy.routine.domain.SharedRoutinePage;
import com.poudy.routine.domain.SharedRoutineView;
import com.poudy.routine.domain.SharedRoutineViewPage;
import com.poudy.routine.repository.RoutineRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoutineService {

    private final RoutineRepository routineRepository;
    private final ProductRepository productRepository;
    private final S3ImageRepository imageRepository;

    public RoutineService(
        RoutineRepository routineRepository,
        ProductRepository productRepository,
        S3ImageRepository imageRepository
    ) {
        this.routineRepository = routineRepository;
        this.productRepository = productRepository;
        this.imageRepository = imageRepository;
    }

    @Transactional
    public RoutineView create(
        long userId,
        RoutineName name,
        RoutineMemo memo,
        boolean isPublic,
        RoutineProducts products
    ) {
        Products catalog = catalogOf(products);
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
    public RoutineView replaceProducts(long userId, long routineId, RoutineProducts products) {
        if (!routineRepository.lock(routineId, userId)) {
            throw new ResourceNotFoundException(ErrorCode.ROUTINE_NOT_FOUND);
        }
        catalogOf(products);
        routineRepository.replaceProducts(routineId, products);
        return findMine(userId, routineId);
    }

    public SharedRoutineViewPage findSharedPage(int page, int size) {
        SharedRoutinePage shared = routineRepository.findSharedPage(page, size);
        Products catalog = Products.from(productRepository.findAllById(shared.productIds()));
        return new SharedRoutineViewPage(
            shared.routines().stream().map(routine -> resolve(routine, catalog)).toList(),
            shared.totalElements()
        );
    }

    public SharedRoutineView findShared(long routineId) {
        SharedRoutine routine = sharedRoutine(routineId);
        return resolve(routine, Products.from(productRepository.findAllById(routine.productIds())));
    }

    @Transactional
    public RoutineView importRoutine(long userId, long routineId) {
        SharedRoutine routine = sharedRoutine(routineId);
        long importedId = routineRepository.saveCopy(userId, routine.importedName(), routineId);
        return findMine(userId, importedId);
    }

    @Transactional
    public void delete(long userId, long routineId) {
        if (!routineRepository.delete(routineId, userId)) {
            throw new ResourceNotFoundException(ErrorCode.ROUTINE_NOT_FOUND);
        }
    }

    private Products catalogOf(RoutineProducts products) {
        Products catalog = Products.from(productRepository.findAllById(products.productIds()));
        if (!catalog.containsAll(products.productIds())) {
            throw new InvalidRequestException(ErrorCode.INVALID_REQUEST_BODY);
        }
        return catalog;
    }

    private SharedRoutine sharedRoutine(long routineId) {
        return routineRepository.findShared(routineId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ROUTINE_NOT_FOUND));
    }

    private SharedRoutineView resolve(SharedRoutine routine, Products catalog) {
        String profileImageUrl = routine.authorProfileImageId()
            .map(imageId -> imageRepository.urlOf(imageId, ImagePurpose.PROFILE))
            .orElse(null);
        return routine.resolve(catalog, profileImageUrl);
    }
}
