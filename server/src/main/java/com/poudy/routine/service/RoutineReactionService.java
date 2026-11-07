package com.poudy.routine.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.repository.S3ImageRepository;
import com.poudy.routine.domain.RoutineComment;
import com.poudy.routine.domain.RoutineCommentContent;
import com.poudy.routine.domain.RoutineCommentPage;
import com.poudy.routine.domain.RoutineCommentView;
import com.poudy.routine.domain.RoutineCommentViewPage;
import com.poudy.routine.repository.RoutineRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoutineReactionService {

    private final RoutineRepository routineRepository;
    private final S3ImageRepository imageRepository;

    public RoutineReactionService(RoutineRepository routineRepository, S3ImageRepository imageRepository) {
        this.routineRepository = routineRepository;
        this.imageRepository = imageRepository;
    }

    @Transactional
    public void like(long userId, long routineId) {
        requireShared(routineId);
        routineRepository.like(routineId, userId);
    }

    @Transactional
    public void unlike(long userId, long routineId) {
        requireShared(routineId);
        routineRepository.unlike(routineId, userId);
    }

    public boolean isLiked(Long viewerId, long routineId) {
        if (viewerId == null) {
            return false;
        }
        return routineRepository.isLiked(routineId, viewerId);
    }

    public RoutineCommentViewPage findComments(long routineId, Long viewerId, int page, int size) {
        boolean shared = routineRepository.existsShared(routineId);
        if (!shared && !isOwner(routineId, viewerId)) {
            throw new ResourceNotFoundException(ErrorCode.ROUTINE_NOT_FOUND);
        }
        RoutineCommentPage comments = routineRepository.findComments(routineId, page, size);
        return new RoutineCommentViewPage(
            comments.comments().stream().map(comment -> viewOf(comment, viewerId)).toList(),
            comments.totalElements(),
            shared
        );
    }

    @Transactional
    public RoutineCommentView writeComment(long userId, long routineId, RoutineCommentContent content) {
        requireShared(routineId);
        long commentId = routineRepository.saveComment(routineId, userId, content);
        return routineRepository.findComment(commentId)
            .map(comment -> viewOf(comment, userId))
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ROUTINE_COMMENT_NOT_FOUND));
    }

    @Transactional
    public RoutineCommentView editComment(long userId, long commentId, RoutineCommentContent content) {
        if (!routineRepository.updateComment(commentId, userId, content)) {
            throw new ResourceNotFoundException(ErrorCode.ROUTINE_COMMENT_NOT_FOUND);
        }
        return routineRepository.findComment(commentId)
            .map(comment -> viewOf(comment, userId))
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ROUTINE_COMMENT_NOT_FOUND));
    }

    @Transactional
    public void deleteComment(long userId, long commentId) {
        if (!routineRepository.deleteComment(commentId, userId)) {
            throw new ResourceNotFoundException(ErrorCode.ROUTINE_COMMENT_NOT_FOUND);
        }
    }

    private boolean isOwner(long routineId, Long viewerId) {
        return viewerId != null && routineRepository.existsByIdAndUserId(routineId, viewerId);
    }

    private void requireShared(long routineId) {
        if (!routineRepository.existsShared(routineId)) {
            throw new ResourceNotFoundException(ErrorCode.ROUTINE_NOT_FOUND);
        }
    }

    private RoutineCommentView viewOf(RoutineComment comment, Long viewerId) {
        String profileImageUrl = comment.authorProfileImageId()
            .map(imageId -> imageRepository.urlOf(imageId, ImagePurpose.PROFILE))
            .orElse(null);
        return comment.viewFor(viewerId, profileImageUrl);
    }
}
