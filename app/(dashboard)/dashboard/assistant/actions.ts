"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

/**
 * Clears the active conversation for a user in the assistant.
 */
export async function clearConversation(conversationId: string) {
  try {
    // Fetch the conversation first to get userId and projectId
    const conv = await prisma.assistantConversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, projectId: true },
    });

    if (conv) {
      // Delete all conversations for this user on this project (cascade deletes messages)
      await prisma.assistantConversation.deleteMany({
        where: {
          userId: conv.userId,
          projectId: conv.projectId,
        },
      });
    }

    revalidatePath("/dashboard/assistant");
    return { success: true };
  } catch (error) {
    console.error("Failed to clear conversation:", error);
    return { success: false, error: String(error) };
  }
}
