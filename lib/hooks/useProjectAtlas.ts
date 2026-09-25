"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import useSWR from "swr";
import {
  ProjectFilterParams,
  ProjectCategoryId,
  ProjectStatusId,
  IslandGroupId,
} from "@/lib/validations/projectAtlasSchema";
import {
  ProjectSummary,
  AtlasFeatureCollection,
} from "@/lib/services/projectAtlasService";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch ${url}`);
  return res.json();
});

export function useProjectAtlas(initialFilters: Partial<ProjectFilterParams> = {}) {
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategoryId | "ALL">(
    initialFilters.category || "ALL"
  );
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatusId | "ALL">(
    initialFilters.status || "ALL"
  );
  const [selectedIsland, setSelectedIsland] = useState<IslandGroupId | "ALL">(
    (initialFilters.islandGroup as IslandGroupId) || "ALL"
  );
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(
    initialFilters.region
  );
  const [searchQuery, setSearchQuery] = useState<string>(initialFilters.search || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Construct query string for API
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== "ALL") params.set("category", selectedCategory);
    if (selectedStatus && selectedStatus !== "ALL") params.set("status", selectedStatus);
    if (selectedIsland && selectedIsland !== "ALL") params.set("islandGroup", selectedIsland);
    if (selectedRegion) params.set("region", selectedRegion);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    return params.toString();
  }, [selectedCategory, selectedStatus, selectedIsland, selectedRegion, searchQuery]);

  // Fetch structured project data
  const { data: projectsData, error: projectsError, isLoading: isProjectsLoading } = useSWR<{
    total: number;
    counts: any;
    data: ProjectSummary[];
  }>(`/api/projects?${queryString}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  // Fetch GeoJSON for WebGL map source
  const { data: geoJsonData, error: geoJsonError, isLoading: isGeoJsonLoading } = useSWR<AtlasFeatureCollection>(
    `/api/projects/geojson?${queryString}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  const projects: ProjectSummary[] = useMemo(() => {
    return projectsData?.data || [];
  }, [projectsData]);

  // Active selected project
  const selectedProject: ProjectSummary | null = useMemo(() => {
    if (!selectedProjectId) return null;
    return (
      projects.find(
        (p) => p.id === selectedProjectId || p.slug === selectedProjectId
      ) || null
    );
  }, [projects, selectedProjectId]);

  const selectProject = useCallback((projectOrId: ProjectSummary | string | null) => {
    if (!projectOrId) {
      setSelectedProjectId(null);
    } else if (typeof projectOrId === "string") {
      setSelectedProjectId(projectOrId);
    } else {
      setSelectedProjectId(projectOrId.id);
    }
  }, []);

  // Quick reset filters to National view
  const resetFilters = useCallback(() => {
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
    setSelectedIsland("ALL");
    setSelectedRegion(undefined);
    setSearchQuery("");
  }, []);

  return {
    // Data
    projects,
    geoJson: geoJsonData || null,
    counts: projectsData?.counts,
    selectedProject,
    selectProject,

    // Filter States
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    selectedIsland,
    setSelectedIsland,
    selectedRegion,
    setSelectedRegion,
    searchQuery,
    setSearchQuery,
    resetFilters,

    // Loading & Error States
    isLoading: isProjectsLoading || isGeoJsonLoading,
    error: projectsError || geoJsonError,
  };
}
