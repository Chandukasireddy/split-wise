import React from "react";
import { getAuthenticatedUser } from "@/lib/auth";
import { getFriends, getUserGroups } from "@/app/actions/userActions";
import { getFriendNotes } from "@/app/actions/noteActions";
import FriendsClient from "@/components/FriendsClient";

export default async function FriendsPage() {
  const user = await getAuthenticatedUser();
  const friends = await getFriends();
  const groups = await getUserGroups();
  const notesData = await getFriendNotes();

  return (
    <FriendsClient
      initialFriends={friends}
      userGroups={groups}
      currentUser={user ? { userId: user.id, username: user.username, name: user.name } : null}
      initialNotes={notesData}
    />
  );
}
