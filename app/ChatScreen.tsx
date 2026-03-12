import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { ChevronLeft } from "lucide-react-native";
import React, { useContext, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GiftedChat, IMessage } from "react-native-gifted-chat";
import { UserContext } from "./UserContext";
import { fetchAllTenants } from "./services/api";
import { User } from "./services/interfaces";
import UserProfileModal from "./components/ChatProfile";

const ChatManager = () => {
  const insets = useSafeAreaInsets();
  const { user } = useContext(UserContext);
  
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Partial<User>[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Partial<User> | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);

  // Initialize System & Auth
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

  // Real-time Message Listener
  useEffect(() => {
    if (!selectedTenant || !user || !user.estate_id) return;

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
      <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
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
              source={{ uri: selectedTenant.avatar || "https://via.placeholder.com/300" }}
              className="w-full h-[500px]"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Modal>

        <View 
          style={{ paddingTop: insets.top }} 
          className="flex-row items-center p-4 border-b border-gray-100 bg-white"
        >
          <TouchableOpacity onPress={() => setSelectedTenant(null)} className="pr-2 mr-12">
            <ChevronLeft size={28} color="#000" />
          </TouchableOpacity>

          <View className="flex-1 flex-row justify-center items-center">
            <TouchableOpacity onPress={() => setImageModalVisible(true)}>
              <Image
                source={{ uri: selectedTenant.avatar || "https://via.placeholder.com/50" }}
                className="w-10 h-10 rounded-full bg-gray-200"
              />
            </TouchableOpacity>

            <TouchableOpacity
              className="ml-3 flex-1"
              onPress={() => setIsProfileVisible(true)}
            >
              <Text className="font-bold text-lg text-gray-900">{selectedTenant.name}</Text>
              <Text className="text-gray-400 text-[10px] font-bold uppercase">
                Block {selectedTenant.block} • Unit {selectedTenant.unit}
              </Text>
            </TouchableOpacity>
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
          />
        </KeyboardAvoidingView>

        <UserProfileModal 
          isVisible={isProfileVisible} 
          onClose={() => setIsProfileVisible(false)} 
          user={selectedTenant} 
        />
      </View>
    );
  }

  // --- TENANT LIST VIEW ---
  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-black text-gray-900">Residents & Groups</Text>
      </View>
      <FlatList
        data={tenants}
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
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default ChatManager;