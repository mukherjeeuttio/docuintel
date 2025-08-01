import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../services/apiClient';

const FileUpload = ({ onUploadSuccess }) => {
  const onDrop = useCallback(acceptedFiles => {
    acceptedFiles.forEach(file => {
      const formData = new FormData();
      formData.append('file', file);
      uploadFile(formData).then(() => {
        console.log(`${file.name} uploaded`);
        setTimeout(onUploadSuccess, 2500); // Wait for backend processing
      });
    });
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      <p>Drag 'n' drop files here, or click to select files</p>
    </div>
  );
};

export default FileUpload;