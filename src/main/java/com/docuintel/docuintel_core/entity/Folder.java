package com.docuintel.docuintel_core.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
public class Folder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(unique = true, nullable = false)
    private String name;

    private LocalDateTime creationTimestamp;

    public Folder(String name)
    {
        this.name = name;
        this.creationTimestamp = LocalDateTime.now();
    }
}
