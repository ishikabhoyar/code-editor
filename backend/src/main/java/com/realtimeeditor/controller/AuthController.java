package com.realtimeeditor.controller;

import com.realtimeeditor.dto.ApiResponse;
import com.realtimeeditor.dto.AuthLoginRequest;
import com.realtimeeditor.dto.AuthRegisterRequest;
import com.realtimeeditor.dto.AuthResponse;
import com.realtimeeditor.dto.TokenValidationResponse;
import com.realtimeeditor.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody AuthRegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthLoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/validate")
    public TokenValidationResponse validate(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return authService.validate(authorization);
    }

    @GetMapping("/health")
    public ApiResponse health() {
        return new ApiResponse("Auth service is healthy");
    }
}
