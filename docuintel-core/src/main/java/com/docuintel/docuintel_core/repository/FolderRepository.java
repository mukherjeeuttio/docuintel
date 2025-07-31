package com.docuintel.docuintel_core.repository;

import com.docuintel.docuintel_core.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    Optional<Folder> findByName(String name);
}
