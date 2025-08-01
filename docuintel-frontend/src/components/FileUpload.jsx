import { useCallback, useState } from 'react';
import * as apiClient from '../services/apiClient';

// --- Mantine Imports ---
import { Group, Text, rem } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, PDF_MIME_TYPE, MS_WORD_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconX, IconFileText } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const FileUpload = ({ selectedFolderId, onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = useCallback((acceptedFiles) => {
    setIsUploading(true);

    const uploadPromises = acceptedFiles.map(file => {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedFolderId) {
        formData.append('folderId', selectedFolderId);
      }

      // Return the raw promise from the API client
      return apiClient.uploadFile(formData);
    });

    // Promise.all will fail if ANY upload fails.
    // This is good for giving clear feedback.
    Promise.all(uploadPromises)
      .then(() => {
        // SUCCESS! All files were sent to the server successfully.
        // Now, call the parent handler.
        const wasDirectUpload = !!selectedFolderId; // This will be true or false
        onUploadSuccess(wasDirectUpload);
      })
      .catch((err) => {
        // This will now only trigger on a REAL network error (e.g., backend is down)
        console.error("A critical upload error occurred:", err);
        notifications.show({
            title: 'Critical Upload Failure',
            message: 'Could not connect to the server. Please try again later.',
            color: 'red',
        });
      })
      .finally(() => {
        // This runs after success or failure
        setIsUploading(false);
      });

  }, [selectedFolderId, onUploadSuccess]);

  return (
    <Dropzone
      onDrop={handleDrop}
      onReject={(files) => console.log('rejected files', files)}
      maxSize={10 * 1024 ** 2} // 10MB file size limit
      
      loading={isUploading}
      style={{ marginBottom: '20px' }}
    >
      <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
        <Dropzone.Accept>
          <IconUpload
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
            stroke={1.5}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
            stroke={1.5}
          />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconFileText
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
            stroke={1.5}
          />
        </Dropzone.Idle>

        <div>
          <Text size="xl" inline>
            Drag documents here or click to select files
          </Text>
          <Text size="sm" c="dimmed" inline mt={7}>
            Attach as many files as you like, each should not exceed 10MB
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
};

export default FileUpload;