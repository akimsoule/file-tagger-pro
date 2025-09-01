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
import { TagBadge } from './TagBadge';
import { mockTags } from '@/data/mockData';
import { Files, Heart, Hash, Plus, Settings } from 'lucide-react';

const navigationItems = [
  { title: 'Tous les fichiers', url: '/', icon: Files },
  { title: 'Favoris', url: '/favorites', icon: Heart },
];

export function FileManagerSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const isActive = (path: string) => location.pathname === path;

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
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

        {/* Section Tags */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Hash className="h-3 w-3" />
              {open && 'Tags'}
            </span>
            {open && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-accent"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1">
              {mockTags.map((tag) => (
                <div
                  key={tag.id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => toggleTag(tag.id)}
                >
                  {open ? (
                    <>
                      <TagBadge tag={tag} />
                      <span className="text-xs text-muted-foreground ml-auto">
                        {tag.count}
                      </span>
                    </>
                  ) : (
                    <div className={`w-3 h-3 rounded-full bg-tag-${tag.color}`} />
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