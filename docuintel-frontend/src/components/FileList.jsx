import { getFileViewUrl, deleteFile } from '../services/apiClient';

const FileList = ({ files, onFileDeleted }) => {
  const handleView = async (fileId) => {
    const response = await getFileViewUrl(fileId);
    window.open(response.data, '_blank');
  };

  const handleDelete = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      await deleteFile(fileId);
      onFileDeleted(); // Refresh the list
    }
  };

  return (
    <div className="file-list">
      <h3>Files</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Summary</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.id}>
              <td>{file.fileName}</td>
              <td>{file.summary || 'N/A'}</td>
              <td>
                <button onClick={() => handleView(file.id)}>View</button>
                <button onClick={() => handleView(file.id)} style={{margin: '0 5px'}}>Download</button>
                <button onClick={() => handleDelete(file.id)} className="delete">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileList;