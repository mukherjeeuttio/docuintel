import { useState } from 'react';
import * as apiClient from '../services/apiClient';

// --- Mantine Imports ---
import { 
  Table, 
  Button, 
  ActionIcon, 
  Group, 
  Text, 
  Paper, 
  Badge, 
  Stack,
  Tooltip,
  Box,
  CopyButton,
  Modal
} from '@mantine/core';
import { IconDownload, IconTrash, IconFileText, IconBrain, IconSparkles, IconCopy, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { useDisclosure } from '@mantine/hooks';

const FileList = ({ files, onFileDeleted }) => {
  const [summaryModalOpened, { open: openSummaryModalDialog, close: closeSummaryModal }] = useDisclosure(false);
  const [selectedSummary, setSelectedSummary] = useState({ fileName: '', summary: '' });

  // Helper function to check if file was uploaded recently (within last 5 minutes)
  const isRecentlyUploaded = (uploadTimestamp) => {
    if (!uploadTimestamp) return false;
    const uploadTime = new Date(uploadTimestamp);
    const now = new Date();
    const diffInMinutes = (now - uploadTime) / (1000 * 60);
    return diffInMinutes <= 5;
  };

  // Helper function to check if file needs AI summary (uploaded directly to folder)
  const needsAISummary = (file) => {
    return file.summary && file.summary.includes("File uploaded directly to");
  };

  const openSummaryModal = (fileName, summary) => {
    setSelectedSummary({ fileName, summary: summary || 'No summary available. The AI is still processing this document.' });
    openSummaryModalDialog();
  };

  const handleGenerateAISummary = async (fileId, fileName) => {
    try {
      await apiClient.generateAISummary(fileId);
      notifications.show({
        title: 'AI Processing Started',
        message: `Generating AI summary for "${fileName}". Check back in a few moments.`,
        color: 'blue',
        autoClose: 4000,
      });
      
      // Refresh the file list after a delay
      setTimeout(() => {
        onFileDeleted(); // This function refreshes the file list
      }, 3000);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      notifications.show({
        title: 'Error',
        message: 'Could not generate AI summary.',
        color: 'red',
        autoClose: 3000,
      });
    }
  };

  const handleDownload = async (fileId) => {
    try {
      const response = await apiClient.getFileViewUrl(fileId);
      // This will open images/pdfs in a new tab, and download other files.
      window.open(response.data, '_blank');
    } catch (error) {
      console.error('Error getting download URL:', error);
      notifications.show({
        title: 'Error',
        message: 'Could not get the file URL.',
        color: 'red',
      });
    }
  };

  const openDeleteModal = (fileId, fileName) =>
    modals.openConfirmModal({
      title: `Delete ${fileName}`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this file? This action is permanent and cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete File', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiClient.deleteFile(fileId);
          notifications.show({
            title: 'Success',
            message: `${fileName} has been deleted.`,
            color: 'green',
          });
          onFileDeleted(); // Refresh the file list
        } catch (error) {
          console.error('Error deleting file:', error);
          notifications.show({
            title: 'Error',
            message: 'Failed to delete the file.',
            color: 'red',
          });
        }
      },
    });

  if (files.length === 0) {
    return (
      <Paper p="lg" radius="lg" bg="gray.0" withBorder>
        <Stack align="center" gap="sm">
          <IconFileText size={32} color="var(--mantine-color-gray-4)" />
          <Text size="md" c="dimmed" ta="center">
            {files.length === 0 ? 'No files found in this location.' : 'This folder is empty.'}
          </Text>
          <Text size="xs" c="dimmed" ta="center">
            Upload some documents to get started with AI-powered organization.
          </Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <>
      {files.length === 0 ? (
        <Paper p="lg" radius="lg" bg="gray.0" withBorder>
          <Stack align="center" gap="sm">
            <IconFileText size={32} color="var(--mantine-color-gray-4)" />
            <Text size="md" c="dimmed" ta="center">
              {files.length === 0 ? 'No files found in this location.' : 'This folder is empty.'}
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              Upload some documents to get started with AI-powered organization.
            </Text>
          </Stack>
        </Paper>
      ) : (
        <Table verticalSpacing="sm" highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ fontWeight: 600, fontSize: '14px' }}>File Name</Table.Th>
              <Table.Th style={{ fontWeight: 600, fontSize: '14px' }}>AI Summary</Table.Th>
              <Table.Th style={{ fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {files.map((file) => (
              <Table.Tr key={file.id}>
                <Table.Td>
                  <Stack gap="xs">
                    <Group gap="sm">
                      <IconFileText size={16} color="var(--mantine-color-blue-6)" />
                      <Text fw={500} size="sm" lineClamp={1}>{file.fileName}</Text>
                      {isRecentlyUploaded(file.uploadTimestamp) && (
                        <Badge variant="gradient" gradient={{ from: 'green', to: 'blue' }} size="xs">
                          New
                        </Badge>
                      )}
                    </Group>
                    <Group gap="xs">
                      <Badge variant="light" color="blue" size="xs">
                        AI Processed
                      </Badge>
                      {file.classification && (
                        <Badge variant="light" color="green" size="xs">
                          {file.classification}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <Paper 
                    p="xs" 
                    radius="md" 
                    bg="blue.0" 
                    withBorder 
                    onClick={() => openSummaryModal(file.fileName, file.summary)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Group gap="xs" mb="xs">
                      <IconBrain size={14} color="var(--mantine-color-blue-6)" />
                      <Text size="xs" fw={600} c="blue.7">AI Summary</Text>
                    </Group>
                    <Text size="xs" c="dark.7" lineClamp={2}>
                      {file.summary || 'No summary available. The AI is still processing this document.'}
                    </Text>
                  </Paper>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="center">
                    <Button
                      onClick={() => handleDownload(file.id)}
                      variant="light"
                      size="xs"
                      leftSection={<IconDownload size={14} />}
                      radius="md"
                    >
                      Download
                    </Button>
                    {needsAISummary(file) && (
                      <Button
                        onClick={() => handleGenerateAISummary(file.id, file.fileName)}
                        variant="light"
                        color="orange"
                        size="xs"
                        leftSection={<IconSparkles size={14} />}
                        radius="md"
                      >
                        AI Summary
                      </Button>
                    )}
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => openDeleteModal(file.id, file.fileName)}
                      size="sm"
                      radius="md"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* AI Summary Modal */}
      <Modal 
        opened={summaryModalOpened} 
        onClose={closeSummaryModal}
        title={
          <Group gap="sm">
            <IconBrain size={20} color="var(--mantine-color-blue-6)" />
            <Text fw={600} size="lg">AI Summary</Text>
          </Group>
        }
        size="lg"
        centered
      >
        <Stack gap="md">
          <Paper p="md" radius="md" bg="blue.0" withBorder>
            <Text fw={600} size="sm" c="blue.7" mb="sm">
              {selectedSummary.fileName}
            </Text>
            <Text size="sm" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {selectedSummary.summary}
            </Text>
          </Paper>
          
          <Group justify="flex-end">
            <CopyButton value={selectedSummary.summary}>
              {({ copied, copy }) => (
                <Button
                  color={copied ? 'teal' : 'blue'}
                  onClick={copy}
                  leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  variant="light"
                  size="sm"
                >
                  {copied ? 'Copied!' : 'Copy Summary'}
                </Button>
              )}
            </CopyButton>
            <Button onClick={closeSummaryModal} variant="outline" size="sm">
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

export default FileList;