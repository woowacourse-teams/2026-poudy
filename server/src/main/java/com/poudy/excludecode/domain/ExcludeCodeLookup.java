package com.poudy.excludecode.domain;

import java.util.List;

public interface ExcludeCodeLookup {

    List<ExcludeCode> codesOf(Long ingredientId);
}
