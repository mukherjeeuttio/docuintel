import { useCallback, useState } from 'react';
import * as apiClient from '../services/apiClient';

// --- Mantine Imports ---
import { Group, Text, rem, Paper, Badge, Stack } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, PDF_MIME_TYPE, MS_WORD_MIME_TYPE } from '@mantine/dropzone';
import { IconUpload, IconX, IconFileText, IconCloudUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const FileUpload = ({ selectedFolderId, onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = useCallback((acceptedFiles) => {
    setIsUploading(true);

    // Show immediate upload start notification
    notifications.show({
      id: 'upload-start',
      title: 'Uploading Files',
      message: `Uploading ${acceptedFiles.length} file(s)...`,
      color: 'blue',
      loading: true,
      autoClose: false,
    });

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
      .then((responses) => {
        // Hide upload notification
        notifications.hide('upload-start');
        
        // SUCCESS! All files were sent to the server successfully.
        // Extract uploaded file information from responses
        const uploadedFiles = responses.map(response => response.data);
        
        // Now, call the parent handler with file info
        const wasDirectUpload = !!selectedFolderId;
        onUploadSuccess(wasDirectUpload, uploadedFiles);
      })
      .catch((err) => {
        // Hide upload notification
        notifications.hide('upload-start');
        
        // This will now only trigger on a REAL network error (e.g., backend is down)
        console.error("A critical upload error occurred:", err);
        notifications.show({
            title: 'Upload Failed',
            message: 'Could not connect to the server. Please try again later.',
            color: 'red',
            autoClose: 4000,
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
      loading={false} // Disable default loading to use custom state
      disabled={isUploading}
      radius="lg"
      style={{ 
        border: `2px dashed ${isUploading ? 'var(--mantine-color-orange-3)' : 'var(--mantine-color-blue-3)'}`,
        background: isUploading 
          ? 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        transition: 'all 0.3s ease',
        opacity: isUploading ? 0.8 : 1
      }}
      styles={{
        root: {
          '&:hover': {
            borderColor: isUploading ? 'var(--mantine-color-orange-5)' : 'var(--mantine-color-blue-5)',
            background: isUploading 
              ? 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)' 
              : 'linear-gradient(135deg, #f1f5f9 0%, #dbeafe 100%)',
          }
        }
      }}
    >
      <Group justify="center" gap="md" mih={180} style={{ pointerEvents: 'none' }}>
        {isUploading ? (
          <Stack align="center" gap="sm">
            <Paper p="lg" radius="lg" bg="orange.0" withBorder>
              <Group justify="center" gap="sm">
                <IconCloudUpload
                  style={{ 
                    width: rem(48), 
                    height: rem(48), 
                    color: 'var(--mantine-color-orange-6)',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                  stroke={1.5}
                />
              </Group>
            </Paper>
            <Text size="lg" fw={600} c="orange.7" ta="center">
              Uploading files...
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Please wait while your files are being uploaded
            </Text>
          </Stack>
        ) : (
          <>
            <Dropzone.Accept>
              <Paper p="lg" radius="lg" bg="green.0" withBorder>
                <Group justify="center" gap="sm">
                  <IconUpload
                    style={{ width: rem(48), height: rem(48), color: 'var(--mantine-color-green-6)' }}
                    stroke={1.5}
                  />
                  <Text size="md" fw={600} c="green.7">Drop files here</Text>
                </Group>
              </Paper>
            </Dropzone.Accept>
            <Dropzone.Reject>
              <Paper p="lg" radius="lg" bg="red.0" withBorder>
                <Group justify="center" gap="sm">
                  <IconX
                    style={{ width: rem(48), height: rem(48), color: 'var(--mantine-color-red-6)' }}
                    stroke={1.5}
                  />
                  <Text size="md" fw={600} c="red.7">Invalid file type</Text>
                </Group>
              </Paper>
            </Dropzone.Reject>
            <Dropzone.Idle>
              <Stack align="center" gap="sm">
                <Paper p="lg" radius="lg" bg="blue.0" withBorder>
                  <Group justify="center" gap="sm">
                    <IconCloudUpload
                      style={{ width: rem(48), height: rem(48), color: 'var(--mantine-color-blue-6)' }}
                      stroke={1.5}
                    />
                  </Group>
                </Paper>
                
                <Stack gap="xs" align="center">
                  <Text size="lg" fw={600} c="dark.7" ta="center">
                    Drag and drop files here or click here to upload
                  </Text>
                  <Text size="xs" c="dimmed" ta="center" maw={300}>
                    Upload documents, images, or PDFs. Max 10MB per file.
                  </Text>
                  
                  <Group gap="xs" mt="sm">
                    <Badge variant="light" color="blue" size="xs">PDF</Badge>
                    <Badge variant="light" color="blue" size="xs">DOC</Badge>
                    <Badge variant="light" color="blue" size="xs">Images</Badge>
                    <Badge variant="light" color="blue" size="xs">Text</Badge>
                  </Group>
                </Stack>
              </Stack>
            </Dropzone.Idle>
          </>
        )}
      </Group>
    </Dropzone>
  );
};

export default FileUpload;