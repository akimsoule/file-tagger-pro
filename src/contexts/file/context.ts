import { createContext } from 'react';
import type { FileContextType } from './def';

export const FileContext = createContext<FileContextType>(null!);
