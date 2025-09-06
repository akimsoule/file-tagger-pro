import { User } from '../contexts/user/def';
import { Document, Folder } from '../contexts/file';

export const mockUser: User = {
  id: '1',
  email: 'user@example.com',
  name: 'John Doe',
  role: 'user',
  preferences: {
    theme: 'light',
    language: 'fr'
  },
  documents: [],
  folders: []
};

// Fonction utilitaire pour créer un document
const createDocument = (
  id: string,
  name: string,
  type: string,
  size: number,
  description: string,
  tags: string,
  folderId: string | undefined,
  isFavorite: boolean = false
): Document => ({
  id,
  name,
  type,
  size,
  description,
  tags,
  fileId: `mega-file-id-${id}`,
  hash: `hash${id}`,
  ownerId: mockUser.id,
  folderId,
  isFavorite,
  createdAt: new Date('2024-01-01'),
  modifiedAt: new Date('2024-01-01')
});

// Fonction utilitaire pour créer un dossier
const createFolder = (
  id: string,
  name: string,
  description: string,
  color: string,
  tags: string,
  parentId?: string
): Folder => ({
  id,
  name,
  description,
  color,
  ownerId: mockUser.id,
  parentId,
  children: [],
  documents: [],
  tags,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
});

export const mockFolders: Folder[] = [
  // Top-level (like macOS/Windows user home)
  createFolder('f-desktop', 'Desktop', 'Your desktop items', '#3B82F6', 'desktop,system'),
  createFolder('f-documents', 'Documents', 'Personal documents', '#10B981', 'documents,personal'),
  createFolder('f-downloads', 'Downloads', 'Downloaded files', '#F59E0B', 'downloads,system'),
  createFolder('f-pictures', 'Pictures', 'Your pictures and photos', '#EC4899', 'pictures,photos'),
  createFolder('f-music', 'Music', 'Your music library', '#8B5CF6', 'music,audio'),
  createFolder('f-videos', 'Videos', 'Videos and movies', '#60A5FA', 'videos,movies'),

  // Documents subfolders
  createFolder('f-work', 'Work', 'Work-related documents', '#10B981', 'work,documents', 'f-documents'),
  createFolder('f-finance', 'Finance', 'Budgets and invoices', '#6B7280', 'finance,documents', 'f-documents'),
  createFolder('f-personal', 'Personal', 'Personal notes', '#D946EF', 'personal,documents', 'f-documents'),

  // Pictures subfolders
  createFolder('f-screenshots', 'Screenshots', 'Captured screenshots', '#60A5FA', 'pictures,screenshots', 'f-pictures'),
  createFolder('f-wallpapers', 'Wallpapers', 'Desktop backgrounds', '#EC4899', 'pictures,wallpapers', 'f-pictures'),

  // Downloads subfolders
  createFolder('f-installers', 'Installers', 'Downloaded installers', '#F59E0B', 'downloads,installers', 'f-downloads'),
  createFolder('f-archives', 'Archives', 'Compressed files', '#6B7280', 'downloads,archives', 'f-downloads'),

  // Music subfolders
  createFolder('f-playlists', 'Playlists', 'Favorite playlists', '#8B5CF6', 'music,playlists', 'f-music'),

  // Videos subfolders
  createFolder('f-tutorials', 'Tutorials', 'Learning videos', '#60A5FA', 'videos,tutorials', 'f-videos'),
];

export const mockDocuments: Document[] = [
  // Desktop
  createDocument('doc-1', 'Resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 128_000, 'My latest resume', 'desktop,work,personal', 'f-desktop', true),
  createDocument('doc-2', 'Project Shortcut.webloc', 'application/octet-stream', 1_024, 'Shortcut to project site', 'desktop,system', 'f-desktop'),

  // Documents / Work
  createDocument('doc-3', 'Quarterly Report Q2.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 512_000, 'Financial report for Q2', 'work,finance,documents', 'f-work', true),
  createDocument('doc-4', 'Team Presentation.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 2_048_000, 'Slides for team meeting', 'work,documents,presentation', 'f-work'),
  createDocument('doc-5', 'API Spec.pdf', 'application/pdf', 1_024_000, 'Backend API specification', 'work,documents,tech', 'f-work'),

  // Documents / Finance
  createDocument('doc-6', 'Invoices_2025.zip', 'application/zip', 3_145_728, 'All invoices 2025', 'finance,archives,documents', 'f-finance'),
  createDocument('doc-7', 'Tax_Return_2024.pdf', 'application/pdf', 980_000, 'Tax return 2024', 'finance,tax,documents', 'f-finance', true),

  // Documents / Personal
  createDocument('doc-8', 'Grocery List.txt', 'text/plain', 2_048, 'Weekly grocery list', 'personal,notes,documents', 'f-personal'),
  createDocument('doc-9', 'TravelPlan.md', 'text/markdown', 6_144, 'Summer travel plan', 'personal,travel,documents', 'f-personal'),

  // Pictures
  createDocument('doc-10', 'IMG_1001.jpg', 'image/jpeg', 2_621_440, 'Photo from weekend trip', 'pictures,photos', 'f-pictures', true),
  createDocument('doc-11', 'Screenshot 2025-09-01 at 10.32.11.png', 'image/png', 1_572_864, 'Desktop screenshot', 'pictures,screenshots', 'f-screenshots'),
  createDocument('doc-12', 'Sunset-4K.jpg', 'image/jpeg', 3_670_016, 'Wallpaper image', 'pictures,wallpapers,desktop', 'f-wallpapers'),

  // Downloads
  createDocument('doc-13', 'Setup-Tool-1.2.3.dmg', 'application/x-apple-diskimage', 85_000_000, 'macOS installer', 'downloads,installers,mac', 'f-installers'),
  createDocument('doc-14', 'VSCodeUserSetup-x64-1.92.0.exe', 'application/x-msdownload', 95_000_000, 'Windows installer', 'downloads,installers,windows', 'f-installers'),
  createDocument('doc-15', 'dataset.json', 'application/json', 4_194_304, 'Sample JSON dataset', 'downloads,data', 'f-downloads'),
  createDocument('doc-16', 'project-backup.zip', 'application/zip', 25_165_824, 'Zipped backup', 'downloads,archives,backup', 'f-archives'),

  // Music
  createDocument('doc-17', 'Favorite Song.mp3', 'audio/mpeg', 6_291_456, 'An MP3 track', 'music,audio', 'f-music'),

  // Videos
  createDocument('doc-18', 'Tutorial React Hooks.mp4', 'video/mp4', 150_000_000, 'React Hooks tutorial', 'videos,tutorials,dev', 'f-tutorials')
];
