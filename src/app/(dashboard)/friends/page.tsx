import React from "react";
import { getFriends, getUserGroups } from "@/app/actions/userActions";
import FriendsClient from "@/components/FriendsClient";

export default async function FriendsPage() {
  const friends = await getFriends();
  const groups = await getUserGroups();

  return <FriendsClient initialFriends={friends} userGroups={groups} />;
}
