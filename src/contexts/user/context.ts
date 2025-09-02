import { createContext } from 'react';
import type { UserContextType } from './def';

export const UserContext = createContext<UserContextType>(null!);
