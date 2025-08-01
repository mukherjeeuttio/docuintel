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
  Card,
  CardSection,
  Divider,
  Tooltip
} from '@mantine/core';
import { IconDownload, IconTrash, IconFileText, IconBrain } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

const FileList = ({ files, onFileDeleted }) => {

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
                </Group>
                <Badge variant="light" color="blue" size="xs">
                  AI Processed
                </Badge>
              </Stack>
            </Table.Td>
            <Table.Td>
              <Tooltip
                label={file.summary || 'No summary available. The AI is still processing this document.'}
                position="top"
                multiline
                width={300}
                withArrow
                openDelay={500}
              >
                <Paper p="xs" radius="md" bg="blue.0" withBorder style={{ cursor: 'pointer' }}>
                  <Group gap="xs" mb="xs">
                    <IconBrain size={14} color="var(--mantine-color-blue-6)" />
                    <Text size="xs" fw={600} c="blue.7">AI Summary</Text>
                  </Group>
                  <Text size="xs" c="dark.7" lineClamp={2}>
                    {file.summary || 'No summary available. The AI is still processing this document.'}
                  </Text>
                </Paper>
              </Tooltip>
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
  );
};

export default FileList;