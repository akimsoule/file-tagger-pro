import React, { useState, useCallback } from 'react';
import { UiCommandContext, type UiCommandContextValue, type VoidFn } from './context';

export function UiCommandProvider({ children }: { children: React.ReactNode }) {
  const [openUpload, setOpenUploadState] = useState<VoidFn>(undefined);
  const [openCreateFolder, setOpenCreateFolderState] = useState<VoidFn>(undefined);
  const [openSettings, setOpenSettingsState] = useState<VoidFn>(undefined);

  const setOpenUpload = useCallback((fn: VoidFn) => setOpenUploadState(() => fn), []);
  const setOpenCreateFolder = useCallback((fn: VoidFn) => setOpenCreateFolderState(() => fn), []);
  const setOpenSettings = useCallback((fn: VoidFn) => setOpenSettingsState(() => fn), []);

  return (
    <UiCommandContext.Provider value={{ openUpload, openCreateFolder, openSettings, setOpenUpload, setOpenCreateFolder, setOpenSettings }}>
      {children}
    </UiCommandContext.Provider>
  );
}

// Types moved to ./context
// Hook moved to a separate file to keep Fast Refresh happy
