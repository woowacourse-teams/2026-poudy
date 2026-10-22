package com.poudy.user.domain;

import java.util.List;

public record RestoreRequestPage(List<RestoreRequest> items, long totalElements) {

    public RestoreRequestPage {
        items = List.copyOf(items);
    }
}
