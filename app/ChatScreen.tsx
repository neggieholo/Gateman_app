import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import Clipboard from "@react-native-clipboard/clipboard";
import auth from "@react-native-firebase/auth";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { useHeaderHeight } from "@react-navigation/elements";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronLeft,
  LogOut,
  MoreVertical,
  Phone,
  Search,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Avatar,
  Bubble,
  GiftedChat,
  IMessage,
  MessageText,
} from "react-native-gifted-chat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "./UserContext";
import UserProfileModal from "./components/ChatProfile";
import CreateGroupModal, {
  GroupNameModal,
} from "./components/CreateChatGroupModal";
import GroupProfileModal from "./components/GroupChatProfile";
import {
  renderActions,
  renderCustomView,
  renderMessage,
  RenderMessageAudio,
  renderMessageVideo,
} from "./services/ChatRenders";
import { fetchAllTenants, getCloudinaryUrl } from "./services/api";
import { ChatGroup, ChatRoom, IFileMessage, User } from "./services/interfaces";

const ChatManager = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [isCreateGroupMode, setIsCreateGroupMode] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>(
    [],
  );
  const [groupName, setGroupName] = useState("");
  const [isGroupNameModalVisible, setGroupNameModalVisible] = useState(false);
  const {
    user,
    onlineUsers,
    socket,
    remoteTyping,
    privateUnread,
    groupUnread,
  } = useUser();

  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Partial<User>[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<
    Partial<User> | ChatGroup | null
  >(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [otherUserLastRead, setOtherUserLastRead] =
    useState<FirebaseFirestoreTypes.Timestamp | null>(null);

  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blockedMeIds, setBlockedMeIds] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);
  const [currentTab, setCurrentTab] = useState<"residents" | "groups">(
    "residents",
  );
  const [groups, setGroups] = useState<any[]>([]);
  const isGroupChat = !!(selectedTenant && "isGroup" in selectedTenant);
  const [privateChats, setPrivateChats] = useState<ChatRoom[]>([]);
  const [replyMessage, setReplyMessage] = useState<IFileMessage | null>(null);
  const [isForwardModalVisible, setForwardModalVisible] = useState(false);
  const [messageToForward, setMessageToForward] = useState<IFileMessage | null>(
    null,
  );
  const [selectedForForward, setSelectedForForward] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const { showActionSheetWithOptions } = useActionSheet();
  const flatListRef = useRef<any>(null);

  const displayName =
    selectedTenant?.name && selectedTenant.name.length > 10
      ? `${selectedTenant.name.substring(0, 20)}...`
      : selectedTenant?.name || "Chat";
  const myId = user?.id?.toString();
  // const isCreator = isGroupChat ? selectedTenant.createdBy === myId : false;
  // const isAdmin =
  //   isGroupChat && myId ? selectedTenant.admins.includes(myId) : false;

  //initializer
  useEffect(() => {
    if (!user?.estate_id) return;
    const initializeChatSystem = async () => {
      try {
        const [tenantRes] = await Promise.all([
          fetchAllTenants(),
          user?.chatToken
            ? auth().signInWithCustomToken(user.chatToken)
            : Promise.resolve(),
        ]);

        if (tenantRes.success) setTenants(tenantRes.tenants);
      } catch (err) {
        console.error("Initialization failed", err);
      } finally {
        setLoading(false);
      }
    };

    initializeChatSystem();
  }, [user?.chatToken, user?.estate_id]);

  //block function
  useEffect(() => {
    if (!user?.id || !user.estate_id) return;

    const relationsRef = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection("user_relations")
      .doc(user.id.toString());

    const unsubscribe = relationsRef.onSnapshot(
      (doc) => {
        const isExisting =
          typeof doc.exists === "function" ? doc.exists() : doc.exists;
        if (doc && isExisting) {
          const data = doc.data();
          setBlockedUserIds(data?.blocked_users || []);
        } else {
          setBlockedUserIds([]);
        }
      },
      (err) => console.error("Relations listener error:", err),
    );

    return () => unsubscribe();
  }, [user?.id, user?.estate_id]);

  //unblock function
  useEffect(() => {
    if (!selectedTenant?.id || !user?.id || !user.estate_id) return;

    const tenantId = selectedTenant.id.toString();
    const myId = user.id.toString();

    const unsubscribeReverseBlock = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection("user_relations")
      .doc(tenantId)
      .onSnapshot((doc) => {
        const isExisting =
          typeof doc.exists === "function" ? doc.exists() : doc.exists;
        if (doc && isExisting) {
          const theirBlocks = doc.data()?.blocked_users || [];

          if (theirBlocks.includes(myId)) {
            // 1. Add them to our 'blockedMe' list so visibleTenants hides them
            setBlockedMeIds((prev) => [...new Set([...prev, tenantId])]);

            Alert.alert("Notice", "This chat is no longer available.");

            setTimeout(() => {
              setSelectedTenant(null);
              setMessages([]);
            }, 1000);
          }
        }
      });

    return () => unsubscribeReverseBlock();
  }, [selectedTenant?.id, user?.id, user?.estate_id]);

  //group fetch
  useEffect(() => {
    // if (!user?.id || !user.estate_id || currentTab !== "groups") return;
    if (!user?.id || !user.estate_id) return;
    const unsubscribe = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection("groups")
      .where("memberIds", "array-contains", user.id.toString())
      .onSnapshot(
        (snap) => {
          const fetchedGroups = snap.docs.map((doc) => ({
            ...doc.data(),
            _id: doc.id,
          }));
          setGroups(fetchedGroups);
        },
        (err) => console.error("Error fetching groups:", err),
      );

    return () => unsubscribe();
  }, [user?.id, user?.estate_id, currentTab]);

  const activeGroupData = useMemo(() => {
    if (!isGroupChat || !selectedTenant) return null;

    // Find the group in your live 'groups' state that matches the one being viewed
    const liveGroup = groups.find(
      (g) => g._id === (selectedTenant._id || selectedTenant.id),
    );

    // Fallback to selectedTenant if not found yet to avoid null errors during transitions
    return liveGroup || selectedTenant;
  }, [groups, selectedTenant, isGroupChat]);

  const visibleTenants = useMemo(() => {
    return tenants.filter((t) => {
      const id = t.id?.toString() || "";
      return !blockedUserIds.includes(id) && !blockedMeIds.includes(id);
    });
  }, [tenants, blockedUserIds, blockedMeIds]);

  // 1. Filter for Residents (Name, Block, Unit)
  const filteredTenants = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return visibleTenants;

    return visibleTenants.filter((t) => {
      const name = t.name?.toLowerCase() || "";
      const block = t.block?.toString().toLowerCase() || "";
      const unit = t.unit?.toString().toLowerCase() || "";

      return (
        name.includes(query) || block.includes(query) || unit.includes(query)
      );
    });
  }, [visibleTenants, searchQuery]);

  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    // Assuming 'myGroups' is your state/prop containing the user's groups
    if (!query) return groups;

    return groups.filter((g) => {
      const groupName = g.name?.toLowerCase() || "";
      return groupName.includes(query);
    });
  }, [groups, searchQuery]);

  //chatroom fetch
  useEffect(() => {
    if (!user?.id || !user?.estate_id) return;

    const myId = user.id.toString();
    const unsubscribe = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection("private_chats")
      .where("memberIds", "array-contains", myId)
      .onSnapshot(
        (snapshot) => {
          if (snapshot) {
            const chats = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as ChatRoom[];

            setPrivateChats(chats);
          }
        },
        (error) => {
          console.error("Error listening to private chats:", error);
        },
      );

    return () => unsubscribe();
  }, [user?.id, user?.estate_id]);

  //message fetch
  useEffect(() => {
    if (!selectedTenant || !user || !user.estate_id) return;

    const chatCollection = isGroupChat ? "groups" : "private_chats";
    const roomId = isGroupChat
      ? selectedTenant._id || selectedTenant.id
      : [user.id, selectedTenant.id].sort().join("_");

    const roomRef = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection(chatCollection)
      .doc(roomId);

    let unsubscribeMessages: () => void;
    const unsubscribeRoom = roomRef.onSnapshot((doc) => {
      if (!doc.exists) return;
      const data = doc.data();

      if (!isGroupChat) {
        const lastRead = data?.[`lastRead_${selectedTenant.id}`];
        if (lastRead) setOtherUserLastRead(lastRead);
      }

      // 2. Build the Message Query INSIDE the listener
      let messageQuery = roomRef
        .collection("messages")
        .orderBy("createdAt", "desc");

      if (isGroupChat) {
        const myData = data?.members?.find(
          (m: any) => (m.user_id || m) === user?.id?.toString(),
        );
        if (myData?.clearedAt) {
          messageQuery = messageQuery.where("createdAt", ">", myData.clearedAt);
        }
      } else {
        const myClearedAt = data?.[`clearedAt_${user.id}`];
        if (myClearedAt) {
          messageQuery = messageQuery.where("createdAt", ">", myClearedAt);
        }
      }

      if (unsubscribeMessages) unsubscribeMessages();

      // 3. Start the Message Listener
      unsubscribeMessages = messageQuery.limit(50).onSnapshot((snap) => {
        if (!snap) return;

        const newMsgs: IFileMessage[] = [];
        const removedIds: string[] = [];

        snap.docChanges().forEach((change) => {
          const mData = change.doc.data();
          const messageId = change.doc.id;

          if (change.type === "added") {
            newMsgs.push({
              _id: messageId,
              text: mData.text,
              createdAt: mData.createdAt?.toDate() || new Date(),
              user: mData.user,
              replyMessage: mData.replyMessage || null,
              isForwarded: mData.isForwarded ? mData.isForwarded : null,
              image: mData.image || null,
              audio: mData.audio || null,
              file: mData.file
                ? {
                    url: mData.file.url,
                    name: mData.file.name,
                    type: mData.file.type,
                  }
                : null,
            } as IFileMessage);
          }

          if (change.type === "removed") {
            removedIds.push(messageId);
          }
        });

        setMessages((prev) => {
          // 1. Remove deleted messages from local state
          let updatedMessages = prev;
          if (removedIds.length > 0) {
            updatedMessages = prev.filter(
              (m) => !removedIds.includes(m._id.toString()),
            );
          }

          // 2. Filter out duplicates for new messages
          const uniqueNewMessages = newMsgs.filter(
            (newMsg) =>
              !updatedMessages.some((oldMsg) => oldMsg._id === newMsg._id),
          );

          // 3. Append the new ones to the filtered list
          return GiftedChat.append(updatedMessages, uniqueNewMessages);
        });
      });
    });

    return () => {
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribeMessages) unsubscribeMessages();
      setMessages([]);
    };
  }, [selectedTenant, user]);

  const onSend = async (newMsgs: IFileMessage[] = []) => {
    if (!selectedTenant || !user?.estate_id) return;
    const myId = user?.id?.toString();
    const messageToSend = newMsgs[0];
    const roomId = isGroupChat
      ? selectedTenant.id
      : [user.id, selectedTenant.id].sort().join("_");

    const roomRef = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection(isGroupChat ? "groups" : "private_chats")
      .doc(roomId);

    // 1. Add Message
    await roomRef.collection("messages").add({
      text: messageToSend.text,
      createdAt: firestore.FieldValue.serverTimestamp(),
      user: { _id: myId, name: user.name, avatar: user.avatar || null },
      image: messageToSend.image || null,
      audio: messageToSend.audio || null,
      file: messageToSend.file
        ? {
            url: messageToSend.file.url,
            name: messageToSend.file.name,
            type: messageToSend.file.type,
          }
        : null,
      replyMessage: replyMessage
        ? {
            _id: replyMessage._id,
            text: replyMessage.text
              ? replyMessage.text.substring(0, 50) +
                (replyMessage.text.length > 50 ? "..." : "")
              : replyMessage.audio
                ? "🎤 Voice Note"
                : replyMessage.image
                  ? "📷 Photo"
                  : replyMessage.video
                    ? "🎥 Video"
                    : replyMessage.file
                      ? `📄 ${replyMessage.file.name}`
                      : "Media Message",
            // Important: Ensure user exists to prevent the "Stuck/Crash" on load
            user: isGroupChat ? replyMessage.user?.name || "Unknown" : null,
          }
        : null,
    });

    // 2. Update Counts
    if (isGroupChat) {
      const doc = await roomRef.get();
      const members = doc.data()?.members || [];
      const updatedMembers = members.map((m: any) => {
        // Increment for everyone EXCEPT me
        if ((m.user_id || m) !== myId) {
          return { ...m, unreadCount: (m.unreadCount || 0) + 1 };
        }
        return m;
      });
      await roomRef.update({
        members: updatedMembers,
        lastSenderId: myId,
      });
    } else {
      // Private: Increment the specific field for the OTHER person
      await roomRef.set(
        {
          lastSenderId: myId,
          [`unreadCount_${selectedTenant.id}`]:
            firestore.FieldValue.increment(1),
          memberIds: [myId, selectedTenant?.id?.toString()],
        },
        { merge: true },
      );
    }
    setReplyMessage(null);
  };

  const markAsRead = async () => {
    if (!selectedTenant || !user?.estate_id) return;
    const myId = user?.id?.toString();
    const roomId = isGroupChat
      ? selectedTenant.id
      : [user.id, selectedTenant.id].sort().join("_");

    const roomRef = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection(isGroupChat ? "groups" : "private_chats")
      .doc(roomId);

    if (isGroupChat) {
      const doc = await roomRef.get();
      const isExisting =
        typeof doc.exists === "function" ? doc.exists() : doc.exists;
      if (isExisting) {
        const members = doc.data()?.members || [];
        const updatedMembers = members.map((m: any) =>
          (m.user_id || m) === myId
            ? {
                ...m,
                unreadCount: 0,
              }
            : m,
        );
        await roomRef.update({ members: updatedMembers });
      }
    } else {
      // Private: Set MY unread count field to 0
      await roomRef.set(
        {
          [`lastRead_${myId}`]: firestore.FieldValue.serverTimestamp(),
          [`unreadCount_${myId}`]: 0,
        },
        { merge: true },
      );
    }
  };

  //mark as read
  useEffect(() => {
    if (selectedTenant && user?.estate_id) {
      markAsRead();
    }
  }, [selectedTenant, messages.length]);

  // const renderCustomView = (props: any) => {
  //   const { currentMessage } = props;

  //   if (currentMessage?.replyMessage) {
  //     const replyText = currentMessage.replyMessage.text || "";
  //     const truncatedText =
  //       replyText.length > 30 ? replyText.substring(0, 30) + "..." : replyText;

  //     return (
  //       <View className="bg-white/50 border-l-4 border-white px-2 py-2 m-1 rounded-sm min-w-[150px]">
  //         {isGroupChat && currentMessage.replyMessage.user?.name && (
  //           <Text className="font-extrabold text-[#6366f1] text-[11px] mb-0.5">
  //             {currentMessage.replyMessage.user.name}
  //           </Text>
  //         )}

  //         <Text className="text-gray-600 text-[12px] leading-4">
  //           {truncatedText}
  //         </Text>
  //       </View>
  //     );
  //   }
  //   return null;
  // };

  const handleBlockUser = async (targetId: string) => {
    if (!user?.id || !user.estate_id) return;

    const roomId = [user.id, targetId].sort().join("_");
    const messagesRef = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection("private_chats")
      .doc(roomId)
      .collection("messages");

    try {
      // 1. Add to Block List
      await firestore()
        .collection("estate_chats")
        .doc(user.estate_id)
        .collection("user_relations")
        .doc(user.id.toString())
        .set(
          {
            blocked_users: firestore.FieldValue.arrayUnion(targetId),
          },
          { merge: true },
        );

      // 2. Wipe the Messages (Delete the last 50 for immediate cleanup)
      const snapshot = await messagesRef.limit(50).get();
      const batch = firestore().batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      Alert.alert("Success", "Resident blocked and chat history cleared.");
      setSelectedTenant(null);
      setIsProfileVisible(false);
    } catch (err) {
      Alert.alert("Error", "Failed to block resident.");
    }
  };

  const handleTyping = (text: string) => {
    if (!socket || !selectedTenant) return;

    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socket.emit("typing_start", selectedTenant.id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // If text is cleared or user stops for 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("typing_stop", selectedTenant.id);
    }, 2000);
  };

  const handleClearChat = () => {
    const title = isGroupChat ? "Clear Group History" : "Clear Chat";
    const message = isGroupChat
      ? "This will hide all previous messages for YOU. Others will still see them."
      : "This will permanently delete your copy of this conversation.";

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          if (!selectedTenant || !user?.estate_id) return;
          const roomId = isGroupChat
            ? selectedTenant._id || selectedTenant.id
            : [user.id, selectedTenant.id].sort().join("_");

          try {
            if (isGroupChat) {
              const groupRef = firestore()
                .collection("estate_chats")
                .doc(user.estate_id)
                .collection("groups")
                .doc(roomId);

              const doc = await groupRef.get();
              const currentMembers = doc.data()?.members || [];

              const updatedMembers = currentMembers.map((m: any) => {
                const mId = typeof m === "string" ? m : m.user_id;
                if (mId === user?.id?.toString()) {
                  return {
                    user_id: mId,
                    clearedAt: Date.now(),
                  };
                }
                return typeof m === "string"
                  ? { user_id: m, clearedAt: null }
                  : m;
              });

              await groupRef.update({ members: updatedMembers });
            } else {
              // Private chat: Physical delete
              const messagesRef = firestore()
                .collection("estate_chats")
                .doc(user.estate_id)
                .collection("private_chats")
                .doc(roomId);

              await messagesRef.update({
                [`clearedAt_${myId}`]: Date.now(),
              });
            }

            setMessages([]);
            setShowMenu(false);
            Alert.alert("Success", "Chat cleared.");
          } catch (err) {
            Alert.alert("Error", "Failed to clear chat.");
          }
        },
      },
    ]);
  };

  const confirmDelete = (message: IMessage) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDelete(message),
        },
      ],
    );
  };

  const handleDelete = async (message: IMessage) => {
    try {
      const myId = user?.id?.toString();
      // Only allow deleting your own messages, or allow admins to delete any
      if (message.user._id !== myId) {
        Alert.alert("Error", "You can only delete your own messages.");
        return;
      }

      const roomId = isGroupChat
        ? selectedTenant.id
        : [user?.id, selectedTenant?.id].sort().join("_");

      await firestore()
        .collection("estate_chats")
        .doc(user?.estate_id)
        .collection(isGroupChat ? "groups" : "private_chats")
        .doc(roomId)
        .collection("messages")
        .doc(message._id.toString())
        .delete();
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  useEffect(() => {
    if (!selectedTenant?.id || !user?.id || !user.estate_id) return;

    const tenantId = selectedTenant.id.toString();
    const estateId = user.estate_id;

    // Listen to the TARGET's relations to see if they block US
    const unsubscribe = firestore()
      .collection("estate_chats")
      .doc(estateId)
      .collection("user_relations")
      .doc(tenantId)
      .onSnapshot(
        (doc) => {
          const isExisting =
            typeof doc.exists === "function" ? doc.exists() : doc.exists;
          if (doc && isExisting) {
            const data = doc.data();
            const theirBlockedList = data?.blocked_users || [];

            if (theirBlockedList.includes(user?.id?.toString())) {
              Alert.alert(
                "Access Denied",
                "You have been blocked by this resident.",
              );

              setTimeout(() => {
                setSelectedTenant(null); // Close the chat
                setMessages([]); // Clear local state
              }, 1500);
            }
          }
        },
        (error) => {
          console.error("Block listener error:", error);
        },
      );

    return () => unsubscribe();
  }, [selectedTenant?.id, user?.id, user?.estate_id]);

  const handleFinalizeGroup = async () => {
    if (!groupName.trim() || selectedGroupMembers.length < 2) {
      Alert.alert(
        "Error",
        "Please provide a name and select at least 2 residents.",
      );
      return;
    }

    const groupId = `group_${user?.id}_${Date.now()}`;
    const memberObjects = [...selectedGroupMembers, myId].map((id) => ({
      user_id: id,
      clearedAt: null,
      unreadCount: 0,
    }));
    const memberIds = [...selectedGroupMembers, myId];
    const groupData = {
      id: groupId,
      name: groupName,
      createdAt: firestore.FieldValue.serverTimestamp(),
      createdBy: user?.id,
      members: memberObjects,
      memberIds: memberIds,
      admins: [myId],
      isGroup: true,
      avatar: null,
    };

    try {
      await firestore()
        .collection("estate_chats")
        .doc(user?.estate_id)
        .collection("groups")
        .doc(groupId)
        .set(groupData);

      setGroupNameModalVisible(false);
      setIsCreateGroupMode(false);
      setSelectedGroupMembers([]);
      setGroupName("");

      Alert.alert("Success", `${groupName} has been created!`);
    } catch (err) {
      Alert.alert("Error", "Failed to create group.");
    }
  };

  const handleExitGroup = async () => {
    if (!selectedTenant || !user?.id || !isGroupChat) return;

    const groupId = selectedTenant._id || selectedTenant.id;
    const myId = user.id.toString();
    const group = selectedTenant as ChatGroup;

    const isAdmin = group.admins?.includes(myId);
    const otherAdmins = group.admins?.filter((id) => id !== myId) || [];
    const currentMembers = group.members || [];

    if (isAdmin && otherAdmins.length === 0 && currentMembers.length > 1) {
      Alert.alert(
        "Admin Required",
        "You are the only admin. Please appoint another admin before leaving or delete the group.",
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert("Exit Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const groupRef = firestore()
              .collection("estate_chats")
              .doc(user.estate_id)
              .collection("groups")
              .doc(groupId);

            // 3. Filter members list (identifying user_id inside the object)
            const updatedMembers = currentMembers.filter(
              (m) => (typeof m === "string" ? m : m.user_id) !== myId,
            );

            await groupRef.update({
              members: updatedMembers,
              admins: firestore.FieldValue.arrayRemove(myId),
            });

            setSelectedTenant(null);
            setMessages([]);
            setShowMenu(false);
          } catch (err) {
            console.error("Exit error:", err);
            Alert.alert("Error", "Failed to exit group.");
          }
        },
      },
    ]);
  };

  const toggleMember = (id: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const toggleForwardMember = (id: string) => {
    setSelectedForForward((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleForwardMessage = async (selectedIds: string[]) => {
    if (!messageToForward || selectedIds.length === 0) return;

    try {
      // 1. Determine the summary text for the "lastMessage" preview
      const getSummaryText = () => {
        if (messageToForward.text) return messageToForward.text;
        if (messageToForward.audio) return "🎤 Voice Note";
        if (messageToForward.image) return "📷 Photo";
        if (messageToForward.video) return "🎥 Video";
        if (messageToForward.file) return `📄 ${messageToForward.file.name}`;
        return "Forwarded Message";
      };

      const summary = getSummaryText();

      for (const targetId of selectedIds) {
        const roomId = [user?.id?.toString(), targetId].sort().join("_");

        const roomRef = firestore()
          .collection("estate_chats")
          .doc(user?.estate_id)
          .collection("private_chats")
          .doc(roomId);

        const roomDoc = await roomRef.get();

        if (!roomDoc.exists) {
          await roomRef.set({
            members: [user?.id?.toString(), targetId],
            lastMessage: summary,
            updatedAt: firestore.FieldValue.serverTimestamp(),
            createdAt: firestore.FieldValue.serverTimestamp(),
            type: "private",
            [`clearedAt_${user?.id}`]: null,
            [`clearedAt_${targetId}`]: null,
          });
        }

        // 2. Add the message with ALL media fields
        await roomRef.collection("messages").add({
          text: messageToForward.text || null,
          image: messageToForward.image || null,
          audio: messageToForward.audio || null,
          video: messageToForward.video || null,
          file: messageToForward.file || null, // Ensure this matches your IFileMessage structure
          user: {
            _id: user?.id?.toString(),
            name: user?.name,
            avatar: user?.avatar,
          },
          createdAt: firestore.FieldValue.serverTimestamp(),
          isForwarded: true,
        });

        // 3. Update the room's last message
        await roomRef.update({
          lastMessage: summary,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      // Reset UI
      setForwardModalVisible(false);
      setSelectedForForward([]);
      setMessageToForward(null);

      if (Platform.OS === "android") {
        ToastAndroid.show(
          `Forwarded to ${selectedIds.length} neighbors`,
          ToastAndroid.SHORT,
        );
      }

      if (Platform.OS === "ios") {
        Alert.alert("Success", `Forwarded to ${selectedIds.length} neighbors`);
      }
    } catch (error) {
      console.error("Forwarding Error:", error);
      Alert.alert("GateMan", "Failed to forward to some residents.");
    }
  };

  // 1. Camera
  const takePhoto = async () => {
    // const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    // if (!result.canceled) onSend([{ image: result.assets[0].uri }]);
  };

  // 2. Gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (!result.canceled) {
      // Just a "middle-man" step to swap local for web
      const webUrl = await getCloudinaryUrl(result.assets[0].uri, "image");

      if (webUrl) {
        onSend([
          {
            _id: Math.random().toString(),
            createdAt: new Date(),
            user: { _id: myId || "anon", name: user?.name },
            image: webUrl,
            text: "",
          },
        ]);
      }
    }
  };

  // 3. Documents (PDFs, etc.)
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword", "text/plain"],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];

      const webUrl = await getCloudinaryUrl(asset.uri, "document");

      if (webUrl) {
        onSend([
          {
            _id: Math.random().toString(),
            createdAt: new Date(),
            user: {
              _id: myId || "anonymous",
              name: user?.name || "User",
            },
            text: `📄 ${asset.name}`,
            file: {
              url: webUrl, // <--- NOW THIS IS THE CLOUDINARY LINK
              name: asset.name,
              type: asset.mimeType || "application/octet-stream",
            },
          },
        ]);
      }
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "videos",
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const webUrl = await getCloudinaryUrl(result.assets[0].uri, "video");
      if (webUrl) {
        onSend([
          {
            _id: Math.random().toString(),
            createdAt: new Date(),
            user: { _id: myId || "anon", name: user?.name },
            video: webUrl, // GiftedChat uses the 'video' prop
            text: "",
          },
        ]);
      }
    }
  };

  const recordVideo = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "videos",
      quality: 0.7,
    });

    if (!result.canceled) {
      const webUrl = await getCloudinaryUrl(result.assets[0].uri, "video");
      if (webUrl) {
        onSend([
          {
            _id: Math.random().toString(),
            createdAt: new Date(),
            user: { _id: myId || "anon", name: user?.name },
            video: webUrl, // GiftedChat uses the 'video' prop
            text: "",
          },
        ]);
      }
    }
  };

  //   const handleShareMessageFile = async (message: any) => {
  //   if (!message.file) return;

  //   try {
  //     const isAvailable = await Sharing.isAvailableAsync();
  //     if (!isAvailable) {
  //       Alert.alert("Error", "Sharing is not supported on this device.");
  //       return;
  //     }

  //     // We share the remote URL directly so the user doesn't
  //     // have to wait for a local download to finish first.
  //     await Sharing.shareAsync(message.file.url, {
  //       dialogTitle: `Share ${message.file.name}`,
  //       mimeType: message.file.mimeType || 'application/pdf',
  //     });
  //   } catch (e) {
  //     console.error("Sharing Error:", e);
  //   }
  // };

  // --- START RECORDING ---
  const startAudioRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(recording);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  // --- STOP RECORDING ---
  const stopAudioRecording = async () => {
    if (!recording) return;

    try {
      setRecording(null);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        // Cloudinary helper (Remember: audio uses the 'video' resource type)
        const remoteUrl = await getCloudinaryUrl(uri, "video");

        if (remoteUrl) {
          onSend([
            {
              _id: Math.random().toString(),
              createdAt: new Date(),
              user: { _id: myId || "anon", name: user?.name || "User" },
              audio: remoteUrl,
              text: "",
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  };

  if (!user?.estate_id) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-6">
        <Text className="text-gray-400 text-center font-medium">
          You must join an estate to send and receive messages.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // --- CHAT VIEW ---
  if (selectedTenant) {
    return (
      <View
        className="flex-1 bg-white"
        style={{ paddingBottom: insets.bottom }}
      >
        <Modal
          visible={isImageModalVisible}
          transparent={true}
          onRequestClose={() => setImageModalVisible(false)}
        >
          <TouchableOpacity
            className="flex-1 bg-black/95 justify-center items-center"
            activeOpacity={1}
            onPress={() => setImageModalVisible(false)}
          >
            <Image
              source={{
                uri: selectedTenant.avatar || "https://via.placeholder.com/300",
              }}
              className="w-full h-[500px]"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Modal>
        <CreateGroupModal
          isVisible={isForwardModalVisible}
          onClose={() => setForwardModalVisible(false)}
          tenants={visibleTenants}
          selectedMembers={selectedForForward} // A separate state for forwarding selection
          onToggleMember={toggleForwardMember}
          onNext={() => handleForwardMessage(selectedForForward)}
          insets={insets}
          buttonText="Send"
          header="Forward Message"
          count={0}
        />

        <View
          style={{ paddingTop: insets.top }}
          className="flex-row items-center p-4 border-b border-gray-100 bg-white"
        >
          <TouchableOpacity
            onPress={() => {
              setSelectedTenant(null);
              setShowMenu(false);
            }}
            className="pr-2 mr-12"
          >
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>

          <View className="flex-1 flex-row justify-center items-center">
            {!isGroupChat && (
              <TouchableOpacity onPress={() => setImageModalVisible(true)}>
                <Image
                  source={{
                    uri:
                      selectedTenant.avatar || "https://via.placeholder.com/50",
                  }}
                  className="w-10 h-10 rounded-full bg-gray-200"
                />
              </TouchableOpacity>
            )}

            {isGroupChat && (
              <TouchableOpacity onPress={() => setImageModalVisible(true)}>
                {selectedTenant.avatar ? (
                  <Image
                    source={{ uri: selectedTenant.avatar }}
                    className="w-10 h-10 rounded-full bg-gray-200"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
                    {/* Scale the icon down to fit the 10x10 (w-10 h-10) circle */}
                    <Users size={24} color="#4f46e5" />
                  </View>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="ml-3 flex-1"
              onPress={() => setIsProfileVisible(true)}
            >
              <Text className="font-bold text-lg text-gray-900">
                {displayName}
              </Text>
              {!isGroupChat && "block" in selectedTenant && (
                <Text className="text-gray-400 text-[10px] font-bold uppercase">
                  Block {selectedTenant.block} • Unit {selectedTenant.unit}
                </Text>
              )}
              {onlineUsers.includes(selectedTenant.id?.toString() || "") && (
                <View className="absolute right-5 top-5 w-3 h-3 bg-green-500 rounded-full" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowMenu(!showMenu)}
              className="ml-3 p-2"
            >
              <MoreVertical size={24} color="#000" />
            </TouchableOpacity>
            {showMenu && (
              <>
                <TouchableOpacity
                  className="absolute inset-0 z-40"
                  onPress={() => setShowMenu(false)}
                />
                <View
                  className="absolute right-4 top-16 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 w-44"
                  style={{ elevation: 5 }}
                >
                  <TouchableOpacity
                    className="flex-row items-center px-4 py-3 border-b border-gray-50"
                    onPress={() => {
                      setShowMenu(false);
                      alert(`Calling ${selectedTenant.name}...`);
                    }}
                  >
                    <Phone size={18} color="#4f46e5" />
                    <Text className="ml-3 font-medium text-gray-700">Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center px-4 py-3"
                    onPress={() => {
                      setShowMenu(false);
                      handleClearChat();
                    }}
                  >
                    <Trash2 size={18} color="#ef4444" />
                    <Text className="ml-3 font-medium text-red-500">
                      Clear Chat
                    </Text>
                  </TouchableOpacity>

                  {isGroupChat && (
                    <TouchableOpacity
                      className="flex-row items-center px-4 py-3 border-t border-gray-50"
                      onPress={() => {
                        setShowMenu(false);
                        handleExitGroup();
                      }}
                    >
                      <LogOut size={18} color="#ef4444" />
                      <Text className="ml-3 font-medium text-red-500">
                        Exit Group
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <GiftedChat
            messages={messages}
            renderMessage={renderMessage}
            onSend={onSend}
            messagesContainerRef={flatListRef}
            user={{ _id: user?.id?.toString() || "0", name: user?.name }}
            renderAvatar={(props) => {
              const { user: messageUser } = props.currentMessage;
              if (isGroupChat && messageUser) {
                return (
                  <Avatar
                    {...props}
                    imageStyle={{
                      left: { width: 40, height: 40, borderRadius: 20 },
                    }}
                  />
                );
              }
              return null;
            }}
            renderActions={(props) =>
              renderActions({
                props,
                showActionSheet: showActionSheetWithOptions,
                onTakePhoto: takePhoto,
                onPickImage: pickImage,
                onPickDocument: pickDocument,
                onPickVideo: pickVideo,
                onStartRecording: startAudioRecording,
                onStopRecording: stopAudioRecording,
                isRecording: !!recording,
              })
            }
            renderMessageAudio={RenderMessageAudio}
            renderMessageVideo={renderMessageVideo}
            renderCustomView={renderCustomView}
            isUsernameVisible={isGroupChat}
            renderUsername={(user) => {
              if (!user || !user.name) return null;

              return (
                <Text className="text-[#6366f1] text-[10px] mb-[2px] ml-[10px] font-bold">
                  {user.name}
                </Text>
              );
            }}
            keyboardAvoidingViewProps={{ keyboardVerticalOffset: headerHeight }}
            textInputProps={{
              onChangeText: (text) => handleTyping(text),
            }}
            isTyping={remoteTyping[selectedTenant.id?.toString() || ""]}
            renderMessageText={(props) => {
              const currentMessage = props.currentMessage as any;
              const { position } = props;

              if (currentMessage.file) {
                return null;
              }

              return (
                <View className="px-2 py-1">
                  {currentMessage.isForwarded && (
                    <View className="flex-row items-center mb-1 opacity-60 ml-1">
                      <Ionicons
                        name="arrow-redo"
                        size={12}
                        color={position === "right" ? "white" : "#4b5563"}
                      />
                      <Text
                        className={`text-[10px] italic ml-1 font-medium ${
                          position === "right" ? "text-white" : "text-gray-500"
                        }`}
                      >
                        Forwarded
                      </Text>
                    </View>
                  )}
                  {/* This renders the actual message text normally */}
                  <MessageText {...props} />
                </View>
              );
            }}
            renderBubble={(props) => {
              return (
                <Bubble
                  {...props}
                  renderTicks={(currentMessage) => {
                    if (currentMessage.user._id !== String(user?.id))
                      return null;
                    if (isGroupChat)
                      return (
                        <Text style={{ color: "#9ca3af", fontSize: 10 }}>
                          ✓
                        </Text>
                      );
                    const lastReadDate = otherUserLastRead?.toDate
                      ? otherUserLastRead.toDate()
                      : null;
                    const messageDate =
                      currentMessage.createdAt instanceof Date
                        ? currentMessage.createdAt
                        : new Date(currentMessage.createdAt);

                    const isRead = lastReadDate && messageDate <= lastReadDate;

                    return (
                      <View className="mx-2">
                        <Text
                          style={{
                            color: isRead ? "#3b82f6" : "#9ca3af",
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        >
                          {isRead ? "✓✓" : "✓"}
                        </Text>
                      </View>
                    );
                  }}
                  tickStyle={
                    {
                      // You can put extra positioning styles here if needed
                    }
                  }
                  wrapperStyle={{
                    right: { backgroundColor: "#4f46e5" },
                    left: { backgroundColor: "#f3f4f6" },
                  }}
                />
              );
            }}
            reply={{
              swipe: {
                isEnabled: true,
                direction: "right",
                onSwipe: (msg) => {
                  const fileMsg = msg as IFileMessage;
                  setReplyMessage({
                    _id: fileMsg._id,
                    text: fileMsg.text || "",
                    user: fileMsg.user,
                    createdAt: fileMsg.createdAt,
                    image: fileMsg.image || undefined,
                    audio: fileMsg.audio || undefined,
                    video: fileMsg.video || undefined,
                    file: fileMsg.file || undefined,
                  });
                },
              },
              message: replyMessage,
              onClear: () => setReplyMessage(null),
              // onPress: (originalMsg) => {
              //   const index = messages.findIndex(
              //     (m) => m._id === originalMsg._id,
              //   );
              //   if (index > -1) {
              //     flatListRef.current?.scrollToIndex({ index, animated: true });
              //   }
              // },

              renderPreview: (props) => {
                if (!replyMessage) return null;

                // Determine what to show if text is empty
                const getDisplayContent = () => {
                  if (replyMessage.text) return replyMessage.text;
                  if (replyMessage.file) return `📄 ${replyMessage.file.name}`;
                  if (replyMessage.audio) return "🎤 Voice Note";
                  if (replyMessage.image) return "📷 Image";
                  if (replyMessage.video) return "🎥 Video";
                  return "Media Message";
                };

                return (
                  <View className="bg-gray-100 border-l-4 border-[#6366f1] px-4 py-2 flex-row justify-between items-center">
                    <View className="flex-1">
                      {isGroupChat && replyMessage.user?.name && (
                        <Text className="text-[#6366f1] font-bold text-[11px] mb-1">
                          Replying to {replyMessage.user.name}
                        </Text>
                      )}
                      <Text
                        numberOfLines={1}
                        className="text-gray-600 text-[13px]"
                      >
                        {getDisplayContent()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setReplyMessage(null)}
                      className="p-1"
                    >
                      <Ionicons name="close-circle" size={22} color="#4b5563" />
                    </TouchableOpacity>
                  </View>
                );
              },
              renderMessageReply: (props: any) => {
                const { replyMessage } = props;
                if (!replyMessage) return null;
                const handleScrollToOriginal = () => {
                  const index = messages.findIndex(
                    (m) => m._id === replyMessage._id,
                  );
                  if (index > -1) {
                    flatListRef.current?.scrollToIndex({
                      index,
                      animated: true,
                    });
                  }
                };
                return (
                  <TouchableOpacity onPress={handleScrollToOriginal}>
                    <View className="p-2 border-l-4 border-indigo-200 bg-white/10">
                      {isGroupChat && replyMessage.user && (
                        <Text className="text-indigo-400 text-[10px] font-bold mb-1">
                          {replyMessage.user}
                        </Text>
                      )}
                      {replyMessage.audio ? (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="mic-outline"
                            size={14}
                            color="#6366f1"
                          />
                          <Text className="text-white ml-2 text-[11px] font-bold">
                            Voice Note
                          </Text>
                        </View>
                      ) : replyMessage?.file ? (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="document-outline"
                            size={14}
                            color="#6366f1"
                          />
                          <Text
                            className="text-black ml-2 text-[11px] font-bold"
                            numberOfLines={1}
                          >
                            doc{replyMessage.file.name}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          className="text-black text-[11px]"
                          numberOfLines={2}
                        >
                          {replyMessage.text}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              },
            }}
            onLongPressMessage={(context: any, message: IFileMessage) => {
              const options = ["Reply", "Copy", "Forward", "Delete", "Cancel"];
              const cancelButtonIndex = 4;
              context.actionSheet().showActionSheetWithOptions(
                {
                  options,
                  cancelButtonIndex,
                },
                (buttonIndex?: number) => {
                  if (buttonIndex === 0) setReplyMessage(message);
                  if (buttonIndex === 1)
                    Clipboard.setString(message.text || "");
                  if (buttonIndex === 2) {
                    setMessageToForward(message);
                    setForwardModalVisible(true);
                  }
                  if (buttonIndex === 3) confirmDelete(message);
                },
              );
            }}
            onPressMessage={() => {}}
          />
        </KeyboardAvoidingView>

        {!isGroupChat && (
          <UserProfileModal
            isVisible={isProfileVisible}
            onClose={() => setIsProfileVisible(false)}
            user={selectedTenant}
            openImageModal={() => setImageModalVisible(true)}
            isOnline={onlineUsers.includes(selectedTenant.id?.toString() || "")}
            onStartCall={(user: any) =>
              alert(`Starting call with ${user.name}`)
            }
            onBlockUser={(userId: string) => handleBlockUser(userId)}
          />
        )}

        {isGroupChat && (
          <GroupProfileModal
            isVisible={isProfileVisible}
            onClose={() => setIsProfileVisible(false)}
            group={activeGroupData}
            currentUser={user}
            tenants={visibleTenants}
            estateId={user.estate_id}
            setSelectedTenant={setSelectedTenant}
          />
        )}
      </View>
    );
  }

  // --- TENANT LIST VIEW ---
  return (
    <View className="flex-1 bg-gray-50">
      <View className="flex-row bg-white border-b border-gray-100 px-4 pb-2 mt-2">
        <TouchableOpacity
          onPress={() => setCurrentTab("residents")}
          // ADDED pr-5 to create space on the right for the badge
          className={`pb-2 mr-6 pr-5 ${currentTab === "residents" ? "border-b-2 border-indigo-500" : ""}`}
        >
          <Text
            className={`font-bold ${currentTab === "residents" ? "text-indigo-600" : "text-gray-400"}`}
          >
            Residents
          </Text>
          {privateUnread > 0 && (
            <View
              // CHANGED -right-1 to 0 or 1 to sit inside the new padding
              className="absolute -top-1 right-0 bg-red-500 rounded-full flex items-center justify-center"
              style={{ minWidth: 18, height: 18 }}
            >
              <Text className="text-white text-[9px] font-bold">
                {privateUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentTab("groups")}
          // ADDED pr-5 here as well
          className={`pb-2 pr-5 ${currentTab === "groups" ? "border-b-2 border-indigo-500" : ""}`}
        >
          <Text
            className={`font-bold ${currentTab === "groups" ? "text-indigo-600" : "text-gray-400"}`}
          >
            Groups
          </Text>
          {groupUnread > 0 && (
            <View
              // CHANGED -right-0 to 0
              className="absolute -top-1 right-0 bg-red-500 rounded-full flex items-center justify-center"
              style={{ minWidth: 18, height: 18 }}
            >
              <Text className="text-white text-[9px] font-bold">
                {groupUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View className="p-4 bg-white border-b border-gray-100 flex-row items-center space-x-3">
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
          <Search size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search residents, blocks..."
            className="flex-1 ml-2 text-gray-900"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <TouchableOpacity
          onPress={() => setShowGlobalMenu(!showGlobalMenu)}
          className="p-2"
        >
          <MoreVertical size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <CreateGroupModal
        isVisible={isCreateGroupMode}
        onClose={() => {
          setIsCreateGroupMode(false);
          setSelectedGroupMembers([]);
        }}
        tenants={visibleTenants}
        selectedMembers={selectedGroupMembers}
        onToggleMember={toggleMember}
        onNext={() => setGroupNameModalVisible(true)}
        insets={insets}
        buttonText="Next"
        header="New Group"
        count={1}
      />

      <GroupNameModal
        isVisible={isGroupNameModalVisible}
        onClose={() => setGroupNameModalVisible(false)}
        groupName={groupName}
        setGroupName={setGroupName}
        onFinalize={handleFinalizeGroup}
      />

      {showGlobalMenu && (
        <>
          <TouchableOpacity
            className="absolute inset-0 z-40"
            onPress={() => setShowGlobalMenu(false)}
          />
          <View
            className="absolute right-4 top-20 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 w-48"
            style={{ elevation: 5 }}
          >
            <TouchableOpacity
              className="flex-row items-center px-4 py-3 border-b border-gray-50"
              onPress={() => {
                setShowGlobalMenu(false);
                setIsCreateGroupMode(true);
              }}
            >
              <Users size={18} color="#4f46e5" />
              <Text className="ml-3 font-medium text-gray-700">
                Create Group
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              onPress={() => {
                setShowGlobalMenu(false);
                alert("Open Blocked List Screen");
              }}
            >
              <ShieldAlert size={18} color="#f59e0b" />
              <Text className="ml-3 font-medium text-gray-700">
                Blocked List
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <FlatList
        data={currentTab === "residents" ? filteredTenants : filteredGroups}
        keyExtractor={(item) =>
          item.id?.toString() ||
          item._id?.toString() ||
          Math.random().toString()
        }
        renderItem={({ item }) => {
          const itemName =
            item.name && item.name.length > 10
              ? `${item.name.substring(0, 15)}...`
              : item?.name || "Chat";
          let unreadCount = 0;

          if (currentTab === "residents") {
            const roomId = [user.id, item.id].sort().join("_");
            const chatData = privateChats.find((chat) => chat.id === roomId);

            unreadCount = chatData?.[`unreadCount_${myId}`] || 0;
          } else {
            const myMemberData = item.members?.find(
              (m: any) => (m.user_id || m) === myId,
            );
            unreadCount = myMemberData?.unreadCount || 0;
          }
          if (currentTab === "residents") {
            return (
              <TouchableOpacity
                onPress={() => {
                  if (isCreateGroupMode) {
                    const id = item.id!.toString();
                    setSelectedGroupMembers((prev) =>
                      prev.includes(id)
                        ? prev.filter((m) => m !== id)
                        : [...prev, id],
                    );
                  } else {
                    setSelectedTenant(item);
                  }
                }}
                className={`flex-row items-center p-4 m-2 rounded-2xl border ${
                  selectedGroupMembers.includes(item.id?.toString() || "")
                    ? "bg-indigo-50 border-indigo-500"
                    : "bg-white border-indigo-50"
                }`}
              >
                <Image
                  source={{
                    uri: item.avatar || "https://via.placeholder.com/50",
                  }}
                  className="w-12 h-12 rounded-full bg-gray-200"
                />
                <View className="ml-4">
                  <Text className="font-bold text-gray-800">{itemName}</Text>
                  <Text className="text-gray-400 text-xs">
                    Block {item.block} • Unit {item.unit}
                  </Text>
                  <Text className="text-green-500 italic text-xs">
                    {remoteTyping[item.id?.toString()] ? "typing" : ""}
                  </Text>
                </View>
                {onlineUsers.includes(item.id?.toString() || "") && (
                  <View className="absolute right-4 w-3 h-3 bg-green-500 rounded-full" />
                )}
                {isCreateGroupMode && (
                  <View
                    className={`ml-auto w-6 h-6 rounded-full border-2 ${
                      selectedGroupMembers.includes(item.id?.toString() || "")
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-gray-300"
                    }`}
                  />
                )}
                {unreadCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-red-500 w-7 h-7 rounded-full items-center justify-center border-2 border-white">
                    <Text className="text-white text-[9px] font-black">
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              onPress={() => setSelectedTenant(item)}
              className="flex-row items-center p-4 m-2 rounded-2xl border bg-white border-indigo-50"
            >
              <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center">
                <Users size={24} color="#4f46e5" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="font-bold text-gray-800">{itemName}</Text>
                <Text className="text-gray-400 text-xs">
                  {item.members?.length || 0} Members
                </Text>
              </View>
              <ChevronLeft
                size={20}
                color="#cbd5e1"
                style={{ transform: [{ rotate: "180deg" }] }}
              />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 w-7 h-7 rounded-full items-center justify-center border-2 border-white">
                  <Text className="text-white text-[9px] font-black">
                    {unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export default ChatManager;
