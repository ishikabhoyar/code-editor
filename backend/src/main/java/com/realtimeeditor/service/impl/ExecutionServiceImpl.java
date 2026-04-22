package com.realtimeeditor.service.impl;

import com.realtimeeditor.dto.ExecutionRequest;
import com.realtimeeditor.dto.ExecutionResponse;
import com.realtimeeditor.entity.DocumentEntity;
import com.realtimeeditor.entity.ExecutionRecordEmbeddable;
import com.realtimeeditor.exception.BadRequestException;
import com.realtimeeditor.service.ExecutionService;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ExecutionServiceImpl implements ExecutionService {

    private final DocumentServiceImpl documentService;
    private final int defaultTimeoutSeconds;

    public ExecutionServiceImpl(
            DocumentServiceImpl documentService,
            @Value("${app.execution.timeout-seconds}") int defaultTimeoutSeconds
    ) {
        this.documentService = documentService;
        this.defaultTimeoutSeconds = defaultTimeoutSeconds;
    }

    @Override
    public ExecutionResponse execute(String ownerEmail, Long documentId, ExecutionRequest request) {
        DocumentEntity document = documentService.ensureAccess(ownerEmail, documentId);
        long start = System.currentTimeMillis();

        if (!"Java".equalsIgnoreCase(request.language())) {
            return persistExecution(document, "error", "", "Only Java execution is supported by the backend sandbox.", 0L, start);
        }

        int timeoutSeconds = request.timeoutSeconds() == null ? defaultTimeoutSeconds : Math.max(1, request.timeoutSeconds());

        try {
            Path tempDir = Files.createTempDirectory("realtime-editor-exec-");
            Path sourceFile = tempDir.resolve("Main.java");
            Files.writeString(sourceFile, request.code(), StandardCharsets.UTF_8);

            Process compileProcess = new ProcessBuilder("javac", sourceFile.getFileName().toString())
                    .directory(tempDir.toFile())
                    .redirectErrorStream(false)
                    .start();
            String compileStdout = readStream(compileProcess.getInputStream());
            String compileStderr = readStream(compileProcess.getErrorStream());
            boolean compileFinished = compileProcess.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!compileFinished) {
                compileProcess.destroyForcibly();
                return persistExecution(document, "timeout", compileStdout, "Compilation timed out.", timeoutSeconds * 1000L, start);
            }
            if (compileProcess.exitValue() != 0) {
                return persistExecution(document, "error", compileStdout, compileStderr, System.currentTimeMillis() - start, start);
            }

            Process runProcess = new ProcessBuilder("java", "Main")
                    .directory(tempDir.toFile())
                    .redirectErrorStream(false)
                    .start();
            boolean finished = runProcess.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            String stdout = readStream(runProcess.getInputStream());
            String stderr = readStream(runProcess.getErrorStream());
            if (!finished) {
                runProcess.destroyForcibly();
                return persistExecution(document, "timeout", stdout, "Execution timed out.", timeoutSeconds * 1000L, start);
            }

            String status = runProcess.exitValue() == 0 ? "success" : "error";
            return persistExecution(document, status, stdout, stderr, System.currentTimeMillis() - start, start);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return persistExecution(document, "error", "", ex.getMessage(), System.currentTimeMillis() - start, start);
        } catch (IOException ex) {
            return persistExecution(document, "error", "", ex.getMessage(), System.currentTimeMillis() - start, start);
        }
    }

    private ExecutionResponse persistExecution(
            DocumentEntity document,
            String status,
            String stdout,
            String stderr,
            long durationMs,
            long start
    ) {
        Instant executedAt = Instant.ofEpochMilli(start + durationMs);
        String executionId = "exec-" + executedAt.toEpochMilli();
        ExecutionRecordEmbeddable record = new ExecutionRecordEmbeddable(
                executionId,
                executedAt,
                status,
                stdout,
                stderr,
                durationMs
        );
        document.getExecutionHistory().add(0, record);
        document.setUpdatedAt(Instant.now());
        documentService.saveEntity(document);
        return new ExecutionResponse(executionId, status, stdout, stderr, durationMs, executedAt);
    }

    private String readStream(java.io.InputStream inputStream) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append(System.lineSeparator());
            }
            return builder.toString().trim();
        }
    }
}
