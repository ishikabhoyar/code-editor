package com.realtimeeditor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class RealtimeEditorApplication {

    public static void main(String[] args) {
        SpringApplication.run(RealtimeEditorApplication.class, args);
    }
}
