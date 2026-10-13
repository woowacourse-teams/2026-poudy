package com.poudy.storage.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.repository.MemberRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginMember;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("저장함 API")
class StorageControllerTest {

    private static final String PATH = "/api/members/me/saved-products";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Member member;

    @BeforeEach
    void signUp() {
        member = memberRepository.save(
            MemberSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "member@example.com", true))
        );
    }

    @Test
    @DisplayName("저장한 제품을 최근 저장순으로 ID 와 표시 정보로 돌려준다")
    void findsSavedProductsByRecentSave() throws Exception {
        mockMvc.perform(put(PATH + "/15").with(signedIn())).andExpect(status().isNoContent());
        mockMvc.perform(put(PATH + "/1").with(signedIn())).andExpect(status().isNoContent());
        jdbcTemplate.update(
            "update member_saved_product set created_at = created_at - interval '1 minute' where product_id = 15"
        );

        mockMvc.perform(get(PATH + "/ids").with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.productIds.length()").value(2))
            .andExpect(jsonPath("$.productIds[0]").value(1L))
            .andExpect(jsonPath("$.productIds[1]").value(15L));
        mockMvc.perform(get(PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(1L))
            .andExpect(jsonPath("$.items[0].name").value("블랙 스네일 토너"))
            .andExpect(jsonPath("$.items[1].id").value(15L))
            .andExpect(jsonPath("$.items[1].name").value("PH 컨디션 토너"));
    }

    @Test
    @DisplayName("같은 제품을 다시 저장하거나 저장하지 않은 제품을 해제해도 204 로 그대로 둔다")
    void savesAndUnsavesIdempotently() throws Exception {
        mockMvc.perform(put(PATH + "/1").with(signedIn())).andExpect(status().isNoContent());
        mockMvc.perform(put(PATH + "/1").with(signedIn())).andExpect(status().isNoContent());
        assertThat(savedCount()).isEqualTo(1);

        mockMvc.perform(delete(PATH + "/1").with(signedIn())).andExpect(status().isNoContent());
        mockMvc.perform(delete(PATH + "/1").with(signedIn())).andExpect(status().isNoContent());
        assertThat(savedCount()).isZero();
    }

    @Test
    @DisplayName("없는 제품은 저장하지 않고 404 로 거절한다")
    void rejectsUnknownProduct() throws Exception {
        mockMvc.perform(put(PATH + "/999").with(signedIn()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        assertThat(savedCount()).isZero();
    }

    @Test
    @DisplayName("회원 세션이 없으면 401, 관리자 세션이면 403 으로 거절한다")
    void requiresMemberSession() throws Exception {
        mockMvc.perform(get(PATH + "/ids")).andExpect(status().isUnauthorized());
        mockMvc.perform(put(PATH + "/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(get(PATH).with(authentication(new LoginAdmin("admin").toAuthentication())))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("회원 행을 지우면 저장함도 함께 지운다")
    void deletesSavedProductsWithMember() throws Exception {
        mockMvc.perform(put(PATH + "/1").with(signedIn())).andExpect(status().isNoContent());

        jdbcTemplate.update("delete from member where id = ?", member.id());

        assertThat(savedCount()).isZero();
    }

    private RequestPostProcessor signedIn() {
        return authentication(new LoginMember(member.id()).toAuthentication());
    }

    private Integer savedCount() {
        return jdbcTemplate.queryForObject(
            "select count(*) from member_saved_product where member_id = ?",
            Integer.class,
            member.id()
        );
    }
}
