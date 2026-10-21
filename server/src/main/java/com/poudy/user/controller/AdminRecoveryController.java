package com.poudy.user.controller;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.common.dto.PaginationResponse;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.RecoveryAccount;
import com.poudy.user.domain.RetainedUserData;
import com.poudy.user.service.RecoveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 회원 복구")
@RestController
@RequestMapping("/api/admin/users")
public class AdminRecoveryController {
    private final RecoveryService service;
    public AdminRecoveryController(RecoveryService service) {
        this.service = service;
    }

    @Operation(summary = "탈퇴·복구 회원 목록 조회")
    @GetMapping("/withdrawn")
    public Page find(
        @RequestParam(required = false) @Email @Size(max = 320) String email,
        @RequestParam(required = false) OAuthProvider provider,
        @RequestParam(required = false) com.poudy.user.domain.RecoveryStatus status,
        @Valid @ModelAttribute PaginationRequest pagination
    ) {
        return new Page(
            service
                .find(
                    email,
                    provider,
                    status == null ? null : status.name(),
                    (long) (pagination.page() - 1) * pagination.size(),
                    pagination.size()
                )
                .stream().map(Account::from).toList(),
            PaginationResponse.of(pagination, service.count(email, provider, status == null ? null : status.name()))
        );
    }

    @Operation(summary = "회원 복구 운영 집계 조회")
    @GetMapping("/withdrawn/summary")
    public Summary summary() {
        var stats = service.monthly();
        return new Summary(
            service.available(false),
            service.available(true),
            stats.get("restored"),
            stats.get("purged"),
            service.trackingStarted()
        );
    }

    @Operation(summary = "복구 요청 근거와 보존 정보 미리보기")
    @GetMapping("/{id}/restore-preview")
    public Preview preview(@PathVariable long id) {
        var account = service.detail(id);
        RetainedUserData retained = service.retainedData(id);
        return new Preview(
            Account.from(account),
            retained.shelf(),
            retained.ratings(),
            retained.wishlist(),
            retained.filters(),
            retained.profileStored()
        );
    }
    @Schema(name = "AdminRecoveryAccount")
    public record Account(
        @NotNull Long userId,
        @NotNull OAuthProvider provider,
        @NotNull String maskedEmail,
        @NotNull OffsetDateTime withdrawnAt,
        @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) OffsetDateTime requestedAt,
        @NotNull OffsetDateTime purgeEligibleAt,
        @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) OffsetDateTime restoredAt,
        @NotNull Boolean canRestore,
        @NotNull String status) {
        static Account from(RecoveryAccount a) {
            return new Account(
                a.userId(),
                a.provider(),
                a.maskedEmail(),
                a.withdrawnAt(),
                a.requestedAt(),
                a.purgeEligibleAt(),
                a.restoredAt(),
                a.canRestore(),
                a.status()
            );
        }
    }

    @Schema(name = "AdminRecoveryPageResponse")
    public record Page(@NotNull List<Account> items, @NotNull PaginationResponse pagination) {
    }

    @Schema(name = "AdminRecoverySummaryResponse")
    public record Summary(
        @NotNull Long available,
        @NotNull Long expiring,
        @NotNull Long restored,
        @NotNull Long purged,
        @NotNull OffsetDateTime trackingStartedAt) {
    }

    @Schema(name = "AdminRecoveryPreviewResponse")
    public record Preview(
        @NotNull Account account,
        @NotNull Long shelf,
        @NotNull Long ratings,
        @NotNull Long wishlist,
        @NotNull Long filters,
        @NotNull Boolean profileStored) {
    }
}
