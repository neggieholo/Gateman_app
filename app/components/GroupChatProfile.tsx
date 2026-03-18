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

    // If no search query, show everyone
    if (!query) return allMembers;

    return allMembers.filter((member: any) => {
      // 1. Get the ID (handling both object and string formats)
      const memberId = member.user_id || member;

      // 2. Find the actual resident data from the tenants prop
      const resident = tenants.find((t) => t.id?.toString() === memberId);

      // 3. Only search the name
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

    // FIX: Use a resolved date instead of the serverTimestamp sentinel
    const now = new Date();

    const newMemberObjects = newlySelectedIds.map((id) => ({
      user_id: id,
      clearedAt: now, // This is now a concrete value Firestore can handle in an array
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

              // Finding the exact object to remove from the array
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

              // Note: In a production app, you'd also delete the 'messages' sub-collection
              await groupRef.delete();

              onClose(); // Close modal
              setSelectedTenant(null); // Close chat
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
    targetName: string, // Added targetName for a better alert message
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
      quality: 0.7, // Compress a bit for mobile
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
          <View className="bg-white rounded-t-[40px] h-[90%] overflow-hidden">
            <View className="flex-row justify-between items-center px-6 pt-6 pb-4 border-b border-gray-50">
              <TouchableOpacity
                onPress={onClose}
                className="bg-gray-100 p-2 rounded-full"
              >
                <X size={24} color="#000" />
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-800">
                Group Info
              </Text>
              {isCreator ? (
                <TouchableOpacity
                  onPress={handleDeleteGroup}
                  className="bg-red-50 p-2 rounded-full"
                >
                  <Trash2 size={22} color="#ef4444" />
                </TouchableOpacity>
              ) : (
                <View className="w-10" />
              )}
            </View>

            <View className="px-4">
              <View className="items-center mt-6 mb-8">
                <TouchableOpacity
                  onPress={handleUpdateAvatar}
                  disabled={isUploading}
                  className="relative"
                >
                  <View className="w-32 h-32 rounded-full bg-indigo-100 items-center justify-center border-4 border-indigo-50 overflow-hidden">
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

                  {/* Camera Icon Overlay */}
                  {(isCreator || isAdmin) && (
                    <View className="absolute bottom-1 right-1 bg-indigo-600 p-2 rounded-full border-4 border-white">
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
                      className="text-2xl font-black text-gray-900"
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
                      className="ml-2 bg-gray-100 p-1.5 rounded-full"
                    >
                      <Pencil size={14} color="#6b7280" />
                    </TouchableOpacity>
                  )}
                </View>

                <View className="flex-row items-center mt-2 bg-gray-100 px-4 py-1.5 rounded-full">
                  <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Created by{" "}
                    {isCreator
                      ? "You"
                      : tenants.find(
                          (t) => t.id?.toString() === group.createdBy,
                        )?.name || "Estate Admin"}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between mb-8">
                <View className="bg-gray-50 flex-1 rounded-2xl p-4 items-center mr-2 border border-gray-100">
                  <Text className="text-indigo-600 font-black text-xl">
                    {group.members?.length || 0}
                  </Text>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">
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

              {/* Member List Header */}
              <View className="mb-2 flex-row justify-between items-center">
                <Text className="text-gray-900 font-black text-lg">
                  Participants
                </Text>
              </View>
            </View>
            <View className="px-6 mb-4">
              <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-3 py-1">
                <Search size={18} color="#9ca3af" />
                <TextInput
                  placeholder="Find a member..."
                  className="flex-1 h-10 ml-2 text-gray-800 font-medium"
                  value={memberSearchQuery}
                  onChangeText={setMemberSearchQuery}
                  autoCorrect={false}
                />
                {memberSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setMemberSearchQuery("")}>
                    <X size={14} color="#9ca3af" className="mr-2" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

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
                        className="flex-row items-center bg-white p-4 rounded-3xl border border-gray-100 shadow-sm shadow-gray-50 mb-3"
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
                            className="w-12 h-12 rounded-full bg-gray-200"
                          />

                          <View className="ml-4 flex-1">
                            <Text className="font-bold text-gray-800">
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
                                    ? "bg-indigo-100"
                                    : "bg-gray-100"
                                }`}
                              >
                                <ShieldCheck
                                  size={20}
                                  color={isTargetAdmin ? "#4f46e5" : "#9ca3af"}
                                />
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() =>
                                  handleRemoveMember(
                                    memberId,
                                    resident?.name || "Resident",
                                  )
                                }
                                className="p-2 bg-red-50 rounded-full"
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
                                className="p-2 bg-red-50 rounded-full"
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
                    <Text className="text-gray-400 font-bold">
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
          setSelectedParticipant(null); // Close profile after removal
        }}
        onStartCall={(u) => console.log("Calling", u.name)}
        isOnline={true} // Map this from your presence state
      />
      <Modal
        visible={isEditingName}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingName(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <View className="bg-white w-full rounded-3xl p-6 shadow-xl">
            <Text className="text-xl font-black text-gray-900 mb-4">
              Edit Group Name
            </Text>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter group name"
              className="bg-gray-100 p-4 rounded-2xl text-gray-800 font-bold mb-6"
              autoFocus
            />

            <View className="flex-row space-x-3 px-2">
              <TouchableOpacity
                onPress={() => setIsEditingName(false)}
                className="flex-1 bg-gray-200 p-4 rounded-2xl items-center mx-2"
              >
                <Text className="text-gray-600 font-bold">Cancel</Text>
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
      <Modal
        visible={isShowingFullName}
        transparent
        animationType="fade"
        onRequestClose={() => setIsShowingFullName(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-10">
          <View className="bg-white w-full rounded-[35px] p-8 shadow-2xl items-center border border-gray-100">
            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[2px] mb-3">
              Full Group Name
            </Text>

            {/* This displays the ACTUAL full name without any limits */}
            <Text className="text-xl font-black text-gray-900 text-center mb-8 leading-7">
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
