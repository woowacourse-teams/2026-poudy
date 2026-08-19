package com.poudy.config;

import com.poudy.tag.domain.Tags;
import com.poudy.tag.repository.TagRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TagConfig {

    @Bean
    public Tags tags(TagRepository tagRepository) {
        return tagRepository.findAll();
    }
}
