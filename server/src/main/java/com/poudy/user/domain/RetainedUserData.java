package com.poudy.user.domain;

public record RetainedUserData(long shelf, long ratings, long wishlist, long filters, boolean profileStored) {
}
