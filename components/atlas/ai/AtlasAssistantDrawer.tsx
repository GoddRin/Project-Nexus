"use client";

import React from "react";
import { AtlasAIWorkspace, AtlasAIWorkspaceProps } from "./AtlasAIWorkspace";

export interface AtlasAssistantDrawerProps extends AtlasAIWorkspaceProps {}

/**
 * AtlasAssistantDrawer (Phase 20 Adapter)
 * Forwards to the rich, movable, resizable, dockable SCIC Atlas AI Workspace.
 */
export const AtlasAssistantDrawer: React.FC<AtlasAssistantDrawerProps> = (props) => {
  return <AtlasAIWorkspace {...props} />;
};
