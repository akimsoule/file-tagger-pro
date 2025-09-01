import { useState, useMemo } from 'react';
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
import { TagBadge } from './TagBadge';
import { useFiles } from '@/hooks/use-files';
import { Files, Heart, Hash, Settings } from 'lucide-react';

// Fonction pour générer une couleur stable pour un tag
const getTagColor = (tag: string): string => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

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
  const { documents, toggleTag, selectedTags } = useFiles();

  const isActive = (path: string) => location.pathname === path;

  // Extraire tous les tags uniques des documents
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    documents.forEach(doc => {
      doc.tags.split(',').forEach(tag => {
        const trimmedTag = tag.trim();
        if (trimmedTag) tagSet.add(trimmedTag);
      });
    });
    return Array.from(tagSet);
  }, [documents]);

  // Calculer le nombre de documents par tag
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allTags.forEach(tag => {
      const count = documents.filter(doc => doc.tags.includes(tag)).length;
      counts.set(tag, count);
    });
    return counts;
  }, [allTags, documents]);

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

        {/* Section Tags */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Hash className="h-3 w-3" />
              {open && 'Tags'}
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1">
              {allTags.map((tag) => (
                <div
                  key={tag}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {open ? (
                    <>
                      <TagBadge name={tag} />
                      <span className="text-xs text-muted-foreground ml-auto">
                        {tagCounts.get(tag)}
                      </span>
                    </>
                  ) : (
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getTagColor(tag) + '40' }} />
                  )}
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bouton paramètres */}
        <div className="mt-auto p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
          >
            <Settings className="h-4 w-4" />
            {open && <span className="ml-2">Paramètres</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}