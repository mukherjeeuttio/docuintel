package com.docuintel.docuintel_core.repository;

import com.docuintel.docuintel_core.entity.FileMetaData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FileMetaDataRepository extends JpaRepository<FileMetaData, Long> {
    List<FileMetaData> findByFolderId(Long folderId);
} 