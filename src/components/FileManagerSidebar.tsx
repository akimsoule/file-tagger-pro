import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
import { Files, Heart, Hash, Settings, LogOut } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useTags } from '@/hooks/useTags';
import { useFileContext } from '@/hooks/useFileContext';
import { useUiCommands } from '@/contexts/ui/useUiCommands';

import { FileTreeNode } from "@/logic/local/FileTreeNode";

interface FileManagerSidebarProps {
  onNavigateToFolder?: (node: FileTreeNode) => void;
  currentNode?: FileTreeNode | null;
}

const navigationItems = [
  { title: 'Root', url: '/', icon: Files, isRoot: true },
  { title: 'Favoris', url: '/favorites', icon: Heart },
];

export function FileManagerSidebar({ onNavigateToFolder, currentNode }: FileManagerSidebarProps) {
  const { open } = useSidebar();
  const location = useLocation();
  const { toggleTagSelection: toggleTag, selectedTags, tags: allTags } = useTags();
  const { currentNode: activeNode, getTagCount, setCurrentNode } = useFileContext();
  const { logout, session } = useUser();
  const { openSettings } = useUiCommands();

  const rootNodes: FileTreeNode[] = activeNode
    ? ((activeNode.parent ? (activeNode.parent as FileTreeNode) : activeNode).children as FileTreeNode[])
    : [];
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="px-2 flex flex-col">
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
                      onClick={() => {
                        if (item.isRoot) {
                          setCurrentNode(null);
                        }
                      }}
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

        {/* Footer: Paramètres + Déconnexion */}
        <div className="mt-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => openSettings?.()}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      {open && <span>Paramètres</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={async () => { await logout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" />
                      {open && <span>Déconnexion</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {open && session.user && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">{session.user.email}</div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}