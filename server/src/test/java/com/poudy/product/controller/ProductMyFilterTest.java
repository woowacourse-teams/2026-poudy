package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.myfilter.repository.MyFilterRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("제품 목록과 개수의 나만의 필터")
class ProductMyFilterTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private MyFilterRepository myFilters;

    private final ObjectMapper mapper = new ObjectMapper();
    private long userId;

    @BeforeEach
    void signUp() {
        userId = users.save(
            UserSignup.from(
                new OAuthAccount(OAuthProvider.KAKAO, "my-filter-952", "my-filter@example.com", true)
            ),
            UserNicknameTestFixture.nickname()
        ).orElseThrow().id();
        myFilters.add(userId, List.of(9L, 20L));
    }

    @Test
    void appliesOnlyWhenEnabledAndKeepsListAndCountConsistent() throws Exception {
        JsonNode expected = list(signedIn(), params("excludeIngredientIds", "9", "excludeIngredientIds", "20"));
        JsonNode filtered = list(signedIn(), params("myFilter", "true"));
        assertThat(filtered).isEqualTo(expected);
        assertCount(signedIn(), params("myFilter", "true"), filtered);
        JsonNode baseline = list(signedIn(), params());
        assertThat(filtered.path("pagination").path("totalElements").asLong())
            .isLessThan(baseline.path("pagination").path("totalElements").asLong());
        assertThat(list(signedIn(), params("myFilter", "false"))).isEqualTo(baseline);
        assertCount(signedIn(), params("myFilter", "false"), baseline);
    }

    @Test
    void keepsIncludedIngredientAndDeduplicatesExplicitExclusions() throws Exception {
        MultiValueMap<String, String> duplicate = params("myFilter", "true", "excludeIngredientIds", "20");
        JsonNode expected = list(signedIn(), params("excludeIngredientIds", "9", "excludeIngredientIds", "20"));
        assertThat(list(signedIn(), duplicate)).isEqualTo(expected);
        assertCount(signedIn(), duplicate, expected);

        myFilters.remove(userId, List.of(9L, 20L));
        myFilters.add(userId, List.of(9L));
        MultiValueMap<String, String> included = params("myFilter", "true", "includeIngredientIds", "9");
        JsonNode includedOnly = list(signedIn(), params("includeIngredientIds", "9"));
        assertThat(includedOnly.path("pagination").path("totalElements").asLong()).isPositive();
        assertThat(list(signedIn(), included)).isEqualTo(includedOnly);
        assertCount(signedIn(), included, includedOnly);
        assertThat(myFilters.findIngredientIds(userId)).containsExactly(9L);
    }

    @Test
    void stillRejectsExplicitConflicts() throws Exception {
        for (String path : List.of("/api/products", "/api/products/count")) {
            mockMvc.perform(
                get(path).with(signedIn()).param("myFilter", "true")
                    .param("includeIngredientIds", "9").param("excludeIngredientIds", "9")
            )
                .andExpect(status().isBadRequest());
        }
    }

    @Test
    void requiresMemberSessionOnlyWhenEnabled() throws Exception {
        for (RequestPostProcessor session : List.<RequestPostProcessor>of(
            request -> request,
            authentication(new LoginAdmin("admin-test").toAuthentication())
        )) {
            JsonNode baseline = list(session, params());
            assertThat(list(session, params("myFilter", "false"))).isEqualTo(baseline);
            assertCount(session, params("myFilter", "false"), baseline);
            for (String path : List.of("/api/products", "/api/products/count")) {
                mockMvc.perform(get(path).with(session).param("myFilter", "true"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
            }
        }
    }

    @Test
    void rejectsMissingMemberSessionInsteadOfApplyingAnEmptyFilter() throws Exception {
        for (String path : List.of("/api/products", "/api/products/count")) {
            mockMvc.perform(
                get(path).with(authentication(new LoginMember(Long.MAX_VALUE).toAuthentication()))
                    .param("myFilter", "true")
            )
                .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void usesCurrentMemberAndLatestFilterIncludingEmptyFilter() throws Exception {
        JsonNode filtered = list(signedIn(), params("myFilter", "true"));
        long anotherId = users.save(
            UserSignup.from(
                new OAuthAccount(OAuthProvider.KAKAO, "other-952", "other@example.com", true)
            ),
            UserNicknameTestFixture.nickname()
        ).orElseThrow().id();
        RequestPostProcessor another = authentication(new LoginMember(anotherId).toAuthentication());
        JsonNode baseline = list(another, params());
        assertThat(list(another, params("myFilter", "true"))).isEqualTo(baseline);
        assertCount(another, params("myFilter", "true"), baseline);
        myFilters.remove(userId, List.of(9L, 20L));
        JsonNode afterRemoval = list(signedIn(), params("myFilter", "true"));
        assertThat(afterRemoval).isEqualTo(baseline).isNotEqualTo(filtered);
        assertCount(signedIn(), params("myFilter", "true"), afterRemoval);
    }

    private RequestPostProcessor signedIn() {
        return authentication(new LoginMember(userId).toAuthentication());
    }

    private JsonNode list(RequestPostProcessor session, MultiValueMap<String, String> params) throws Exception {
        return mapper.readTree(
            mockMvc.perform(get("/api/products").with(session).params(params))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
        );
    }

    private void assertCount(RequestPostProcessor session, MultiValueMap<String, String> params, JsonNode page)
        throws Exception {
        JsonNode count = mapper.readTree(
            mockMvc.perform(get("/api/products/count").with(session).params(params))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
        );
        assertThat(count.path("count").asLong()).isEqualTo(page.path("pagination").path("totalElements").asLong());
    }

    private MultiValueMap<String, String> params(String... entries) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        for (int index = 0; index < entries.length; index += 2) {
            params.add(entries[index], entries[index + 1]);
        }
        return params;
    }
}
