package com.docuintel.docuintel_core.controller;

import com.docuintel.docuintel_core.entity.FileMetaData;
import com.docuintel.docuintel_core.repository.FileMetaDataRepository;
import com.docuintel.docuintel_core.service.S3Service;
import com.docuintel.docuintel_core.service.OrchestrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"})
public class FileController {

    @Autowired
    private S3Service s3Service;

    @Autowired
    FileMetaDataRepository metaDataRepository;

    @Autowired
    private OrchestrationService orchestrationService;

    @PostMapping("/upload")
    public ResponseEntity<FileMetaData> uploadFile(@RequestParam("file") MultipartFile file, @RequestParam("folderId") Optional<Long> folderId) {
        try {
            String uniqueKey = System.currentTimeMillis() + "_" + file.getOriginalFilename();

            // 1. Upload to S3
            s3Service.uploadFile(uniqueKey, file.getBytes());

            // 2. Save metadata to database
            FileMetaData metadata = new FileMetaData();
            metadata.setFileName(file.getOriginalFilename());
            metadata.setS3ObjectKey(uniqueKey);
            metadata.setSize(file.getSize());
            metadata.setFileType(file.getContentType());
            metadata.setUploadTimestamp(LocalDateTime.now());
            FileMetaData savedMetadata = metaDataRepository.save(metadata);

            // 3. Trigger async AI processing
            orchestrationService.processAndCategorizeFile(savedMetadata.getId(), folderId.orElse(null));

            return ResponseEntity.ok(savedMetadata);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long fileId) {
        FileMetaData metadata = metaDataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        // Delete from S3 first
        s3Service.deleteFile(metadata.getS3ObjectKey());

        // Then delete from database
        metaDataRepository.deleteById(fileId);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{fileId}/view-url")
    public ResponseEntity<String> getPresignedViewUrl(@PathVariable Long fileId) {
        FileMetaData metadata = metaDataRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        String url = s3Service.generatePresignedUrl(metadata.getS3ObjectKey());
        return ResponseEntity.ok(url);
    }

    @GetMapping("/unassigned")
    public List<FileMetaData> getUnassignedFiles() {
        return metaDataRepository.findByFolderIsNull();
    }
}
