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

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private S3Service s3Service;

    @Autowired
    FileMetaDataRepository metaDataRepository;

    @Autowired
    private OrchestrationService orchestrationService;

    @PostMapping("/upload")
    public ResponseEntity<FileMetaData> uploadFile(@RequestParam("file") MultipartFile file) {
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
            orchestrationService.processFile(savedMetadata.getId());

            return ResponseEntity.ok(savedMetadata);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteFile(@PathVariable Long id) {
        return metaDataRepository.findById(id)
                .map(metadata -> {
                    s3Service.deleteFile(metadata.getS3ObjectKey());
                    metaDataRepository.deleteById(id);
                    return ResponseEntity.ok("File deleted successfully");
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
