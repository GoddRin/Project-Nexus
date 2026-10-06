import React from "react";
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABEL, listCoverChoices, listProjectChoices } from "@/lib/home/newsPosts";
import { getNewsViewer } from "@/lib/home/permissions";
import { NewsComposerDialog, type ComposerPost } from "./NewsComposerDialog";

/**
 * Server side of the composer: renders nothing unless the signed-in user may publish, so the
 * composer's code and its lists never reach anyone else's browser. (The server actions check the
 * role again on every save.)
 */
export async function NewsComposer({ post }: { post?: ComposerPost }) {
  const viewer = await getNewsViewer();
  if (!viewer.canPublish) return null;
  const [projects, covers] = await Promise.all([listProjectChoices().catch(() => []), listCoverChoices().catch(() => [])]);
  return (
    <NewsComposerDialog
      categories={NEWS_CATEGORIES.map((value) => ({ value, label: NEWS_CATEGORY_LABEL[value] }))}
      projects={projects}
      covers={covers}
      post={post}
    />
  );
}
