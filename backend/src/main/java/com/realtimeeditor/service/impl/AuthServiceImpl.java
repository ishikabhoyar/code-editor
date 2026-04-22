package com.realtimeeditor.service.impl;

import com.realtimeeditor.dto.AuthLoginRequest;
import com.realtimeeditor.dto.AuthRegisterRequest;
import com.realtimeeditor.dto.AuthResponse;
import com.realtimeeditor.dto.TokenValidationResponse;
import com.realtimeeditor.entity.AppUserEntity;
import com.realtimeeditor.exception.BadRequestException;
import com.realtimeeditor.exception.UnauthorizedException;
import com.realtimeeditor.repository.AppUserRepository;
import com.realtimeeditor.security.JwtService;
import com.realtimeeditor.service.AuthService;
import java.time.Instant;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthServiceImpl(AppUserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Override
    public AuthResponse register(AuthRegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already registered");
        }

        AppUserEntity user = new AppUserEntity(
                request.name().trim(),
                request.email().trim().toLowerCase(),
                passwordEncoder.encode(request.password()),
                Instant.now()
        );
        userRepository.save(user);
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getName(), user.getEmail());
    }

    @Override
    public AuthResponse login(AuthLoginRequest request) {
        AppUserEntity user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getName(), user.getEmail());
    }

    @Override
    public TokenValidationResponse validate(String bearerToken) {
        String token = bearerToken.startsWith("Bearer ") ? bearerToken.substring(7) : bearerToken;
        if (!jwtService.isTokenValid(token)) {
            throw new UnauthorizedException("Token is not valid");
        }

        return new TokenValidationResponse(true, jwtService.extractEmail(token), jwtService.extractName(token));
    }
}
