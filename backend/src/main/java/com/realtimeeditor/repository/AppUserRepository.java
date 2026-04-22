package com.realtimeeditor.repository;

import com.realtimeeditor.entity.AppUserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUserEntity, Long> {
    Optional<AppUserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
}
