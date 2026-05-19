import { useActionSheet } from "@expo/react-native-action-sheet";
import { Ionicons } from "@expo/vector-icons";
import Clipboard from "@react-native-clipboard/clipboard";
import auth from "@react-native-firebase/auth";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Audio, ResizeMode, Video } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { router, useLocalSearchParams } from "expo-router";
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronLeft,
  Download,
  LogOut,
  MapPin,
  MoreVertical,
  Phone,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
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
import { useEmergencyCall } from "./services/CallService";
import {
  renderActions,
  renderCustomView,
  renderMessage,
  RenderMessageAudio,
  RenderMessageImage,
  RenderMessageVideoComponent,
} from "./services/ChatRenders";
import {
  fetchAllTenants,
  getCloudinaryUrl,
  notifyGroupPush,
  sendPushNotification,
} from "./services/api";
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
    isDarkMode,
  } = useUser();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
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
  const [selectedForUnblock, setSelectedForUnblock] = useState<string[]>([]);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blockedMeIds, setBlockedMeIds] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGlobalMenu, setShowGlobalMenu] = useState(false);
  const [currentTab, setCurrentTab] = useState<"residents" | "groups">(
    "residents",
  );
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [isBlockedModalVisible, setBlockedModalVisible] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const isGroupChat = !!(selectedTenant && "isGroup" in selectedTenant);
  const [privateChats, setPrivateChats] = useState<ChatRoom[]>([]);
  const [replyMessage, setReplyMessage] = useState<IFileMessage | null>(null);
  const [isForwardModalVisible, setForwardModalVisible] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [messageToForward, setMessageToForward] = useState<IFileMessage | null>(
    null,
  );
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [selectedForForward, setSelectedForForward] = useState<string[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const { showActionSheetWithOptions } = useActionSheet();
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    type: "image" | "video";
  } | null>(null);
  const flatListRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const { autoId } = useLocalSearchParams();
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [showEstateMenu, setShowEstateMenu] = useState(false);
  const { startVoipCall, CallOverlay } = useEmergencyCall();
  const navigation = useNavigation<any>();

  const displayName =
    selectedTenant?.name && selectedTenant.name.length > 10
      ? `${selectedTenant.name.substring(0, 20)}...`
      : selectedTenant?.name || "Chat";
  const myId = user?.id?.toString();
  // const isCreator = isGroupChat ? selectedTenant.createdBy === myId : false;
  // const isAdmin =
  //   isGroupChat && myId ? selectedTenant.admins.includes(myId) : false;

  useEffect(() => {
    if (user?.estate_ids && user.estate_ids.length > 0) {
      setSelectedEstateId(user.estate_ids[0].toString());
    }
  }, [user?.estate_ids]);

  //initializer
  useEffect(() => {
    if (!selectedEstateId) return;
    const initializeChatSystem = async () => {
      try {
        const [tenantRes] = await Promise.all([
          fetchAllTenants(selectedEstateId),
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
  }, [user?.chatToken, selectedEstateId]);

  //block function
  useEffect(() => {
    if (!user?.id || !selectedEstateId) return;

    const relationsRef = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
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
  }, [user?.id, selectedEstateId]);

  useEffect(() => {
    if (!user?.id || !selectedEstateId) return;

    const unsubscribe = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
      .collection("user_relations")
      .doc(user.id.toString())
      .onSnapshot((doc) => {
        const isExisting =
          typeof doc.exists === "function" ? doc.exists() : doc.exists;
        if (doc && isExisting) {
          const data = doc.data();
          setBlockedIds(data?.blocked_users || []);
        }
      });

    return () => unsubscribe();
  }, [user?.id, selectedEstateId]);

  // Filter the full tenants list to only show blocked residents
  const blockedTenants = useMemo(() => {
    return tenants.filter((t) => blockedIds.includes(t.id?.toString() || ""));
  }, [tenants, blockedIds]);

  //unblock function
  useEffect(() => {
    if (!selectedTenant?.id || !user?.id || !selectedEstateId) return;

    const tenantId = selectedTenant.id.toString();
    const myId = user.id.toString();

    const unsubscribeReverseBlock = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
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
  }, [selectedTenant?.id, user?.id, selectedEstateId]);

  //group fetch
  useEffect(() => {
    // if (!user?.id || !user.estate_id || currentTab !== "groups") return;
    if (!user?.id || !selectedEstateId) return;
    const unsubscribe = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
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
  }, [user?.id, selectedEstateId, currentTab]);

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
      const block = t.locations?.block?.toString().toLowerCase() || "";
      const unit = t.locations?.unit?.toString().toLowerCase() || "";

      return (
        name.includes(query) || block.includes(query) || unit.includes(query)
      );
    });
  }, [visibleTenants, searchQuery]);

  useEffect(() => {
    if (autoId && visibleTenants.length > 0) {
      const target = visibleTenants.find(
        (t) => t.id === autoId || t.id === autoId,
      );
      if (target) {
        setSelectedTenant(target);
        router.setParams({ autoId: undefined, autoRoomId: undefined });
      }
    }
  }, [autoId, visibleTenants]);

  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    // Assuming 'myGroups' is your state/prop containing the user's groups
    if (!query) return groups;

    return groups.filter((g) => {
      const groupName = g.name?.toLowerCase() || "";
      return groupName.includes(query);
    });
  }, [groups, searchQuery]);

  const combinedForwardList = useMemo(() => {
    // 1. Format Groups to match the list item structure
    const formattedGroups = groups.map((g) => ({
      id: g.id,
      name: g.name,
      avatar: g.avatar,
      isGroup: true,
      memberCount: g.memberIds?.length || 0,
    }));

    const forwardList = [...visibleTenants, ...formattedGroups];
    return forwardList;
  }, [visibleTenants, groups]);

  //chatroom fetch
  useEffect(() => {
    if (!user?.id || !selectedEstateId) return;

    const myId = user.id.toString();
    const unsubscribe = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
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
  }, [user?.id, selectedEstateId]);

  //message fetch
  useEffect(() => {
    if (!selectedTenant || !user || !selectedEstateId) return;
    setIsInitialLoading(true);

    const chatCollection = isGroupChat ? "groups" : "private_chats";
    const roomId = isGroupChat
      ? selectedTenant._id || selectedTenant.id
      : [user.id, selectedTenant.id].sort().join("_");

    const roomRef = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
      .collection(chatCollection)
      .doc(roomId);

    let unsubscribeMessages: () => void;
    const unsubscribeRoom = roomRef.onSnapshot((doc) => {
      if (!doc.exists) {
        setIsInitialLoading(false);
        return;
      }
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
          const clearedTimestamp = firestore.Timestamp.fromMillis(
            Number(myClearedAt),
          );

          messageQuery = messageQuery.where("createdAt", ">", clearedTimestamp);
        }
      }

      if (unsubscribeMessages) unsubscribeMessages();

      // 3. Start the Message Listener
      unsubscribeMessages = messageQuery.limit(50).onSnapshot((snap) => {
        if (!snap) {
          setIsInitialLoading(false);
          return;
        }

        // const isCache = snap.metadata.fromCache;
        const newMsgs: IFileMessage[] = [];
        const removedIds: string[] = [];

        snap.docChanges().forEach((change) => {
          const mData = change.doc.data();
          const messageId = change.doc.id;
          // const hasPendingWrites = change.doc.metadata.hasPendingWrites;

          if (change.type === "added" || change.type === "modified") {
            newMsgs.push({
              _id: messageId,
              text: mData.text,
              createdAt: mData.createdAt?.toDate() || new Date(),
              user: mData.user,
              replyMessage: mData.replyMessage || null,
              isForwarded: mData.isForwarded ? mData.isForwarded : null,
              image: mData.image || null,
              audio: mData.audio || null,
              video: mData.video || null,
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
        setIsInitialLoading(false);
      });
    });

    return () => {
      if (unsubscribeRoom) unsubscribeRoom();
      if (unsubscribeMessages) unsubscribeMessages();
      setMessages([]);
    };
  }, [selectedTenant, user]);

  const onSend = async (newMsgs: IFileMessage[] = []) => {
    if (!selectedTenant || !selectedEstateId) return;
    const myId = user?.id?.toString();
    const messageToSend = newMsgs[0];
    const finalId = messageToSend._id.toString();
    const roomId = isGroupChat
      ? selectedTenant.id
      : [user?.id, selectedTenant.id].sort().join("_");

    const roomRef = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
      .collection(isGroupChat ? "groups" : "private_chats")
      .doc(roomId);

    console.log("FULL MESSAGE TO SEND:", messageToSend);
    console.log("Video URL:", messageToSend.video);
    // 1. Add Message
    await roomRef
      .collection("messages")
      .doc(finalId)
      .set({
        text: messageToSend.text,
        createdAt: firestore.FieldValue.serverTimestamp(),
        user: { _id: myId, name: user?.name, avatar: user?.avatar || null },
        image: messageToSend.image || null,
        audio: messageToSend.audio || null,
        video: messageToSend.video || null,
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

    if (!isGroupChat) {
      const pushData = {
        type: "chat",
        roomId: roomId,
        isGroup: isGroupChat,
        senderId: myId,
        senderName: user?.name,
      };

      const notificationBody = messageToSend.text
        ? messageToSend.text
        : messageToSend.audio
          ? "🎤 Sent a voice note"
          : messageToSend.image
            ? "📷 Sent a photo"
            : "Sent a file";
      if (selectedTenant.push_token) {
        sendPushNotification(
          selectedTenant.push_token,
          user?.name,
          notificationBody,
          pushData,
        );
      }
    } else {
      const notificationBody = messageToSend.text
        ? messageToSend.text
        : messageToSend.audio
          ? "🎤 Sent a voice note"
          : messageToSend.image
            ? "📷 Sent a photo"
            : "Sent a file";

      const allMemberIds = (selectedTenant as any).memberIds || [];
      const mutedIds = (selectedTenant as any).mutedBy || [];

      const notificationRecipients = allMemberIds.filter(
        (id: string) => id !== myId && !mutedIds.includes(id),
      );
      await notifyGroupPush({
        memberIds: notificationRecipients,
        text: notificationBody,
        roomId: roomId,
        senderName: user?.name,
        groupName: (selectedTenant as any).name,
      });
    }
    setReplyMessage(null);
  };

  const markAsRead = async () => {
    if (!selectedTenant || !selectedEstateId) return;
    const myId = user?.id?.toString();
    const roomId = isGroupChat
      ? selectedTenant.id
      : [user?.id, selectedTenant.id].sort().join("_");

    const roomRef = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
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
    if (selectedTenant && selectedEstateId) {
      markAsRead();
    }
  }, [selectedTenant, messages.length, selectedEstateId]);

  const handleBlockUser = async (targetId: string) => {
    if (!user?.id || !selectedEstateId) return;

    const roomId = [user.id, targetId].sort().join("_");
    const roomRef = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
      .collection("private_chats")
      .doc(roomId);

    try {
      await firestore()
        .collection("estate_chats")
        .doc(selectedEstateId)
        .collection("user_relations")
        .doc(user.id.toString())
        .set(
          {
            blocked_users: firestore.FieldValue.arrayUnion(targetId),
          },
          { merge: true },
        );
      await roomRef.delete();

      Alert.alert("Success", "Resident blocked and conversation removed.");

      // 3. Clear UI State
      setSelectedTenant(null);
      setIsProfileVisible(false);
    } catch (err) {
      console.error("Block Error:", err);
      Alert.alert("Error", "Failed to block resident.");
    }
  };

  const toggleUnblockMember = (id: string) => {
    setSelectedForUnblock((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBulkUnblock = async () => {
    if (!user?.id || !selectedEstateId || selectedForUnblock.length === 0) {
      setBlockedModalVisible(false);
      return;
    }

    try {
      const userRelationsRef = firestore()
        .collection("estate_chats")
        .doc(selectedEstateId)
        .collection("user_relations")
        .doc(user.id.toString());

      // Use FieldValue.arrayRemove with the entire array of IDs
      await userRelationsRef.update({
        blocked_users: firestore.FieldValue.arrayRemove(...selectedForUnblock),
      });

      Alert.alert(
        "Success",
        `${selectedForUnblock.length} residents unblocked.`,
      );
      setSelectedForUnblock([]); // Clear the selection
      setBlockedModalVisible(false); // Close modal
    } catch (err) {
      console.error("Unblock Error:", err);
      Alert.alert("Error", "Failed to unblock residents.");
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
          if (!selectedTenant || !selectedEstateId) return;
          const roomId = isGroupChat
            ? selectedTenant._id || selectedTenant.id
            : [user?.id, selectedTenant.id].sort().join("_");

          try {
            if (isGroupChat) {
              const groupRef = firestore()
                .collection("estate_chats")
                .doc(selectedEstateId)
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
                .doc(selectedEstateId)
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
      if (message.user._id !== myId) {
        Alert.alert("Error", "You can only delete your own messages.");
        return;
      }

      const roomId = isGroupChat
        ? selectedTenant.id
        : [user?.id, selectedTenant?.id].sort().join("_");

      const roomRef = firestore()
        .collection("estate_chats")
        .doc(selectedEstateId!)
        .collection(isGroupChat ? "groups" : "private_chats")
        .doc(roomId);

      // 1. Delete the actual message
      await roomRef.collection("messages").doc(message._id.toString()).delete();

      // 2. Decrement Unread Counts
      if (isGroupChat) {
        const doc = await roomRef.get();
        const members = doc.data()?.members || [];

        const updatedMembers = members.map((m: any) => {
          const userId = m.user_id || m;
          // Decrement for everyone EXCEPT the person who deleted it
          if (userId !== myId) {
            // Ensure count never goes below 0
            const currentCount = m.unreadCount || 0;
            return { ...m, unreadCount: Math.max(0, currentCount - 1) };
          }
          return m;
        });

        await roomRef.update({ members: updatedMembers });
      } else {
        // Private Chat: Decrement the OTHER person's unread field
        await roomRef.set(
          {
            [`unreadCount_${selectedTenant?.id}`]:
              firestore.FieldValue.increment(-1),
          },
          { merge: true },
        );
      }

      console.log("GateMan: Message deleted and counts adjusted.");
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  useEffect(() => {
    if (!selectedTenant?.id || !user?.id || !selectedEstateId) return;

    const tenantId = selectedTenant.id.toString();
    const estateId = selectedEstateId;

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
  }, [selectedTenant?.id, user?.id, selectedEstateId]);

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
      mutedBy: [],
      isGroup: true,
      avatar: null,
    };

    try {
      await firestore()
        .collection("estate_chats")
        .doc(selectedEstateId!)
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

  useEffect(() => {
    if (!isGroupChat || !selectedTenant?._id || !selectedEstateId) return;

    // 1. Establish the path to the group
    const groupRef = firestore()
      .collection("estate_chats")
      .doc(selectedEstateId)
      .collection("groups")
      .doc(selectedTenant._id);

    // 2. Start the Real-Time Listener
    const unsubscribe = groupRef.onSnapshot(
      (doc) => {
        const isExisting =
          typeof doc.exists === "function" ? doc.exists() : doc.exists;
        if (doc && isExisting) {
          const data = doc.data();
          const mutedList = data?.mutedBy || [];
          const isActuallyMuted = mutedList.includes(user?.id);

          setIsMuted(isActuallyMuted);
        }
      },
      (error) => {
        console.error("Firestore Listen Error:", error);
      },
    );

    // 3. Clean up the listener when leaving the chat
    return () => unsubscribe();
  }, [selectedTenant, isGroupChat, user, selectedEstateId]);

  const toggleGroupMute = async () => {
    if (!user?.id || !isGroupChat || !selectedTenant?._id) return;

    try {
      const groupRef = firestore()
        .collection("estate_chats")
        .doc(selectedEstateId!)
        .collection("groups")
        .doc(selectedTenant._id);

      await groupRef.update({
        mutedBy: isMuted
          ? firestore.FieldValue.arrayRemove(user.id)
          : firestore.FieldValue.arrayUnion(user.id),
      });

      Alert.alert(
        "Notifications",
        isMuted
          ? "Notifications unmuted for this group."
          : "Notifications muted for this group.",
      );

      // console.log(!isMuted ? "Group Muted" : "Group Unmuted");
    } catch (err) {
      console.error("Failed to toggle mute:", err);
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
              .doc(selectedEstateId!)
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
    setIsForwarding(true);
    try {
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
        // 1. Determine if this ID belongs to a Group
        // We check if the ID exists in our 'groups' state or has the 'group_' prefix
        const isGroup = groups.some((g) => (g.id || g._id) === targetId);

        const chatCollection = isGroup ? "groups" : "private_chats";

        // 2. Resolve the Room ID
        const roomId = isGroup
          ? targetId
          : [user?.id?.toString(), targetId].sort().join("_");

        const roomRef = firestore()
          .collection("estate_chats")
          .doc(selectedEstateId!)
          .collection(chatCollection)
          .doc(roomId);

        // 3. Handle Private Room Creation (Groups usually already exist)
        if (!isGroup) {
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
        }

        // 4. Add the Forwarded Message
        await roomRef.collection("messages").add({
          text: messageToForward.text || null,
          image: messageToForward.image || null,
          audio: messageToForward.audio || null,
          video: messageToForward.video || null,
          file: messageToForward.file || null,
          user: {
            _id: user?.id?.toString(),
            name: user?.name,
            avatar: user?.avatar,
          },
          createdAt: firestore.FieldValue.serverTimestamp(),
          isForwarded: true,
        });

        // 5. Update Metadata for the Chat List
        await roomRef.update({
          lastMessage: summary,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

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
      Alert.alert("GateMan", "Failed to forward some messages.");
    } finally {
      setIsForwarding(false);
    }
  };
  // 1. Camera
  // 1. THIS IS THE NEW WORKER FUNCTION
  const launchCamera = async (mediaType: any) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mediaType,
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 30,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const isVideo = asset.type === "video" || asset.uri.endsWith(".mp4"); // Extra safety check
      const localUri = asset.uri;
      const tempId = `cam-local-${Date.now()}`;
      const ghostMessage: any = {
        _id: tempId,
        createdAt: new Date(),
        user: { _id: myId || "0", name: user?.name || "User" },
        text: "",
        pending: true,
      };

      // Set correctly for UI
      if (isVideo) ghostMessage.video = localUri;
      else ghostMessage.image = localUri;

      setMessages((prev) => GiftedChat.append(prev, [ghostMessage]));

      // 3. Upload to Cloudinary
      const resourceType = isVideo ? "video" : "image";
      const webUrl = await getCloudinaryUrl(localUri, resourceType);

      if (webUrl) {
        // 4. SUCCESS: Remove Ghost and send real message
        setMessages((prev) => prev.filter((m) => m._id !== tempId));

        onSend([
          {
            _id: Math.random().toString(),
            createdAt: new Date(),
            user: { _id: myId || "0", name: user?.name || "User" },
            text: "",
            [isVideo ? "video" : "image"]: webUrl,
          },
        ]);
      }
    } catch (err) {
      console.error("Camera Launch Error:", err);
      Alert.alert("Error", "Could not access the camera.");
    }
  };

  // 5. THIS IS THE MAIN BUTTON HANDLER
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("GateMan", "Camera access is required.");
      return;
    }

    if (Platform.OS === "android") {
      Alert.alert(
        "Camera Mode",
        "Would you like to take a photo or record a video?",
        [
          { text: "Cancel", style: "cancel" },
          // Use the specific strings Expo expects for Android Intents
          { text: "📸 Photo", onPress: () => launchCamera(["images"]) },
          { text: "🎥 Video", onPress: () => launchCamera(["videos"]) },
        ],
      );
    } else {
      launchCamera(["images", "videos"]);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled) return;

    const localUri = result.assets[0].uri;
    const tempId = `local-${Date.now()}`;
    const ghostMessage = {
      _id: tempId,
      createdAt: new Date(),
      user: {
        _id: myId || "0",
        name: user?.name || "Resident",
      },
      image: localUri,
      text: "",
      pending: true,
    };

    setMessages((previousMessages) =>
      GiftedChat.append(previousMessages, [ghostMessage]),
    );

    try {
      const webUrl = await getCloudinaryUrl(localUri, "image");

      if (webUrl) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
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
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      Alert.alert(
        "GateMan Error",
        "Could not send media. Please check your network.",
      );
    }
  };

  const handleSaveMedia = async (url: string, type: "image" | "video") => {
    try {
      setIsSavingImage(true);

      // 1. Permissions Check
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need access to your gallery to save the photo.",
        );
        return;
      }

      // 2. Setup Directory & File Extension
      const gateManDir = new Directory(Paths.cache, "GateMan");
      if (!gateManDir.exists) gateManDir.create();

      // Determine extension based on type
      const extension = type === "video" ? "mp4" : "jpg";
      const localFile = new File(
        gateManDir,
        `GateMan_${Date.now()}.${extension}`,
      );

      console.log(`GateMan: Downloading ${type}...`);

      // 3. Download Logic
      const downloadedFile = await File.downloadFileAsync(url, localFile);

      if (downloadedFile && downloadedFile.exists) {
        try {
          // 4. Save to Media Library
          const asset = await MediaLibrary.createAssetAsync(downloadedFile.uri);
          await MediaLibrary.createAlbumAsync("GateMan", asset, false);

          Alert.alert(
            "Success",
            `${type === "image" ? "Image" : "Video"} saved to your gallery!`,
          );
        } catch (mediaError: any) {
          if (
            mediaError.message.includes("user denied") ||
            mediaError.message.includes("User rejected")
          ) {
            Alert.alert(
              "Cancelled",
              "Media was not saved because permission was declined.",
            );
          } else {
            throw mediaError;
          }
        }
      }
    } catch (error: any) {
      console.error("GateMan Save Error:", error);
      if (error.message.includes("timeout")) {
        Alert.alert(
          "Network Error",
          "The download timed out. Check your data connection.",
        );
      } else {
        Alert.alert("Error", "An unexpected error occurred while saving.");
      }
    } finally {
      setIsSavingImage(false);
    }
  };

  // 3. Documents (PDFs, etc.)
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword", "text/plain"],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const isDoc =
      asset.mimeType?.includes("pdf") ||
      asset.mimeType?.includes("word") ||
      asset.mimeType?.includes("text");

    if (!isDoc) {
      Alert.alert(
        "GateMan",
        "Please select a valid document (PDF, Word, or TXT).",
      );
      return;
    }
    const tempId = `d-local-${Date.now()}`;

    // 1. Create Local Ghost
    const ghostDoc = {
      _id: tempId,
      createdAt: new Date(),
      user: { _id: myId || "0", name: user?.name || "User" },
      text: `📄 ${asset.name}`,
      file: {
        url: asset.uri, // Local URI for the ghost
        name: asset.name,
        type: asset.mimeType || "application/octet-stream",
      },
      pending: true,
    };

    setMessages((prev) => GiftedChat.append(prev, [ghostDoc]));

    try {
      const webUrl = await getCloudinaryUrl(asset.uri, "document");
      if (webUrl) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        onSend([
          {
            ...ghostDoc,
            _id: Math.random().toString(),
            file: { ...ghostDoc.file, url: webUrl },
            pending: false,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      Alert.alert("Error", "Document upload failed.");
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "videos",
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled) return;

    const localUri = result.assets[0].uri;
    const tempId = `v-local-${Date.now()}`;

    // 1. Create Local Ghost
    const ghostVideo = {
      _id: tempId,
      createdAt: new Date(),
      user: { _id: myId || "anon", name: user?.name },
      video: localUri,
      text: "",
      pending: true,
    };

    setMessages((prev) => GiftedChat.append(prev, [ghostVideo]));

    try {
      const webUrl = await getCloudinaryUrl(localUri, "video");
      if (webUrl) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        onSend([
          {
            ...ghostVideo,
            _id: Math.random().toString(),
            video: webUrl,
            pending: false,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      Alert.alert("Error", "Video upload failed.");
    }
  };

  // --- START RECORDING ---
  const startAudioRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        const request = await Audio.requestPermissionsAsync();
        if (request.status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "GateMan needs microphone access to send voice notes.",
          );
          return;
        }
        ToastAndroid.show(
          "Permission granted! Tap again to record.",
          ToastAndroid.SHORT,
        );
        return;
      }

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
      // 1. Stop the hardware
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        const tempId = `audio-local-${Date.now()}`;

        // 2. Create the Local Ghost Message
        const ghostAudio = {
          _id: tempId,
          createdAt: new Date(),
          user: { _id: myId || "anon", name: user?.name || "User" },
          audio: uri, // Local file path
          text: "",
          pending: true, // Shows the "Uploading" state in the bubble
        };

        // 3. Update UI immediately
        setMessages((prev) => GiftedChat.append(prev, [ghostAudio]));

        // 4. Upload to Cloudinary
        const remoteUrl = await getCloudinaryUrl(uri, "video");

        if (remoteUrl) {
          // 5. SUCCESS: Remove Ghost and Send Real Message to Firestore
          setMessages((prev) => prev.filter((m) => m._id !== tempId));

          onSend([
            {
              _id: Math.random().toString(),
              createdAt: new Date(),
              user: { _id: myId || "anon", name: user?.name || "User" },
              audio: remoteUrl,
              text: "",
              pending: false,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      setRecording(null);
      Alert.alert("GateMan", "Failed to process voice note.");
    }
  };

  const handleStartCall = async () => {
    const channelName = `gate_man_${selectedTenant?.id}`;

    const callData = {
      type: "emergency_call",
      channelName: channelName,
      senderName: user?.name,
      senderId: myId,
    };

    if (socket) {
      socket.emit("initiate_call", callData);
    }

    // 1. Send the push to the Tenant
    if (!isGroupChat && selectedTenant && selectedTenant.push_token) {
      await sendPushNotification(
        selectedTenant.push_token,
        "🚨 INCOMING CALL",
        `${user?.name} is calling you!`,
        callData,
      );
    }

    // 2. Navigate yourself to the call page
    navigation.navigate("EmergencyCallPage", {
      channelName: callData.channelName,
      residentName: selectedTenant?.name,
    });
  };
  const renderItem = ({ item }: { item: any }) => {
    const itemName =
      item.name && item.name.length > 10
        ? `${item.name.substring(0, 15)}...`
        : item?.name || "Chat";
    let unreadCount = 0;

    if (currentTab === "residents") {
      const roomId = [user?.id, item.id].sort().join("_");
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
  };

  const renderChatFooter = () => {
    if (recording) {
      return (
        <View className="h-10 bg-white flex-row items-center justify-end px-4 border-t border-gray-100">
          {/* Pulsing Red Dot */}
          <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />

          <Text className="text-red-500 font-bold text-[12px]">
            RECORDING VOICE...
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderLoading = () => (
    <View className="h-full justify-center items-center bg-transparent">
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );

  if (!selectedEstateId) {
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
        <CallOverlay />
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
          tenants={combinedForwardList}
          selectedMembers={selectedForForward}
          onToggleMember={toggleForwardMember}
          onNext={() => handleForwardMessage(selectedForForward)}
          insets={insets}
          buttonText="Send"
          header="Forward Message"
          count={0}
        />

        <View className="flex-row items-center p-4 border-b border-gray-100 bg-white">
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
              {/* Check if active estate key exists in tenant dictionary profile before rendering */}
              {!isGroupChat &&
                selectedEstateId &&
                selectedTenant?.locations?.[selectedEstateId]?.[0] && (
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">
                    Block {selectedTenant.locations[selectedEstateId][0].block}{" "}
                    • Unit{" "}
                    {selectedTenant.locations[selectedEstateId][0].unit.join(
                      ", ",
                    )}
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
                      handleStartCall();
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
                    <>
                      <TouchableOpacity
                        className="flex-row items-center px-4 py-3 border-t border-gray-50"
                        onPress={() => {
                          setShowMenu(false);
                          toggleGroupMute();
                        }}
                      >
                        {isMuted ? (
                          <>
                            <Bell size={18} color="#6b7280" />
                            <Text className="ml-3 font-medium text-gray-600">
                              Unmute Notifications
                            </Text>
                          </>
                        ) : (
                          <>
                            <BellOff size={18} color="#6b7280" />
                            <Text className="ml-3 font-medium text-gray-600">
                              Mute Notifications
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
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
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
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
            renderChatFooter={renderChatFooter}
            renderLoading={renderLoading}
            renderMessageAudio={RenderMessageAudio}
            renderMessageVideo={(props) => (
              <RenderMessageVideoComponent
                {...props}
                onOpen={(url: any) => {
                  setSelectedMedia({ url, type: "video" });
                }}
              />
            )}
            renderMessageImage={(props) => (
              <RenderMessageImage
                {...props}
                onOpen={(url: any) => setSelectedMedia({ url, type: "image" })}
              />
            )}
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
          <Modal
            visible={!!selectedMedia}
            animationType="fade"
            transparent={false}
          >
            <View className="flex-1 bg-black/95 justify-center items-center">
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setSelectedMedia(null)}
                className="absolute top-12 right-6 z-20 bg-white/20 p-2 rounded-full"
              >
                <X size={24} color="white" />
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                onPress={() =>
                  handleSaveMedia(selectedMedia!.url, selectedMedia!.type)
                }
                disabled={isSavingImage}
                className="absolute top-12 left-6 z-20 bg-indigo-600 p-2 rounded-full"
              >
                {isSavingImage ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Download size={24} color="white" />
                )}
              </TouchableOpacity>

              {selectedMedia?.type === "image" && (
                <Image
                  source={{ uri: selectedMedia.url }}
                  style={{
                    width: "100%",
                    height: "100%",
                    resizeMode: "contain",
                  }}
                />
              )}

              {selectedMedia?.type === "video" && (
                <Video
                  source={{ uri: selectedMedia.url }}
                  style={{ width: "100%", height: "80%" }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={true}
                />
              )}
            </View>
          </Modal>
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
            estateId={selectedEstateId}
            setSelectedTenant={setSelectedTenant}
          />
        )}
      </View>
    );
  }

  // --- TENANT LIST VIEW ---
  return (
    <View className="flex-1 bg-gray-50">
      {user?.estate_ids && user.estate_ids.length > 1 && (
        <View className="bg-white px-4 pt-3 pb-1 border-b border-gray-100 z-50">
          <TouchableOpacity
            onPress={() => setShowEstateMenu(!showEstateMenu)}
            className="flex-row items-center justify-between bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl"
          >
            <View className="flex-row items-center flex-1">
              <MapPin size={16} color="#4f46e5" />
              <Text
                className="ml-2 font-bold text-gray-800 text-sm flex-1"
                numberOfLines={1}
              >
                Chatting in:{" "}
                {user.estates?.find((e) => e.id.toString() === selectedEstateId)
                  ?.name || "Select Estate"}
              </Text>
            </View>
            <ChevronDown size={16} color="#64748b" />
          </TouchableOpacity>

          {/* Dropdown Options overlay */}
          {showEstateMenu && (
            <View className="absolute left-4 right-4 top-[52px] bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1">
              {user.estates?.map((estate) => (
                <TouchableOpacity
                  key={estate.id}
                  onPress={() => {
                    setSelectedEstateId(estate.id.toString());
                    setShowEstateMenu(false);
                  }}
                  className={`px-4 py-3 border-b border-gray-50 last:border-b-0 flex-row items-center justify-between ${
                    selectedEstateId === estate.id.toString()
                      ? "bg-indigo-50/40"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-sm ${selectedEstateId === estate.id.toString() ? "text-indigo-600 font-bold" : "text-gray-700"}`}
                  >
                    {estate.name}
                  </Text>
                  {selectedEstateId === estate.id.toString() && (
                    <View className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
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

      <CreateGroupModal
        isVisible={isBlockedModalVisible}
        onClose={() => {
          setBlockedModalVisible(false);
          setSelectedForUnblock([]);
        }}
        tenants={blockedTenants}
        selectedMembers={selectedForUnblock}
        onToggleMember={toggleUnblockMember}
        onNext={handleBulkUnblock}
        insets={insets}
        buttonText={selectedForUnblock.length > 0 ? "Unblock" : "Done"}
        header="Blocked Residents"
        count={0}
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
                setBlockedModalVisible(true);
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
        renderItem={renderItem}
      />
    </View>
  );
};

export default ChatManager;
