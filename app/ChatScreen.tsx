import auth from "@react-native-firebase/auth";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { useHeaderHeight } from "@react-navigation/elements";
import { ChevronLeft, MoreVertical, Phone, Search, ShieldAlert, Trash2, Users } from "lucide-react-native";
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
  TouchableOpacity,
  View,
} from "react-native";
import { Bubble, GiftedChat, IMessage } from "react-native-gifted-chat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "./UserContext";
import UserProfileModal from "./components/ChatProfile";
import { fetchAllTenants } from "./services/api";
import { User } from "./services/interfaces";

const ChatManager = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // const keyboardOffset =
  //   Platform.OS === "ios" ? headerHeight + insets.bottom + 10 : 0;
  const { user, onlineUsers, socket, remoteTyping } = useUser();

  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Partial<User>[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Partial<User> | null>(
    null,
  );
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

  useEffect(() => {
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
  }, [user?.chatToken]);

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

  const visibleTenants = useMemo(() => {
    return tenants.filter((t) => {
      const id = t.id?.toString() || "";
      return !blockedUserIds.includes(id) && !blockedMeIds.includes(id);
    });
  }, [tenants, blockedUserIds, blockedMeIds]);

  const filteredTenants = useMemo(() => {
    return visibleTenants.filter(
      (t) =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.block?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.unit?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [visibleTenants, searchQuery]);

  useEffect(() => {
    if (!selectedTenant || !user || !user.estate_id) return;

    const roomId = [user.id, selectedTenant.id].sort().join("_");
    const roomRef = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection("private_chats")
      .doc(roomId);

    const unsubscribeRoom = roomRef.onSnapshot((doc) => {
      const isExisting =
        typeof doc.exists === "function" ? doc.exists() : doc.exists;
      if (doc && isExisting) {
        const data = doc.data();
        const lastRead = data?.[`lastRead_${selectedTenant.id}`];
        if (lastRead) setOtherUserLastRead(lastRead);
      }
    });

    const unsubscribeMessages = roomRef
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(50)
      .onSnapshot((snap) => {
        if (!snap) return;
        const msgs = snap
          .docChanges()
          .filter((change) => change.type === "added")
          .map((change) => {
            const data = change.doc.data();
            return {
              _id: change.doc.id,
              text: data.text,
              createdAt: data.createdAt?.toDate() || new Date(),
              user: data.user,
            } as IMessage;
          });

        setMessages((prev) => GiftedChat.append(prev, msgs));
      });

    return () => {
      unsubscribeMessages();
      unsubscribeRoom();
      setMessages([]);
    };
  }, [selectedTenant, user]);

  const onSend = (newMsgs: IMessage[] = []) => {
    if (!selectedTenant || !user?.estate_id) return;
    const roomId = [user.id, selectedTenant.id].sort().join("_");

    const message = {
      text: newMsgs[0].text,
      createdAt: firestore.FieldValue.serverTimestamp(),
      user: {
        _id: user?.id?.toString(),
        name: user?.name,
        avatar: user?.avatar || null,
      },
    };

    firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection("private_chats")
      .doc(roomId)
      .collection("messages")
      .add(message);
  };

  const markAsRead = async () => {
    if (!selectedTenant || !user?.estate_id) return;
    const roomId = [user.id, selectedTenant.id].sort().join("_");

    await firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection("private_chats")
      .doc(roomId)
      .set(
        {
          [`lastRead_${user.id}`]: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  };

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

  useEffect(() => {
    if (selectedTenant && user?.estate_id) {
      markAsRead();
    }
  }, [selectedTenant, messages.length]);

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
    Alert.alert(
      "Clear Chat",
      "This will permanently delete all messages in this conversation.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            if (!selectedTenant?.id || !user?.estate_id) return;

            const roomId = [user.id, selectedTenant.id].sort().join("_");
            const messagesRef = firestore()
              .collection("estate_chats")
              .doc(user.estate_id)
              .collection("private_chats")
              .doc(roomId)
              .collection("messages");

            try {
              // Fetch all message docs
              const snapshot = await messagesRef.get();

              if (snapshot.empty) {
                setMessages([]);
                return;
              }

              const batch = firestore().batch();
              snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
              });

              await batch.commit();

              // Success: Wipe local state
              setMessages([]);
              Alert.alert("Success", "Chat history cleared.");
            } catch (err) {
              console.error("Clear chat error:", err);
              Alert.alert("Error", "Failed to clear messages.");
            }
          },
        },
      ],
    );
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

        <View
          style={{ paddingTop: insets.top }}
          className="flex-row items-center p-4 border-b border-gray-100 bg-white"
        >
          <TouchableOpacity
            onPress={() => setSelectedTenant(null)}
            className="pr-2 mr-12"
          >
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>

          <View className="flex-1 flex-row justify-center items-center">
            <TouchableOpacity onPress={() => setImageModalVisible(true)}>
              <Image
                source={{
                  uri:
                    selectedTenant.avatar || "https://via.placeholder.com/50",
                }}
                className="w-10 h-10 rounded-full bg-gray-200"
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="ml-3 flex-1"
              onPress={() => setIsProfileVisible(true)}
            >
              <Text className="font-bold text-lg text-gray-900">
                {selectedTenant.name}
              </Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase">
                Block {selectedTenant.block} • Unit {selectedTenant.unit}
              </Text>
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
            onSend={onSend}
            user={{ _id: user?.id?.toString() || "0", name: user?.name }}
            keyboardAvoidingViewProps={{ keyboardVerticalOffset: headerHeight }}
            textInputProps={{
              onChangeText: (text) => handleTyping(text),
            }}
            isTyping={remoteTyping[selectedTenant.id?.toString() || ""]}
            renderBubble={(props) => {
              return (
                <Bubble
                  {...props}
                  renderTicks={(currentMessage) => {
                    if (currentMessage.user._id !== String(user?.id))
                      return null;
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
          />
        </KeyboardAvoidingView>

        <UserProfileModal
          isVisible={isProfileVisible}
          onClose={() => setIsProfileVisible(false)}
          user={selectedTenant}
          openImageModal={() => setImageModalVisible(true)}
          isOnline={onlineUsers.includes(selectedTenant.id?.toString() || "")}
          onStartCall={(user) => {
            alert(`Starting call with ${user.name}`);
          }}
          onBlockUser={(userId) => {
            handleBlockUser(userId);
          }}
        />
      </View>
    );
  }

  // --- TENANT LIST VIEW ---
  return (
    <View className="flex-1 bg-gray-50">
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

      {/* Global Dropdown Menu */}
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
                alert("Create Group logic here");
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
        data={visibleTenants}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedTenant(item)}
            className="flex-row items-center p-4 m-2 bg-white rounded-2xl shadow-sm border border-indigo-50"
          >
            <Image
              source={{ uri: item.avatar || "https://via.placeholder.com/50" }}
              className="w-12 h-12 rounded-full bg-gray-200"
            />
            <View className="ml-4">
              <Text className="font-bold text-gray-800">{item.name}</Text>
              <Text className="text-gray-400 text-xs">
                Block {item.block} • Unit {item.unit}
              </Text>
            </View>
            {onlineUsers.includes(item.id?.toString() || "") && (
              <View className="absolute right-4 w-3 h-3 bg-green-500 rounded-full" />
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default ChatManager;
