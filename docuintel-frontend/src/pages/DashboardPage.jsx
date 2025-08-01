// In src/pages/DashboardPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { getFolders, getFilesByFolder } from '../services/apiClient';
import FolderList from '../components/FolderList';
import FileList from '../components/FileList';
import FileUpload from '../components/FileUpload';

const DashboardPage = () => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);

  const fetchAllFolders = useCallback(() => {
    getFolders().then(res => setFolders(res.data));
  }, []);

  const fetchFiles = useCallback(() => {
    if (selectedFolder) {
      getFilesByFolder(selectedFolder.id).then(res => setFiles(res.data));
    }
  }, [selectedFolder]);

  useEffect(() => {
    fetchAllFolders();
  }, [fetchAllFolders]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSelectFolder = (folder) => {
    setSelectedFolder(folder);
  };
  
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <FolderList
          folders={folders}
          selectedFolderId={selectedFolder?.id}
          onSelectFolder={handleSelectFolder}
        />
      </div>
      <div className="main-content">
        <h1>DocuIntel Dashboard</h1>
        <FileUpload onUploadSuccess={fetchAllFolders} />
        {selectedFolder && <FileList files={files} onFileDeleted={fetchFiles} />}
      </div>
    </div>
  );
};

export default DashboardPage;