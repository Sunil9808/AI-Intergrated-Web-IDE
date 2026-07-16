import { useState } from 'react';
import { File, Folder, FolderOpen, GitBranch, Settings } from 'lucide-react';
import { getFallbackIconMeta, getMaterialIconUrl } from '../../utils/materialFileIcons';

interface FileTypeIconProps {
  filename: string;
  isDirectory?: boolean;
  isOpen?: boolean;
  size?: number;
  className?: string;
}

export default function FileTypeIcon({
  filename,
  isDirectory = false,
  isOpen = false,
  size = 16,
  className = '',
}: FileTypeIconProps) {
  const [failed, setFailed] = useState(false);
  const iconUrl = getMaterialIconUrl(filename, isDirectory, isOpen);

  if (failed) {
    if (isDirectory) {
      const FolderIcon = isOpen ? FolderOpen : Folder;
      return (
        <FolderIcon
          size={size}
          className={`flex-shrink-0 ${className}`}
          style={{ color: '#dcb67a' }}
          strokeWidth={1.75}
        />
      );
    }

    const lower = filename.toLowerCase();
    const meta = getFallbackIconMeta(filename, isDirectory);
    if (lower.startsWith('.env')) {
      return <Settings size={size} className={`flex-shrink-0 ${className}`} style={{ color: meta.color }} strokeWidth={2} />;
    }
    if (lower.startsWith('.git')) {
      return <GitBranch size={size} className={`flex-shrink-0 ${className}`} style={{ color: meta.color }} strokeWidth={2} />;
    }
    if (meta.label) {
      return (
        <span
          className={`flex flex-shrink-0 items-center justify-center font-bold leading-none ${className}`}
          style={{
            width: size,
            height: size,
            color: meta.color,
            fontSize: Math.max(8, Math.floor(size * 0.48)),
            letterSpacing: 0,
          }}
          aria-hidden="true"
        >
          {meta.label}
        </span>
      );
    }

    return (
      <File
        size={size}
        className={`flex-shrink-0 ${className}`}
        style={{ color: meta.color }}
        strokeWidth={1.75}
      />
    );
  }

  return (
    <img
      src={iconUrl}
      alt=""
      width={size}
      height={size}
      className={`flex-shrink-0 ${className}`}
      style={{ objectFit: 'contain' }}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
