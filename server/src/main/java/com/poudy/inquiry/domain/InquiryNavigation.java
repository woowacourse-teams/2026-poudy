package com.poudy.inquiry.domain;

public record InquiryNavigation(InquiryNeighbor previous, InquiryNeighbor next, long position, long total) {
}
