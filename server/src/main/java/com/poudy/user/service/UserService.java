package com.poudy.user.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.InvalidImageIdException;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.image.repository.S3ImageRepository;
import com.poudy.image.service.ImageUploadService;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.domain.SocialUsers;
import com.poudy.security.domain.UserActivity;
import com.poudy.security.domain.WithdrawnAccount;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.Nickname;
import com.poudy.user.domain.NicknameCombination;
import com.poudy.user.domain.RestoreRequestPage;
import com.poudy.user.domain.SkinProfileChanged;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.ratelimit.ProfileUpdateRateLimiter;
import com.poudy.user.repository.NicknameSequenceRepository;
import com.poudy.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserService implements SocialUsers, UserActivity {

    private static final int MAX_NICKNAME_ATTEMPTS = 10;

    private final UserRepository userRepository;
    private final NicknameSequenceRepository nicknameSequenceRepository;
    private final PendingImageRepository pendingImageRepository;
    private final S3ImageRepository imageRepository;
    private final ImageUploadService imageUploadService;
    private final ProfileUpdateRateLimiter profileUpdateRateLimiter;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;
    private final Duration retention;

    public UserService(
        UserRepository userRepository,
        NicknameSequenceRepository nicknameSequenceRepository,
        PendingImageRepository pendingImageRepository,
        S3ImageRepository imageRepository,
        ImageUploadService imageUploadService,
        ProfileUpdateRateLimiter profileUpdateRateLimiter,
        ApplicationEventPublisher eventPublisher,
        Clock clock,
        @Value("${poudy.user.retention.max-age:P30D}") Duration retention
    ) {
        this.userRepository = userRepository;
        this.nicknameSequenceRepository = nicknameSequenceRepository;
        this.pendingImageRepository = pendingImageRepository;
        this.imageRepository = imageRepository;
        this.imageUploadService = imageUploadService;
        this.profileUpdateRateLimiter = profileUpdateRateLimiter;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
        this.retention = retention;
    }

    @Override
    public boolean isActive(long userId) {
        return userRepository.isActive(userId);
    }

    @Override
    public Optional<SocialLoginResult> login(OAuthAccount account) {
        Optional<User> user = userRepository.findByAccount(account);
        if (user.isEmpty()) {
            checkRegistrable(UserSignup.from(account));
        }
        return user.map(User::loginResult);
    }

    @Override
    public long signUp(OAuthAccount account) {
        UserSignup signup = UserSignup.from(account);
        checkRegistrable(signup);
        return saveWithNickname(signup).id();
    }

    private User saveWithNickname(UserSignup signup) {
        NicknameCombination combination = NicknameCombination.random();
        for (int attempt = 0; attempt < MAX_NICKNAME_ATTEMPTS; attempt++) {
            OptionalInt number = nicknameSequenceRepository.next(combination);
            if (number.isEmpty()) {
                combination = NicknameCombination.random();
                continue;
            }
            Optional<User> saved = userRepository.save(signup, combination.nicknameOf(number.getAsInt()));
            if (saved.isPresent()) {
                return saved.get();
            }
        }
        throw new InfrastructureException("닉네임을 만들지 못했습니다.");
    }

    @Override
    public WithdrawnAccount findWithdrawn(long withdrawnUserId) {
        return userRepository.findWithdrawnById(withdrawnUserId)
            .map(user -> user.keptFor(retention))
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.WITHDRAWN_MEMBER_NOT_FOUND));
    }

    @Override
    @Transactional
    public void requestRestore(long withdrawnUserId) {
        if (!userRepository.requestRestore(withdrawnUserId)) {
            throw new ResourceNotFoundException(ErrorCode.WITHDRAWN_MEMBER_NOT_FOUND);
        }
    }

    public User findById(long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
    }

    @Transactional
    public User updateProfile(
        long userId,
        Gender gender,
        AgeRange ageRange,
        SkinType skinType,
        Boolean sensitiveSkin,
        boolean profileImageSent,
        UUID profileImageId
    ) {
        return updateProfile(userId, gender, ageRange, skinType, sensitiveSkin, profileImageSent, profileImageId, null);
    }

    @Transactional
    public User updateProfile(
        long userId,
        Gender gender,
        AgeRange ageRange,
        SkinType skinType,
        Boolean sensitiveSkin,
        boolean profileImageSent,
        UUID profileImageId,
        String nickname
    ) {
        return updateProfile(
            userId,
            gender,
            ageRange,
            skinType,
            sensitiveSkin,
            profileImageSent,
            profileImageId,
            nickname,
            false
        );
    }

    @Transactional
    public User updateProfile(
        long userId,
        Gender gender,
        AgeRange ageRange,
        SkinType skinType,
        Boolean sensitiveSkin,
        boolean profileImageSent,
        UUID profileImageId,
        String nickname,
        boolean completeProfileSetup
    ) {
        Nickname requestedNickname = null;
        if (nickname != null) {
            requestedNickname = new Nickname(nickname);
        }
        profileUpdateRateLimiter.requireAllowed(userId);
        User previous = userRepository.findByIdForUpdate(userId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
        UUID savedProfileImageId = previous.profileImageId().orElse(null);
        if (profileImageSent) {
            changeProfileImage(previous, profileImageId);
            savedProfileImageId = profileImageId;
        }
        User updated = userRepository
            .updateProfile(
                userId,
                gender,
                ageRange,
                skinType,
                sensitiveSkin,
                savedProfileImageId,
                requestedNickname,
                previous.profileSetupCompletedAfter(completeProfileSetup)
            )
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
        if (!updated.hasSameSkinAs(previous)) {
            eventPublisher.publishEvent(new SkinProfileChanged(userId));
        }
        return updated;
    }

    private void changeProfileImage(User previous, UUID profileImageId) {
        if (previous.changesProfileImageTo(profileImageId)) {
            claimProfileImage(profileImageId);
        }
        previous.profileImageReplacedBy(profileImageId)
            .ifPresent(replaced -> pendingImageRepository.discard(List.of(replaced), ImagePurpose.PROFILE));
    }

    private void claimProfileImage(UUID imageId) {
        if (pendingImageRepository.claim(List.of(imageId), ImagePurpose.PROFILE, clock.instant()).isEmpty()) {
            throw new InvalidImageIdException();
        }
    }

    public UUID uploadProfileImage(MultipartFile image) {
        List<MultipartFile> images = List.of(image);
        imageUploadService.validate(images, 1);
        return imageUploadService.upload(images, ImagePurpose.PROFILE).getFirst();
    }

    public Optional<String> profileImageUrlOf(User user) {
        return user.profileImageId().map(imageId -> imageRepository.urlOf(imageId, ImagePurpose.PROFILE));
    }

    @Transactional
    public void withdraw(long userId) {
        if (!userRepository.withdraw(userId)) {
            throw new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND);
        }
    }

    public RestoreRequestPage findRestoreRequests(int page, int size) {
        long totalElements = userRepository.countRestoreRequests();
        long offset = (long) (page - 1) * size;
        if (offset >= totalElements) {
            return new RestoreRequestPage(List.of(), totalElements);
        }
        return new RestoreRequestPage(userRepository.findRestoreRequests(offset, size), totalElements);
    }

    @Transactional
    public void restore(long userId) {
        if (!userRepository.restore(userId)) {
            throw new ResourceNotFoundException(ErrorCode.RESTORE_REQUEST_NOT_FOUND);
        }
    }

    private void checkRegistrable(UserSignup signup) {
        userRepository.findByEmail(signup.email()).ifPresent(registered -> {
            throw new EmailAlreadyRegisteredException(registered.registeredAccount());
        });
    }
}
