package com.docuintel.docuintel_core.controller;

import com.docuintel.docuintel_core.entity.FileMetaData;
import com.docuintel.docuintel_core.entity.Folder;
import com.docuintel.docuintel_core.repository.FileMetaDataRepository;
import com.docuintel.docuintel_core.repository.FolderRepository;
import com.docuintel.docuintel_core.service.S3Service;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"})
public class FolderController {

    @Autowired
    private FolderRepository folderRepository;

    @Autowired
    private FileMetaDataRepository fileMetadataRepository;

    @Autowired
    private S3Service s3Service;

    @GetMapping
    public List<Folder> getAllFolders() {
        return folderRepository.findAll();
    }

    @GetMapping("/{folderId}/files")
    public List<FileMetaData> getFilesInFolder(@PathVariable Long folderId) {
        return fileMetadataRepository.findByFolderId(folderId);
    }

    @PostMapping
    public Folder createFolder(@RequestBody Folder folder) {
        return folderRepository.save(new Folder(folder.getName()));
    }

    @DeleteMapping("/{folderId}")
    @Transactional // Ensures the entire operation succeeds or fails together.
    public ResponseEntity<Void> deleteFolder(@PathVariable Long folderId) {
        // 1. Find all files associated with this folder.
        List<FileMetaData> filesToDelete = fileMetadataRepository.findByFolderId(folderId);

        // 2. Delete each associated file from AWS S3.
        for (FileMetaData file : filesToDelete) {
            s3Service.deleteFile(file.getS3ObjectKey());
        }

        // 3. Delete all file metadata records from the database.
        if (!filesToDelete.isEmpty()) {
            fileMetadataRepository.deleteAll(filesToDelete);
        }

        // 4. Finally, delete the folder itself.
        folderRepository.deleteById(folderId);

        return ResponseEntity.noContent().build();
    }
}
