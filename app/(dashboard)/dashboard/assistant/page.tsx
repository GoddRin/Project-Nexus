import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { AssistantChatClient } from "./AssistantChatClient";
import { Citation } from "@/lib/rag/generate";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  // 1. Fetch default project
  const project = await prisma.project.findUnique({
    where: { slug: "tumauini-hepp" },
  });
  if (!project) {
    throw new Error("Project 'tumauini-hepp' not found in database.");
  }

  // 2. Fetch or provision Clerk user and verify project membership
  const { dbUser, member } = await getOrCreateUser(project.id);
  if (!dbUser || !member) {
    throw new Error("Unauthorized: Access to Project Nexus is restricted.");
  }

  // 3. Fetch latest active conversation history for this user/project
  const conversation = await prisma.assistantConversation.findFirst({
    where: {
      projectId: project.id,
      userId: dbUser.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const initialMessages = conversation
    ? conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations ? (m.citations as unknown as Citation[]) : [],
        createdAt: m.createdAt,
      }))
    : [];

  return (
    <div className="flex-1 bg-background">
      <AssistantChatClient
        projectId={project.id}
        initialConversationId={conversation?.id || null}
        initialMessages={initialMessages}
      />
    </div>
  );
}
