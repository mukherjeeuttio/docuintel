const FolderList = ({ folders, selectedFolderId, onSelectFolder }) => {
  return (
    <div className="folder-list">
      <h3>Folders</h3>
      <ul>
        {folders.map(folder => (
          <li
            key={folder.id}
            className={folder.id === selectedFolderId ? 'selected' : ''}
            onClick={() => onSelectFolder(folder)}
          >
            {folder.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FolderList;