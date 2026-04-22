package com.realtimeeditor.service;

import com.realtimeeditor.dto.AuthLoginRequest;
import com.realtimeeditor.dto.AuthRegisterRequest;
import com.realtimeeditor.dto.AuthResponse;
import com.realtimeeditor.dto.TokenValidationResponse;

public interface AuthService {
    AuthResponse register(AuthRegisterRequest request);
    AuthResponse login(AuthLoginRequest request);
    TokenValidationResponse validate(String bearerToken);
}
