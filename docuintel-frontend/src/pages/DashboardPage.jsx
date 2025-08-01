import { useState, useEffect, useCallback } from 'react';
import * as apiClient from '../services/apiClient';
import FileList from '../components/FileList';
import FileUpload from '../components/FileUpload';

import { 
  AppShell, 
  NavLink, 
  Text, 
  Title, 
  Group, 
  Box, 
  Button, 
  TextInput, 
  Burger, 
  ActionIcon,
  Divider,
  Badge,
  Stack,
  Paper,
  Container
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { 
  IconHome, 
  IconFolder, 
  IconFolderPlus, 
  IconTrash, 
  IconBrain,
  IconUpload,
  IconFiles
} from '@tabler/icons-react';

const DashboardPage = () => {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [folders, setFolders] = useState([]);
  const [activeFiles, setActiveFiles] = useState([]); // This will hold the files to be displayed
  const [selectedView, setSelectedView] = useState({ type: 'home' }); // Tracks what is selected: 'home' or 'folder'
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const fetchAllFolders = useCallback(() => {
    apiClient.getFolders().then(res => {
      const foldersWithCounts = res.data.map(folder => ({
        ...folder,
        fileCount: 0 // Initialize count, will be updated
      }));
      setFolders(foldersWithCounts);
      
      // Fetch file counts for each folder
      foldersWithCounts.forEach(folder => {
        apiClient.getFilesByFolder(folder.id).then(filesRes => {
          setFolders(prev => prev.map(f => 
            f.id === folder.id ? { ...f, fileCount: filesRes.data.length } : f
          ));
        }).catch(() => {
          // If error, keep count as 0
        });
      });
    });
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
  
  const handleUploadComplete = (wasUploadToSpecificFolder, uploadedFiles = []) => {
    if (wasUploadToSpecificFolder) {
      // Files uploaded directly to a specific folder - no AI processing needed
      notifications.show({
        title: 'Upload Successful',
        message: `${uploadedFiles.length} file(s) uploaded directly to the selected folder.`,
        color: 'green',
        autoClose: 3000,
      });

      // Refresh data immediately
      fetchFiles();
      fetchAllFolders();
    } else {
      // Files uploaded to unassigned area - AI processing will happen
      notifications.show({
        title: 'Upload Successful',
        message: `${uploadedFiles.length} file(s) uploaded successfully. AI is now processing...`,
        color: 'green',
        autoClose: 3000,
      });

      // Refresh data without page reload
      fetchFiles();
      fetchAllFolders();

      // Show AI processing notification after a brief delay
      setTimeout(() => {
        notifications.show({
          id: 'ai-processing',
          title: 'AI Processing',
          message: 'Your files are being analyzed and categorized. Check back in a few moments to see the results.',
          color: 'blue',
          autoClose: false,
          loading: true,
        });
      }, 1000);

      // Check for processing completion and show result
      setTimeout(() => {
        checkFileProcessingStatus(uploadedFiles);
      }, 5000);
    }
  };

  const checkFileProcessingStatus = async (uploadedFiles) => {
    try {
      // Wait a bit longer for AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh data to get latest file assignments
      await fetchFiles();
      await fetchAllFolders();
      
      notifications.hide('ai-processing');
      
      // Try to determine where files ended up
      let assignmentMessage = 'Your files have been analyzed and automatically organized.';
      
      if (uploadedFiles.length === 1) {
        // For single file, try to find where it went
        try {
          const allFolders = await apiClient.getFolders();
          const fileFound = await Promise.all(
            allFolders.data.map(async folder => {
              const folderFiles = await apiClient.getFilesByFolder(folder.id);
              const foundFile = folderFiles.data.find(f => 
                uploadedFiles.some(uf => uf.fileName === f.fileName)
              );
              return foundFile ? { folder: folder.name, file: foundFile } : null;
            })
          );
          
          const foundAssignment = fileFound.find(f => f !== null);
          if (foundAssignment) {
            assignmentMessage = `"${foundAssignment.file.fileName}" has been categorized into the "${foundAssignment.folder}" folder.`;
          }
        } catch (error) {
          console.log('Could not determine file assignment:', error);
        }
      }
      
      notifications.show({
        title: 'AI Processing Complete',
        message: assignmentMessage,
        color: 'green',
        autoClose: 6000,
      });
      
    } catch (error) {
      notifications.hide('ai-processing');
      notifications.show({
        title: 'Processing Status Unknown',
        message: 'Files uploaded but processing status unclear. Please refresh to see updates.',
        color: 'yellow',
        autoClose: 3000,
      });
    }
  };

  const handleFileDeleted = () => {
    // Just refresh the file list without showing upload message
    fetchFiles();
    fetchAllFolders(); // Also refresh folders in case file counts changed
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 320, breakpoint: 'sm', collapsed: { mobile: !mobileOpened } }}
      padding="md"
      bg="gray.0"
    >
      <AppShell.Header 
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" color="white" />
            <Group gap="xs">
              <IconBrain size={28} color="white" />
              <Title order={2} c="white" fw={700}>DocuIntel</Title>
            </Group>
          </Group>
          <Badge 
            variant="light" 
            color="white" 
            size="lg"
            leftSection={<IconFiles size={14} />}
          >
            AI-Powered Document Management
          </Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" bg="white" style={{ borderRight: '1px solid #e9ecef' }}>
        <Stack gap="md">
          <Paper p="md" radius="md" withBorder>
            <NavLink
              label="Home"
              description="View unassigned files"
              leftSection={<IconHome size="1.2rem" stroke={1.5} />}
              active={selectedView.type === 'home'}
              onClick={handleSelectHome}
              variant="light"
              style={{ borderRadius: '8px' }}
            />
          </Paper>

          <Divider label="Folders" labelPosition="center" />

          <Stack gap="xs">
            {folders.map(folder => (
              <Paper key={folder.id} p="xs" radius="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <NavLink
                    label={folder.name}
                    description={`${folder.fileCount || 0} file(s)`}
                    leftSection={<IconFolder size="1.2rem" stroke={1.5} />}
                    active={selectedView.id === folder.id}
                    onClick={() => handleSelectFolder(folder)}
                    style={{ flex: 1 }}
                    variant="light"
                  />
                  <ActionIcon 
                    variant="subtle" 
                    color="red" 
                    onClick={() => handleDeleteFolder(folder.id, folder.name)}
                    size="sm"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main style={{ overflow: 'auto', height: 'calc(100vh - 70px)' }}>
        <Container size="xl" p="xs" style={{ minHeight: '100%' }}>
          <Group gap="lg" align="flex-start" style={{ 
            minHeight: 'calc(100vh - 140px)',
            flexWrap: 'wrap'
          }}>
            {/* Upload Section */}
            <Paper 
              p="lg" 
              radius="lg" 
              withBorder 
              bg="white" 
              shadow="sm" 
              style={{ 
                flex: '0 0 400px',
                minWidth: '300px',
                maxWidth: '100%'
              }}
            >
              <Group mb="md">
                <IconUpload size={20} color="var(--mantine-color-blue-6)" />
                <Title order={4}>Upload Documents</Title>
              </Group>
              <FileUpload
                selectedFolderId={selectedView.type === 'folder' ? selectedView.id : null}
                onUploadSuccess={handleUploadComplete}
              />
              
              {/* Create New Folder Card */}
              <Paper p="md" radius="md" withBorder bg="blue.0" mt="md">
                <Text fw={600} mb="sm" size="sm" c="blue.7">Create New Folder</Text>
                <form onSubmit={handleCreateFolder}>
                  <Stack gap="sm">
                    <TextInput
                      placeholder="Enter folder name..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      leftSection={<IconFolderPlus size="1rem" />}
                      radius="md"
                      size="sm"
                    />
                    <Button 
                      type="submit" 
                      loading={isCreatingFolder}
                      leftSection={<IconFolderPlus size="1rem" />}
                      fullWidth
                      radius="md"
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'cyan' }}
                      size="sm"
                    >
                      Create Folder
                    </Button>
                  </Stack>
                </form>
              </Paper>
            </Paper>

            {/* Content Section */}
            <Paper 
              p="lg" 
              radius="lg" 
              withBorder 
              bg="white" 
              shadow="sm" 
              style={{ 
                flex: 1,
                minWidth: '300px',
                minHeight: '500px'
              }}
            >
              <Group mb="md" justify="space-between" align="center" wrap="wrap">
                <Group>
                  <IconFiles size={20} color="var(--mantine-color-blue-6)" />
                  <Title order={4}>
                    {selectedView.type === 'home' ? 'Unassigned Files' : selectedView.name}
                  </Title>
                </Group>
                <Badge 
                  variant="light" 
                  color="blue" 
                  size="md"
                  leftSection={<IconBrain size={12} />}
                >
                  {activeFiles.length} file(s)
                </Badge>
              </Group>
              
              <div style={{ 
                height: 'calc(100vh - 280px)', 
                minHeight: '400px',
                overflow: 'auto' 
              }}>
                <FileList files={activeFiles} onFileDeleted={handleFileDeleted} />
              </div>
            </Paper>
          </Group>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};

export default DashboardPage;