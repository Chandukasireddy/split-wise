import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
// Client component wrapper for join confirmation
import JoinGroupClient from "@/app/(dashboard)/groups/join/[id]/JoinGroupClient";

interface JoinPageProps {
  params: Promise<{ id: string }>;
}

export default async function JoinGroupPage({ params }: JoinPageProps) {
  const { id: groupId } = await params;
  const session = await getCurrentUser();
  if (!session) {
    redirect(`/login?callbackUrl=/groups/join/${groupId}`);
  }

  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      createdBy: {
        select: { name: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, username: true },
          },
        },
      },
    },
  });

  if (!group) {
    redirect("/dashboard");
  }

  const isMember = group.members.some((m) => m.userId === session.userId);

  return (
    <JoinGroupClient
      groupId={group.id}
      groupName={group.name}
      description={group.description}
      creatorName={group.createdBy.name}
      memberCount={group.members.length}
      isMember={isMember}
    />
  );
}
