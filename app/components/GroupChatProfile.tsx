import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import {
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useUser } from "../UserContext";
import { GroupUserProfileModal } from "./ChatProfile";
import { AddMembersModal } from "./CreateChatGroupModal";

interface GroupProfileProps {
  isVisible: boolean;
  onClose: () => void;
  group: any; // ChatGroup
  currentUser: any;
  tenants: any[];
  estateId: string;
  setSelectedTenant: (tenant: any) => void;
}

const GroupProfileModal = ({
  isVisible,
  onClose,
  group,
  currentUser,
  tenants,
  estateId,
  setSelectedTenant,
}: GroupProfileProps) => {
  const { isDarkMode } = useUser();
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(group?.name || "");
  const [isUploading, setIsUploading] = useState(false);
  const displayName =
    group.name?.length > 10 ? `${group.name.substring(0, 14)}...` : group.name;
  const [isShowingFullName, setIsShowingFullName] = useState<boolean>(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  const filteredParticipants = useMemo(() => {
    const query = memberSearchQuery.toLowerCase().trim();
    const allMembers = group.members || [];

    if (!query) return allMembers;

    return allMembers.filter((member: any) => {
      const memberId = member.user_id || member;
      const resident = tenants.find((t) => t.id?.toString() === memberId);
      const name = resident?.name?.toLowerCase() || "";
      return name.includes(query);
    });
  }, [group.members, tenants, memberSearchQuery]);

  if (!group) return null;

  const myId = currentUser?.id?.toString();
  const isCreator = group.createdBy === myId;
  const isAdmin = group.admins?.includes(myId);

  const handleAddMembers = async (newlySelectedIds: string[]) => {
    const groupRef = firestore()
      .collection("estate_chats")
      .doc(estateId)
      .collection("groups")
      .doc(group._id);

    const now = new Date();
    const newMemberObjects = newlySelectedIds.map((id) => ({
      user_id: id,
      clearedAt: now,
    }));

    try {
      await groupRef.update({
        members: firestore.FieldValue.arrayUnion(...newMemberObjects),
        memberIds: firestore.FieldValue.arrayUnion(...newlySelectedIds),
      });

      Alert.alert("Success", "Members added.");
      setIsAddingMembers(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not add members.");
    }
  };

  const handleRemoveMember = async (targetId: string, targetName: string) => {
    if (targetId === group.createdBy) {
      Alert.alert("Action Denied", "The group creator cannot be removed.");
      return;
    }

    if (group.memberIds.length <= 3) {
      Alert.alert(
        "Action Denied",
        "Groups must have at least 3 members. To reduce the group further, you must delete the group entirely or exit.",
      );
      return;
    }

    const targetIsAdmin = group.admins?.includes(targetId);
    if (isAdmin && !isCreator && targetIsAdmin) {
      Alert.alert("Action Denied", "Admins cannot remove other admins.");
      return;
    }

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${targetName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const groupRef = firestore()
                .collection("estate_chats")
                .doc(estateId)
                .collection("groups")
                .doc(group._id);

              const currentMemberObj = group.members.find(
                (m: any) => (m.user_id || m) === targetId,
              );

              await groupRef.update({
                members: firestore.FieldValue.arrayRemove(currentMemberObj),
                memberIds: firestore.FieldValue.arrayRemove(targetId),
                admins: firestore.FieldValue.arrayRemove(targetId),
              });
            } catch (err) {
              Alert.alert("Error", "Failed to remove member.");
            }
          },
        },
      ],
    );
  };

  const handleDeleteGroup = () => {
    if (!isCreator) return;

    Alert.alert(
      "Delete Group",
      "This action is permanent. All messages and data for this group will be erased.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            try {
              const groupRef = firestore()
                .collection("estate_chats")
                .doc(estateId)
                .collection("groups")
                .doc(group._id);

              await groupRef.delete();
              onClose();
              setSelectedTenant(null);
              Alert.alert("Success", "Group deleted.");
            } catch (err) {
              Alert.alert("Error", "Failed to delete group.");
            }
          },
        },
      ],
    );
  };

  const handleToggleAdmin = async (
    targetId: string,
    targetName: string,
    isCurrentlyAdmin: boolean,
  ) => {
    if (!isCreator) {
      Alert.alert("Denied", "Only the group creator can manage admin roles.");
      return;
    }

    const title = isCurrentlyAdmin ? "Remove Admin" : "Promote to Admin";
    const message = isCurrentlyAdmin
      ? `Are you sure you want to remove admin privileges from ${targetName}?`
      : `Are you sure you want to make ${targetName} a group admin?`;

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: isCurrentlyAdmin ? "Remove" : "Promote",
        onPress: async () => {
          const groupRef = firestore()
            .collection("estate_chats")
            .doc(estateId)
            .collection("groups")
            .doc(group._id);

          try {
            if (isCurrentlyAdmin) {
              await groupRef.update({
                admins: firestore.FieldValue.arrayRemove(targetId),
              });
            } else {
              await groupRef.update({
                admins: firestore.FieldValue.arrayUnion(targetId),
              });
            }
          } catch (err) {
            Alert.alert("Error", "Failed to update admin status.");
          }
        },
      },
    ]);
  };

  const handleUpdateGroup = async (field: string, value: string) => {
    if (!isAdmin && !isCreator) return;

    try {
      const groupRef = firestore()
        .collection("estate_chats")
        .doc(estateId)
        .collection("groups")
        .doc(group._id);

      await groupRef.update({
        [field]: value,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert("Success", `Group ${field} updated.`);
    } catch (err) {
      Alert.alert("Error", "Failed to update group settings.");
    }
  };

  const handleUpdateGroupName = () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Group name cannot be empty.");
      return;
    }
    handleUpdateGroup("name", newName);
    setIsEditingName(false);
  };

  const handleUpdateAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need access to your photos to change the group avatar.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    setIsUploading(true);
    const localUri = result.assets[0].uri;

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: localUri,
        type: "image/jpeg",
        name: `group_${group._id}.jpg`,
      } as any);

      const cloudName = "diubaoqcr";
      formData.append("upload_preset", "gateman uploads");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();
      const imageUrl = data.secure_url;

      await handleUpdateGroup("avatar", imageUrl);
      Alert.alert("Success", "Group avatar updated!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Modal
        visible={isVisible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View
            className={`rounded-t-[40px] h-[90%] overflow-hidden ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
          >
            {/* Modal Header */}
            <View
              className={`flex-row justify-between items-center px-6 pt-6 pb-4 border-b ${
                isDarkMode
                  ? "bg-slate-950 border-slate-800"
                  : "bg-white border-gray-50"
              }`}
            >
              <TouchableOpacity
                onPress={onClose}
                className={`p-2 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}
              >
                <X size={24} color={isDarkMode ? "#f8fafc" : "#000"} />
              </TouchableOpacity>
              <Text
                className={`text-lg font-bold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}
              >
                Group Info
              </Text>
              {isCreator ? (
                <TouchableOpacity
                  onPress={handleDeleteGroup}
                  className={`p-2 rounded-full ${isDarkMode ? "bg-red-950/40" : "bg-red-50"}`}
                >
                  <Trash2 size={22} color="#ef4444" />
                </TouchableOpacity>
              ) : (
                <View className="w-10" />
              )}
            </View>

            <View className="px-4">
              {/* Profile Avatar & Info Block */}
              <View className="items-center mt-6 mb-8">
                <TouchableOpacity
                  onPress={handleUpdateAvatar}
                  disabled={isUploading}
                  className="relative"
                >
                  <View
                    className={`w-32 h-32 rounded-full items-center justify-center border-4 overflow-hidden ${
                      isDarkMode
                        ? "bg-indigo-950/50 border-slate-800"
                        : "bg-indigo-100 border-indigo-50"
                    }`}
                  >
                    {isUploading ? (
                      <ActivityIndicator color="#4f46e5" />
                    ) : group.avatar ? (
                      <Image
                        source={{ uri: group.avatar }}
                        className="w-full h-full"
                      />
                    ) : (
                      <Users size={60} color="#4f46e5" />
                    )}
                  </View>

                  {(isCreator || isAdmin) && (
                    <View
                      className={`absolute bottom-1 right-1 bg-indigo-600 p-2 rounded-full border-4 ${
                        isDarkMode ? "border-slate-900" : "border-white"
                      }`}
                    >
                      <Pencil size={14} color="white" />
                    </View>
                  )}
                </TouchableOpacity>

                <View className="flex-row items-center mt-4">
                  <TouchableOpacity
                    onPress={() => setIsShowingFullName(true)}
                    activeOpacity={0.7}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-2xl font-black ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
                    >
                      {displayName}
                    </Text>
                  </TouchableOpacity>
                  {(isCreator || isAdmin) && (
                    <TouchableOpacity
                      onPress={() => {
                        setNewName(group.name);
                        setIsEditingName(true);
                      }}
                      className={`ml-2 p-1.5 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}
                    >
                      <Pencil
                        size={14}
                        color={isDarkMode ? "#94a3b8" : "#6b7280"}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View
                  className={`flex-row items-center mt-2 px-4 py-1.5 rounded-full ${isDarkMode ? "bg-slate-950" : "bg-gray-100"}`}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}
                  >
                    Created by{" "}
                    {isCreator
                      ? "You"
                      : tenants.find(
                          (t) => t.id?.toString() === group.createdBy,
                        )?.name || "Estate Admin"}
                  </Text>
                </View>
              </View>

              {/* Quick Counter Grid */}
              <View className="flex-row justify-between mb-8">
                <View
                  className={`flex-1 rounded-2xl p-4 items-center mr-2 border ${
                    isDarkMode
                      ? "bg-slate-950 border-slate-800"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <Text className="text-indigo-600 font-black text-xl">
                    {group.members?.length || 0}
                  </Text>
                  <Text
                    className={`text-[10px] font-bold uppercase ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    Members
                  </Text>
                </View>

                {(isCreator || isAdmin) && (
                  <TouchableOpacity
                    onPress={() => setIsAddingMembers(true)}
                    className="bg-indigo-600 flex-1 rounded-2xl p-4 items-center ml-2 shadow-sm shadow-indigo-200"
                  >
                    <UserPlus size={24} color="white" />
                    <Text className="text-white text-[10px] font-bold uppercase mt-1">
                      Add Member
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* List Section Header */}
              <View className="mb-2 flex-row justify-between items-center">
                <Text
                  className={`font-black text-lg ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
                >
                  Participants
                </Text>
              </View>
            </View>

            {/* Inline Sub-Member Finder Bar */}
            <View className="px-6 mb-4">
              <View
                className={`flex-row items-center border rounded-2xl px-3 py-1 ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-800"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <Search size={18} color={isDarkMode ? "#64748b" : "#9ca3af"} />
                <TextInput
                  placeholder="Find a member..."
                  className={`flex-1 h-10 ml-2 font-medium ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}
                  value={memberSearchQuery}
                  onChangeText={setMemberSearchQuery}
                  autoCorrect={false}
                  placeholderTextColor={isDarkMode ? "#64748b" : "#9ca3af"}
                />
                {memberSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setMemberSearchQuery("")}>
                    <X
                      size={14}
                      color={isDarkMode ? "#64748b" : "#9ca3af"}
                      className="mr-2"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Scrollable Members Body */}
            <ScrollView showsVerticalScrollIndicator={false} className="px-6">
              <View className="space-y-3 pb-24">
                {filteredParticipants.length > 0 ? (
                  filteredParticipants.map((member: any) => {
                    const memberId = member.user_id || member;
                    const resident = tenants.find(
                      (t) => t.id?.toString() === memberId,
                    );
                    const isMe = memberId === myId;
                    const isTargetAdmin = group.admins?.includes(memberId);
                    const isTargetCreator = memberId === group.createdBy;

                    return (
                      <View
                        key={memberId}
                        className={`flex-row items-center p-4 rounded-3xl border mb-3 shadow-sm ${
                          isDarkMode
                            ? "bg-slate-950 border-slate-800 shadow-black/20"
                            : "bg-white border-gray-100 shadow-gray-50"
                        }`}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            !isMe && setSelectedParticipant(resident)
                          }
                          className="flex-row items-center flex-1"
                          activeOpacity={0.7}
                        >
                          <Image
                            source={{
                              uri:
                                resident?.avatar ||
                                "https://via.placeholder.com/50",
                            }}
                            className={`w-12 h-12 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-gray-200"}`}
                          />

                          <View className="ml-4 flex-1">
                            <Text
                              className={`font-bold ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}
                            >
                              {isMe
                                ? "You"
                                : resident?.name || "Unknown Resident"}
                            </Text>
                            <Text
                              className={`text-[10px] font-bold uppercase ${
                                isTargetCreator
                                  ? "text-amber-600"
                                  : isTargetAdmin
                                    ? "text-indigo-600"
                                    : isDarkMode
                                      ? "text-slate-500"
                                      : "text-gray-400"
                              }`}
                            >
                              {isTargetCreator
                                ? "Creator"
                                : isTargetAdmin
                                  ? "Admin"
                                  : "Member"}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <View className="flex-row items-center space-x-2">
                          {isCreator && !isMe && !isTargetCreator && (
                            <>
                              <TouchableOpacity
                                onPress={() =>
                                  handleToggleAdmin(
                                    memberId,
                                    resident?.name || "Resident",
                                    !!isTargetAdmin,
                                  )
                                }
                                className={`p-2 rounded-full ${
                                  isTargetAdmin
                                    ? isDarkMode
                                      ? "bg-indigo-950/60"
                                      : "bg-indigo-100"
                                    : isDarkMode
                                      ? "bg-slate-800"
                                      : "bg-gray-100"
                                }`}
                              >
                                <ShieldCheck
                                  size={20}
                                  color={
                                    isTargetAdmin
                                      ? "#4f46e5"
                                      : isDarkMode
                                        ? "#64748b"
                                        : "#9ca3af"
                                  }
                                />
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() =>
                                  handleRemoveMember(
                                    memberId,
                                    resident?.name || "Resident",
                                  )
                                }
                                className={`p-2 rounded-full ${isDarkMode ? "bg-red-950/40" : "bg-red-50"}`}
                              >
                                <Trash2 size={18} color="#ef4444" />
                              </TouchableOpacity>
                            </>
                          )}

                          {isAdmin &&
                            !isCreator &&
                            !isMe &&
                            !isTargetAdmin &&
                            !isTargetCreator && (
                              <TouchableOpacity
                                onPress={() =>
                                  handleRemoveMember(
                                    memberId,
                                    resident?.name || "Resident",
                                  )
                                }
                                className={`p-2 rounded-full ${isDarkMode ? "bg-red-950/40" : "bg-red-50"}`}
                              >
                                <Trash2 size={18} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View className="items-center py-10">
                    <Text
                      className={`font-bold ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      No members found
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AddMembersModal
        isVisible={isAddingMembers}
        onClose={() => setIsAddingMembers(false)}
        tenants={tenants}
        existingMemberIds={group.memberIds || []}
        onAdd={handleAddMembers}
        insets={{ top: 50 }}
      />

      <GroupUserProfileModal
        isVisible={!!selectedParticipant}
        onClose={() => setSelectedParticipant(null)}
        user={selectedParticipant}
        isAdminView={isCreator || isAdmin}
        onRemoveUser={(id: string, name: string) => {
          handleRemoveMember(id, name);
          setSelectedParticipant(null);
        }}
        onStartCall={(u) => console.log("Calling", u.name)}
        isOnline={true}
      />

      {/* Group Name Editing Sub-Modal Overlay */}
      <Modal
        visible={isEditingName}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingName(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <View
            className={`w-full rounded-3xl p-6 shadow-xl ${isDarkMode ? "bg-slate-900" : "bg-white"}`}
          >
            <Text
              className={`text-xl font-black mb-4 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
            >
              Edit Group Name
            </Text>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter group name"
              className={`p-4 rounded-2xl font-bold mb-6 ${
                isDarkMode
                  ? "bg-slate-950 text-slate-100"
                  : "bg-gray-100 text-gray-800"
              }`}
              placeholderTextColor={isDarkMode ? "#64748b" : "#9ca3af"}
              autoFocus
            />

            <View className="flex-row space-x-3 px-2">
              <TouchableOpacity
                onPress={() => setIsEditingName(false)}
                className={`flex-1 p-4 rounded-2xl items-center mx-2 ${isDarkMode ? "bg-slate-800" : "bg-gray-200"}`}
              >
                <Text
                  className={isDarkMode ? "text-slate-300" : "text-gray-600"}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleUpdateGroupName}
                className="flex-1 bg-indigo-600 p-4 rounded-2xl items-center mx-2"
              >
                <Text className="text-white font-bold">Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Screen Header Identity Inspector Popover */}
      <Modal
        visible={isShowingFullName}
        transparent
        animationType="fade"
        onRequestClose={() => setIsShowingFullName(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-10">
          <View
            className={`w-full rounded-[35px] p-8 shadow-2xl items-center border ${
              isDarkMode
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-100"
            }`}
          >
            <Text
              className={`text-[10px] font-black uppercase tracking-[2px] mb-3 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}
            >
              Full Group Name
            </Text>

            <Text
              className={`text-xl font-black text-center mb-8 leading-7 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}
            >
              {group.name}
            </Text>

            <TouchableOpacity
              onPress={() => setIsShowingFullName(false)}
              className="w-full bg-indigo-600 py-4 rounded-2xl items-center shadow-md shadow-indigo-200"
            >
              <Text className="text-white font-bold text-lg">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default GroupProfileModal;
