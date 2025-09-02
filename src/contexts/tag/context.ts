import { createContext } from 'react';
import type { TagContextType } from './def';

export const TagContext = createContext<TagContextType>(null!);
