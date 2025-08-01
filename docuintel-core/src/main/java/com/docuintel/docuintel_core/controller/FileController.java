package com.docuintel.docuintel_core.controller;

import com.docuintel.docuintel_core.entity.FileMetaData;
import com.docuintel.docuintel_core.entity.Folder;
import com.docuintel.docuintel_core.repository.FileMetaDataRepository;
import com.docuintel.docuintel_core.repository.FolderRepository;
import com.docuintel.docuintel_core.service.S3Service;
import com.docuintel.docuintel_core.service.OrchestrationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(FileController.class);

    @Autowired
    private S3Service s3Service;

    @Autowired
    FileMetaDataRepository metaDataRepository;

    @Autowired
    private OrchestrationService orchestrationService;

    @Autowired
    private FolderRepository folderRepository;

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

            // 3. Handle folder assignment
            if (folderId.isPresent()) {
                // If uploading to a specific folder, assign directly without AI processing
                Folder targetFolder = folderRepository.findById(folderId.get())
                        .orElseThrow(() -> new RuntimeException("Target folder not found for id: " + folderId.get()));
                
                metadata.setFolder(targetFolder);
                metadata.setClassification(targetFolder.getName());
                metadata.setSummary("File uploaded directly to " + targetFolder.getName() + " folder");
                
                log.info("File '{}' uploaded directly to folder '{}'", metadata.getFileName(), targetFolder.getName());
            }
            
            FileMetaData savedMetadata = metaDataRepository.save(metadata);

            // 4. Only trigger AI processing if no specific folder was chosen
            if (folderId.isEmpty()) {
                orchestrationService.processAndCategorizeFile(savedMetadata.getId(), null);
            }

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

    @PostMapping("/{fileId}/generate-summary")
    public ResponseEntity<String> generateAISummary(@PathVariable Long fileId) {
        try {
            FileMetaData metadata = metaDataRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));

            // Trigger AI processing for this specific file
            orchestrationService.processAndCategorizeFile(metadata.getId(), metadata.getFolder() != null ? metadata.getFolder().getId() : null);
            
            log.info("AI summary generation triggered for file: {}", metadata.getFileName());
            return ResponseEntity.ok("AI summary generation started for file: " + metadata.getFileName());
        } catch (Exception e) {
            log.error("Error triggering AI summary for file ID: {}", fileId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to generate AI summary");
        }
    }
}
