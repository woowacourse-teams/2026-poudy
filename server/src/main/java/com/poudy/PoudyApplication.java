package com.poudy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PoudyApplication {

    public static void main(String[] args) {
        SpringApplication.run(PoudyApplication.class, args);
    }

}
