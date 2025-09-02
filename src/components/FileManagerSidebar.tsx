import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Folder } from '@/contexts/file/def';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { TagBadge } from './TagBadge';
import { Files, Heart, Hash, Settings, FolderIcon, ChevronRight } from 'lucide-react';
import { useTags } from '@/hooks/useTags';
import { useFileContext } from '@/hooks/useFileContext';

interface FileManagerSidebarProps {
  onNavigateToFolder?: (folderId: string) => void;
  currentFolderId?: string | null;
}

const navigationItems = [
  { title: 'Tous les documents', url: '/', icon: Files },
  { title: 'Favoris', url: '/favorites', icon: Heart },
];

export function FileManagerSidebar({ onNavigateToFolder, currentFolderId }: FileManagerSidebarProps) {
  const { open } = useSidebar();
  const location = useLocation();
  const { toggleTagSelection: toggleTag, selectedTags, tags: allTags, getTagCount } = useTags();
  const { getFolders, getFolderHierarchy, currentFolderId: activeFolder, setCurrentFolderId } = useFileContext();

  const rootFolders = getFolders(null) || [];
  const isActive = (path: string) => location.pathname === path;

  const FolderTreeItem = ({ folder, depth = 0 }: { folder: Folder; depth?: number }) => {
    const subFolders = getFolders(folder.id);
    const hasSubFolders = subFolders && subFolders.length > 0;
    
    return (
      <>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-2 px-3 py-2 text-sm ${
                folder.id === activeFolder
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              }`}
              onClick={() => setCurrentFolderId(folder.id)}
              style={{ paddingLeft: `${(depth + 1) * 0.75}rem` }}
            >
              <FolderIcon className="h-4 w-4" style={{ color: folder.color }} />
              {open && (
                <>
                  <span className="flex-1 truncate text-left">{folder.name}</span>
                  {hasSubFolders && <ChevronRight className="h-4 w-4" />}
                </>
              )}
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {hasSubFolders && subFolders.map((subFolder) => (
          <FolderTreeItem key={subFolder.id} folder={subFolder} depth={depth + 1} />
        ))}
      </>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="px-2">
        {/* Navigation principale */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Section Dossiers */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6">
            <span className="flex items-center gap-2">
              <FolderIcon className="h-3 w-3" />
              {open && 'Dossiers'}
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rootFolders.map((folder) => (
                <FolderTreeItem key={folder.id} folder={folder} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Section Tags */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6">
            <span className="flex items-center gap-2">
              <Hash className="h-3 w-3" />
              {open && 'Tags'}
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allTags.map((tag) => (
                <SidebarMenuItem key={tag.id}>
                  <SidebarMenuButton asChild>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-2 px-3 py-2 text-sm ${
                        selectedTags.includes(tag.id)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                      }`}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <div 
                        className="h-3 w-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: tag.color || '#888' }} 
                      />
                      {open && (
                        <>
                          <span className="flex-1 truncate text-left">{tag.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getTagCount(tag.id)}
                          </span>
                        </>
                      )}
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Section paramètres */}
        <SidebarGroup>
          <SidebarGroupContent className="mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    {open && <span>Paramètres</span>}
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}