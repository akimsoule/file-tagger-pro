import { createContext } from 'react';
import type { QueryContextType } from './def';

export const QueryContext = createContext<QueryContextType>(null!);
