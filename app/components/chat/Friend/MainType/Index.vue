<script lang="ts" setup>
import { ChatFriendMainTypeAiRobot, ChatFriendMainTypeGroup, ChatFriendMainTypeGroupMembers, ChatFriendMainTypeNewFriend, ChatFriendMainTypeUser } from "#components";

/**
 * 面板适配器
 */
defineProps<{
  data: TheFriendOpt
}>();
const maps: FriendOptTypeMap = ({
  [FriendOptType.User]: ChatFriendMainTypeUser,
  [FriendOptType.NewFriend]: ChatFriendMainTypeNewFriend,
  [FriendOptType.Group]: ChatFriendMainTypeGroup,
  [FriendOptType.AiRobot]: ChatFriendMainTypeAiRobot,
  [FriendOptType.GROUP_MEMBER]: ChatFriendMainTypeGroupMembers,
});
interface FriendOptTypeMap {
  [property: number]: any
}
</script>

<template>
  <component :is="maps[data.type || FriendOptType.User]" :data="data" v-bind="$attrs">
    <slot name="control" />
  </component>
</template>

