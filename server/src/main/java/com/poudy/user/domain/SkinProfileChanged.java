package com.poudy.user.domain;

// 회원의 피부 타입이나 민감성 피부 여부가 바뀌었음을 알린다.
public record SkinProfileChanged(long userId) {
}
