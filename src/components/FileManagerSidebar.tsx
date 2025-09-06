import React, { useCallback, useMemo } from "react";
import { NavLink } from "react-router-dom";
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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Files, Hash, Heart } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useTags } from "@/hooks/useTags";
import { useFileContext } from "@/hooks/useFileContext";
import { useQuery } from "@/hooks/useQuery";
import { useFavoriteNodes } from "@/hooks/useFavoriteNodes";
import clsx from "clsx";
// import { useUiCommands } from '@/contexts/ui/useUiCommands';

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  isRoot?: boolean;
};

const navigationItems: ReadonlyArray<NavItem> = [
  { title: "Root", url: "/", icon: Files, isRoot: true },
] as const;

function navLinkClasses(isActive: boolean) {
  return clsx(
    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:text-foreground hover:bg-accent"
  );
}

export function FileManagerSidebar() {
  const { open } = useSidebar();
  const {
    toggleTagSelection: toggleTag,
    selectedTags,
    tags: allTags,
  } = useTags();
  const { getTagCount, setCurrentNode } = useFileContext();
  const { session } = useUser();
  const { filters, toggleFavoriteFilter } = useQuery();
  const { favoriteNodes } = useFavoriteNodes();

  // Pré-calcule
  const favoritesActive = filters.showFavorites;
  const sortedTags = useMemo(
    () => [...allTags].sort((a, b) => a.name.localeCompare(b.name)),
    [allTags]
  );
  const handleNavClick = useCallback(
    (item: NavItem) => () => {
      if (item.isRoot) setCurrentNode(null);
    },
    [setCurrentNode]
  );
  const handleToggleTag = useCallback((id: string) => toggleTag(id), [toggleTag]);

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
                      className={({ isActive }) => navLinkClasses(Boolean(isActive))}
                      onClick={handleNavClick(item)}
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

        {/* Section Favoris */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
            {open && "Favoris"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={favoritesActive}
                  onClick={toggleFavoriteFilter}
                  tooltip="Favoris"
                  className="flex items-center gap-2 px-3 py-2"
                  aria-pressed={favoritesActive}
                  aria-label="Basculer l'affichage des favoris"
                >
                  <Heart
                    className={clsx("h-4 w-4", favoritesActive && "fill-current")}
                  />
                  {open && (
                    <>
                      <span className="sr-only">Favoris</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {favoriteNodes.length}
                      </span>
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Section Tags */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6">
            <span className="flex items-center gap-2">
              <Hash className="h-3 w-3" />
              {open && "Tags"}
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sortedTags.map((tag) => (
                <SidebarMenuItem key={tag.id}>
                  <SidebarMenuButton asChild>
                    <Button
                      variant="ghost"
                      className={clsx(
                        "w-full justify-start gap-2 px-3 py-2 text-sm",
                        selectedTags.includes(tag.id)
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      )}
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color || "#888" }}
                      />
                      {open && (
                        <>
                          <span className="flex-1 truncate text-left">
                            {tag.name}
                          </span>
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

        {/* Footer */}
        <div className="mt-auto">
          {open && session.user && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {session.user.email}
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
