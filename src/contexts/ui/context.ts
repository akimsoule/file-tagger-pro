import { createContext } from 'react';

export type VoidFn = (() => void) | undefined;

export interface UiCommandContextValue {
  openUpload: VoidFn;
  openCreateFolder: VoidFn;
  setOpenUpload: (fn: VoidFn) => void;
  setOpenCreateFolder: (fn: VoidFn) => void;
}

export const UiCommandContext = createContext<UiCommandContextValue | undefined>(undefined);
