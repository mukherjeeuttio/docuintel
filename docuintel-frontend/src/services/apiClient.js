import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
});

// --- Folder Functions ---
export const getFolders = () => apiClient.get('/folders');
export const getFilesByFolder = (folderId) => apiClient.get(`/folders/${folderId}/files`);
export const createFolder = (folderData) => apiClient.post('/folders', folderData);

// --- File Functions ---
export const uploadFile = (formData, onUploadProgress) => {
  return apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
};

export const deleteFile = (fileId) => apiClient.delete(`/files/${fileId}`);
export const getFileViewUrl = (fileId) => apiClient.get(`/files/${fileId}/view-url`);
export const getUnassignedFiles = () => apiClient.get('/files/unassigned');
export const generateAISummary = (fileId) => apiClient.post(`/files/${fileId}/generate-summary`);

export const deleteFolder = (folderId) => apiClient.delete(`/folders/${folderId}`);