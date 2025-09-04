import { User } from '../contexts/user/def';
import { Document, Folder } from '../contexts/file/def';

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
  // Dossiers racine
  createFolder('1', 'Documents Importants', 'Dossier pour les documents importants', '#3B82F6', 'important,work'),
  createFolder('2', 'Photos', 'Album photos', '#EC4899', 'photos'),
  createFolder('3', 'Projets', 'Tous les projets en cours', '#10B981', 'work,projet'),
  createFolder('10', 'Archives', 'Documents archivés', '#6B7280', 'archives'),

  // Sous-dossiers de Photos
  createFolder('7', 'Vacances', 'Photos et documents des vacances', '#EC4899', 'photos,vacances', '2'),
  createFolder('8', 'Été', 'Vacances d\'été', '#F59E0B', 'photos,vacances,été', '7'),
  createFolder('9', 'Hiver', 'Vacances d\'hiver', '#60A5FA', 'photos,vacances,hiver', '7'),

  // Sous-dossiers de Projets
  createFolder('4', 'Projet A', 'Premier projet', '#10B981', 'work,projet', '3'),
  createFolder('5', 'Documentation', 'Documentation du projet', '#8B5CF6', 'work,projet,docs', '4'),
  createFolder('6', 'UI Design', 'Design de l\'interface', '#EC4899', 'work,projet,design', '4')
];

export const mockDocuments: Document[] = [
  // Documents du dossier "Documents Importants"
  createDocument(
    '1',
    'Contrat de travail.pdf',
    'application/pdf',
    524288,
    'Mon contrat de travail',
    'important,work',
    '1',
    true
  ),
  createDocument(
    '2',
    'Passeport.jpg',
    'image/jpeg',
    1048576,
    'Scan du passeport',
    'important,documents',
    '1'
  ),

  // Documents du dossier "Photos"
  createDocument(
    '3',
    'Photo de profil.jpg',
    'image/jpeg',
    262144,
    'Photo de profil pour les réseaux sociaux',
    'photos,perso',
    '2',
    true
  ),

  // Documents du dossier "Hiver" (sous-dossier de Photos/Vacances)
  createDocument(
    '4',
    'Vacances au ski.jpg',
    'image/jpeg',
    2097152,
    'Photos des vacances au ski',
    'photos,vacances,hiver',
    '9'
  ),

  // Documents du dossier "Documentation" (sous-dossier de Projets/Projet A)
  createDocument(
    '5',
    'Spécifications Techniques v1.pdf',
    'application/pdf',
    1048576,
    'Document des spécifications techniques',
    'work,projet',
    '5',
    true
  ),
  createDocument(
    '6',
    'Design System.fig',
    'application/figma',
    4194304,
    'Design system du projet',
    'design,work,projet',
    '5',
    true
  ),

  // Documents du dossier "Archives"
  createDocument(
    '7',
    'Budget 2023.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    524288,
    'Budget prévisionnel de l\'année dernière',
    'finance,archives',
    '10'
  ),
  
  // Documents du dossier "Projet A"
  createDocument(
    '8',
    'Notes de réunion.md',
    'text/markdown',
    8192,
    'Notes de la dernière réunion d\'équipe',
    'work,projet',
    '4'
  ),

  // Documents du dossier "Été" (sous-dossier de Photos/Vacances)
  createDocument(
    '9',
    'Photos plage.jpg',
    'image/jpeg',
    3145728,
    'Album photos des vacances d\'été',
    'photos,vacances,été',
    '8',
    true
  )
];
