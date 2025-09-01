import { User, Document, Folder } from '@/contexts/file-context-def';

export const mockUser: User = {
  id: '1',
  email: 'user@example.com',
  name: 'John Doe',
  documents: [],
  folders: []
};

export const mockFolders: Folder[] = [
  {
    id: '1',
    name: 'Documents Importants',
    description: 'Dossier pour les documents importants',
    color: '#3B82F6',
    ownerId: mockUser.id,
    children: [],
    documents: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Photos',
    description: 'Album photos',
    color: '#EC4899',
    ownerId: mockUser.id,
    children: [],
    documents: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Presentation Q4.pptx',
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    size: 2048576,
    description: 'Présentation du Q4 2024',
    tags: 'important,work',
    fileId: 'mega-file-id-1',
    hash: 'hash1',
    ownerId: mockUser.id,
    folderId: mockFolders[0].id,
    isFavorite: true,
    createdAt: new Date('2024-01-15'),
    modifiedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    name: 'Rapport Financier 2024.pdf',
    type: 'application/pdf',
    size: 1536000,
    description: 'Rapport financier annuel',
    tags: 'important,finance',
    fileId: 'mega-file-id-2',
    hash: 'hash2',
    ownerId: mockUser.id,
    folderId: mockFolders[0].id,
    isFavorite: true,
    createdAt: new Date('2024-01-10'),
    modifiedAt: new Date('2024-01-10')
  },
  {
    id: '3',
    name: 'Photo Vacances.jpg',
    type: 'image/jpeg',
    size: 512000,
    description: 'Photos des vacances d\'été',
    tags: 'photos,vacances',
    fileId: 'mega-file-id-3',
    hash: 'hash3',
    ownerId: mockUser.id,
    folderId: mockFolders[1].id,
    isFavorite: false,
    createdAt: new Date('2024-01-08'),
    modifiedAt: new Date('2024-01-08')
  },
  {
    id: '4',
    name: 'Notes de réunion.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 512000,
    description: 'Notes de la réunion mensuelle',
    tags: 'work,notes',
    fileId: 'mega-file-id-4',
    hash: 'hash4',
    ownerId: mockUser.id,
    isFavorite: false,
    createdAt: new Date('2024-01-08'),
    modifiedAt: new Date('2024-01-08')
  }
];