import React, { useState, useCallback } from 'react';
import { UiCommandContext, type UiCommandContextValue, type VoidFn } from './context';

export function UiCommandProvider({ children }: { children: React.ReactNode }) {
  const [openUpload, setOpenUploadState] = useState<VoidFn>(undefined);
  const [openCreateFolder, setOpenCreateFolderState] = useState<VoidFn>(undefined);

  const setOpenUpload = useCallback((fn: VoidFn) => setOpenUploadState(() => fn), []);
  const setOpenCreateFolder = useCallback((fn: VoidFn) => setOpenCreateFolderState(() => fn), []);

  return (
    <UiCommandContext.Provider value={{ openUpload, openCreateFolder, setOpenUpload, setOpenCreateFolder }}>
      {children}
    </UiCommandContext.Provider>
  );
}

// Types moved to ./context
// Hook moved to a separate file to keep Fast Refresh happy
