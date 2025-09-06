import { useMemo, useState } from "react";
import { Plus, Upload, Folder as FolderIcon } from "lucide-react";
import { useUiCommands } from "@/contexts/ui/useUiCommands";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/useMobile";

export default function GlobalFab() {
  const [open, setOpen] = useState(false);
  const { openCreateFolder, openUpload } = useUiCommands();
  const isMobile = useIsMobile();

  const container = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.body;
  }, []);

  if (!container || !isMobile) return null;

  return createPortal(
    <div
      className="fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-[9999]"
      style={{ paddingRight: 'env(safe-area-inset-right)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {open && (
        <div className="mb-3 flex flex-col items-end gap-2">
          <button
            onClick={() => {
              openUpload?.();
              setOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-background border border-border px-3 py-2 text-sm shadow-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Upload className="h-4 w-4" /> Uploader un fichier
          </button>
          <button
            onClick={() => {
              openCreateFolder?.();
              setOpen(false);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-background border border-border px-3 py-2 text-sm shadow-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <FolderIcon className="h-4 w-4" /> Nouveau dossier
          </button>
        </div>
      )}
      <button
        aria-label="Actions rapides"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-primary/40"
      >
        <Plus className={`h-6 w-6 transition-transform ${open ? 'rotate-45' : ''}`} />
      </button>
    </div>,
    container
  );
}
