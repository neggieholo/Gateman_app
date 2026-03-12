import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { ChevronLeft } from "lucide-react-native"; // Clean back button
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GiftedChat, IMessage } from "react-native-gifted-chat";
import { UserContext } from "./UserContext";
import { User } from "./services/interfaces";
import { fetchAllTenants } from "./services/api";

const ChatManager = () => {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Partial<User>[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Partial<User> | null>(
    null,
  );
  const [messages, setMessages] = useState<IMessage[]>([]);

  useEffect(() => {
    const initializeChatSystem = async () => {
      try {
        // Promise.all ensures both finish before we hide the ActivityIndicator
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

  // Listen for messages ONLY when a tenant is selected
  useEffect(() => {
    if (!selectedTenant || !user) return;

    const roomId = [user.id, selectedTenant.id].sort().join("_");

    const unsubscribe = firestore()
      .collection("estate_chats")
      .doc(user.estate_id)
      .collection("private_chats")
      .doc(roomId)
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
      unsubscribe();
      setMessages([]); // Clear messages when switching tenants
    };
  }, [selectedTenant, user]);

  const onSend = (newMsgs: IMessage[] = []) => {
    if (!selectedTenant || !user?.estate_id) return; // Added estate_id safety check
    const roomId = [user.id, selectedTenant.id].sort().join("_");

    firestore()
      .collection("estate_chats")
      .doc(user.estate_id) // Add this!
      .collection("private_chats")
      .doc(roomId)
      .collection("messages")
      .add({
        text: newMsgs[0].text,
        createdAt: firestore.FieldValue.serverTimestamp(),
        user: newMsgs[0].user,
      });
  };

  if (loading)
    return (
      <ActivityIndicator size="large" className="flex-1" color="#0000ff" />
    );

  // View 1: THE CHAT VIEW
  if (selectedTenant) {
    return (
      <View className="flex-1 bg-white">
        {/* Header with Back Button */}
        <View className="flex-row items-center p-4 border-b border-gray-200 pt-12">
          <TouchableOpacity onPress={() => setSelectedTenant(null)}>
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>
          <Text className="ml-4 font-bold text-lg">{selectedTenant.name}</Text>
        </View>

        <GiftedChat
          messages={messages}
          onSend={onSend}
          user={{ _id: user?.id?.toString() || "0", name: user?.name }}
        />
      </View>
    );
  }

  // View 2: THE TENANT LIST
  return (
    <View className="flex-1 bg-gray-50 pt-12">
      <Text className="text-2xl font-bold p-4">Estate Messages</Text>
      <FlatList
        data={tenants}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedTenant(item)}
            className="flex-row items-center p-4 m-2 bg-white rounded-2xl shadow-sm"
          >
            <Image
              source={{ uri: item.avatar || "https://via.placeholder.com/50" }}
              className="w-12 h-12 rounded-full bg-gray-200"
            />
            <View className="ml-4">
              <Text className="font-bold text-gray-800">{item.name}</Text>
              <Text className="text-gray-500">
                Block {item.block} • Unit {item.unit}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default ChatManager;
