// In src/pages/DashboardPage.jsx
import { useState, useEffect, useCallback } from 'react';
import * as apiClient from '../services/apiClient';
import FileList from '../components/FileList';
import FileUpload from '../components/FileUpload';

import { AppShell, NavLink, Text, Title, Group, Box, Button, TextInput, Burger, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { IconHome, IconFolder, IconFolderPlus, IconTrash } from '@tabler/icons-react';

const DashboardPage = () => {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [folders, setFolders] = useState([]);
  const [activeFiles, setActiveFiles] = useState([]); // This will hold the files to be displayed
  const [selectedView, setSelectedView] = useState({ type: 'home' }); // Tracks what is selected: 'home' or 'folder'
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const fetchAllFolders = useCallback(() => {
    apiClient.getFolders().then(res => setFolders(res.data));
  }, []);

  const fetchFiles = useCallback(() => {
    if (selectedView.type === 'home') {
      apiClient.getUnassignedFiles().then(res => setActiveFiles(res.data));
    } else if (selectedView.type === 'folder' && selectedView.id) {
      apiClient.getFilesByFolder(selectedView.id).then(res => setActiveFiles(res.data));
    }
  }, [selectedView]);

  useEffect(() => {
    fetchAllFolders();
  }, [fetchAllFolders]);

  useEffect(() => {
    // This effect now fetches files based on the selected view
    fetchFiles();
  }, [selectedView, folders, fetchFiles]); // Re-fetch when view or folders change

  const handleSelectHome = () => {
    setSelectedView({ type: 'home' });
  };

  const handleSelectFolder = (folder) => {
    setSelectedView({ type: 'folder', id: folder.id, name: folder.name });
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Folder name cannot be empty',
        color: 'red'
      });
      return;
    }

    setIsCreatingFolder(true);
    try {
      await apiClient.createFolder({ name: newFolderName.trim() });
      setNewFolderName('');
      fetchAllFolders();
      notifications.show({
        title: 'Success',
        message: 'Folder created successfully',
        color: 'green'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create folder',
        color: 'red'
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = (folderId, folderName) => {
    modals.openConfirmModal({
      title: `Delete Folder: ${folderName}`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this folder? All files inside it will also be permanently deleted. This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete Folder and All Files', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await apiClient.deleteFolder(folderId);
          notifications.show({ title: 'Success', message: 'Folder deleted.', color: 'green' });
          // If the deleted folder was the one being viewed, go back to home
          if(selectedView.id === folderId) {
            handleSelectHome();
          }
          fetchAllFolders(); // Refresh folder list
        } catch (error) {
          notifications.show({ title: 'Error', message: 'Failed to delete folder.', color: 'red' });
        }
      },
    });
  };
  
  const handleUploadComplete = (wasUploadToSpecificFolder) => {
    notifications.show({
      title: 'Upload in Progress',
      message: 'Your file has been sent to the server and is now being processed by the AI.',
      color: 'blue',
      autoClose: 5000,
    });

    // We need to refresh the UI. The safest way is to refresh everything.
    // The delay gives the backend a moment to create the new folder if needed.
    setTimeout(() => {
      fetchAllFolders();
      // If we were in a specific folder, re-fetch its files. Otherwise, fetch unassigned.
      if (wasUploadToSpecificFolder) {
        fetchFiles();
      } else {
        // This logic is now inside the useEffect, so just updating the view state works.
        setSelectedView({ type: 'home' });
      }
    }, 3000); // 3 second delay
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !mobileOpened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
          <Title order={3}>DocuIntel</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          label="Home"
          leftSection={<IconHome size="1rem" stroke={1.5} />}
          active={selectedView.type === 'home'}
          onClick={handleSelectHome}
        />
        <Text fw={700} mt="md" mb="sm">Folders</Text>
        {folders.map(folder => (
          <Group key={folder.id} justify="space-between" wrap="nowrap">
            <NavLink
              label={folder.name}
              leftSection={<IconFolder size="1rem" stroke={1.5} />}
              active={selectedView.id === folder.id}
              onClick={() => handleSelectFolder(folder)}
              style={{ flex: 1 }}
            />
            <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteFolder(folder.id, folder.name)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        
        {/* Create Folder form */}
        <Box mt="xl">
          <Text fw={700} mb="sm">Create New Folder</Text>
          <form onSubmit={handleCreateFolder}>
            <Group>
              <TextInput
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button 
                type="submit" 
                loading={isCreatingFolder}
                leftSection={<IconFolderPlus size="1rem" />}
              >
                Create
              </Button>
            </Group>
          </form>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        <FileUpload
          selectedFolderId={selectedView.type === 'folder' ? selectedView.id : null}
          onUploadSuccess={handleUploadComplete}
        />
        <Title order={2} mb="lg">
          {selectedView.type === 'home' ? 'Home (Unassigned Files)' : selectedView.name}
        </Title>
        <FileList files={activeFiles} onFileDeleted={handleUploadComplete} />
      </AppShell.Main>
    </AppShell>
  );
};

export default DashboardPage;