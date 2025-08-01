import * as apiClient from '../services/apiClient';

// --- Mantine Imports ---
import { Table, Button, ActionIcon, Group, Text } from '@mantine/core';
import { IconDownload, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals'; // We need to set up modals

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

  const rows = files.map((file) => (
    <Table.Tr key={file.id}>
      <Table.Td>
        <Text fw={500}>{file.fileName}</Text>
      </Table.Td>
      <Table.Td>
        <Text c="dimmed" size="sm">{file.summary || 'No summary available.'}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap="sm">
          <Button
            onClick={() => handleDownload(file.id)}
            variant="light"
            leftSection={<IconDownload size={16} />}
          >
            Download
          </Button>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => openDeleteModal(file.id, file.fileName)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  if (files.length === 0) {
    return <Text c="dimmed">This folder is empty.</Text>;
  }

  return (
    <Table verticalSpacing="md" striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>AI Summary</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
};

export default FileList;