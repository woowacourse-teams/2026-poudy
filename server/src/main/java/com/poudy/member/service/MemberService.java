package com.poudy.member.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.domain.MemberSkinType;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialSignIn;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService implements SocialSignIn {

    private final MemberRepository memberRepository;

    public MemberService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    @Transactional
    public long signIn(OAuthAccount account) {
        return memberRepository.findByAccount(account)
            .orElseGet(() -> register(account))
            .id();
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

    private Member register(OAuthAccount account) {
        MemberSignup signup = MemberSignup.from(account);
        memberRepository.findByEmail(signup.email()).ifPresent(registered -> {
            throw new EmailAlreadyRegisteredException(registered.provider());
        });
        return memberRepository.save(signup);
    }
}
