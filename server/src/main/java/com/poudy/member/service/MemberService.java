package com.poudy.member.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.domain.MemberSkinType;
import com.poudy.member.domain.RestoreRequestPage;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.MemberActivity;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialSignIn;
import com.poudy.security.domain.SocialSignInResult;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService implements SocialSignIn, MemberActivity {

    private final MemberRepository memberRepository;

    public MemberService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    public boolean isActive(long memberId) {
        return memberRepository.isActive(memberId);
    }

    @Override
    @Transactional
    public SocialSignInResult signIn(OAuthAccount account) {
        return memberRepository.findByAccount(account).orElseGet(() -> register(account)).signInResult();
    }

    @Override
    @Transactional
    public void requestRestore(long withdrawnMemberId) {
        if (!memberRepository.requestRestore(withdrawnMemberId)) {
            throw new ResourceNotFoundException(ErrorCode.WITHDRAWN_MEMBER_NOT_FOUND);
        }
    }

    public Member findById(long memberId) {
        return memberRepository.findById(memberId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
    }

    @Transactional
    public Member updateProfile(long memberId, Gender gender, AgeRange ageRange, MemberSkinType skinType) {
        return memberRepository.updateProfile(memberId, gender, ageRange, skinType)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
    }

    @Transactional
    public void withdraw(long memberId) {
        if (!memberRepository.withdraw(memberId)) {
            throw new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND);
        }
    }

    public RestoreRequestPage findRestoreRequests(int page, int size) {
        long totalElements = memberRepository.countRestoreRequests();
        long offset = (long) (page - 1) * size;
        if (offset >= totalElements) {
            return new RestoreRequestPage(List.of(), totalElements);
        }
        return new RestoreRequestPage(memberRepository.findRestoreRequests(offset, size), totalElements);
    }

    @Transactional
    public void restore(long memberId) {
        if (!memberRepository.restore(memberId)) {
            throw new ResourceNotFoundException(ErrorCode.RESTORE_REQUEST_NOT_FOUND);
        }
    }

    private Member register(OAuthAccount account) {
        MemberSignup signup = MemberSignup.from(account);
        memberRepository.findByEmail(signup.email()).ifPresent(registered -> {
            throw new EmailAlreadyRegisteredException(registered.provider());
        });
        return memberRepository.save(signup);
    }
}
