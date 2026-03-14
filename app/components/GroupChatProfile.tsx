import firestore from "@react-native-firebase/firestore";
import {
    Crown,
    ShieldCheck,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    Text,
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

    // 1. Create the new member objects
    const newMemberObjects = newlySelectedIds.map((id) => ({
      user_id: id,
      clearedAt: firestore.FieldValue.serverTimestamp(), // New members start from now
    }));

    try {
      await groupRef.update({
        // Add the objects to 'members'
        members: firestore.FieldValue.arrayUnion(...newMemberObjects),
        // Add the strings to 'memberIds' for searchability
        memberIds: firestore.FieldValue.arrayUnion(...newlySelectedIds),
      });
      Alert.alert("Success", "Members added.");
    } catch (err) {
      Alert.alert("Error", "Could not add members.");
    }
  };

  const handleRemoveMember = async (targetId: string, targetName: string) => {
    // 1. Prevent removing the creator
    if (targetId === group.createdBy) {
      Alert.alert("Action Denied", "The group creator cannot be removed.");
      return;
    }

    // 2. Prevent an Admin from removing another Admin (Only Creator can do this)
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
    isCurrentlyAdmin: boolean,
  ) => {
    if (!isCreator) {
      Alert.alert("Denied", "Only the group creator can manage admin roles.");
      return;
    }

    const groupRef = firestore()
      .collection("estate_chats")
      .doc(estateId)
      .collection("groups")
      .doc(group._id);

    try {
      if (isCurrentlyAdmin) {
        // Demote to regular member
        await groupRef.update({
          admins: firestore.FieldValue.arrayRemove(targetId),
        });
      } else {
        // Promote to Admin
        await groupRef.update({
          admins: firestore.FieldValue.arrayUnion(targetId),
        });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to update admin status.");
    }
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
            {/* --- FIXED HEADER (Doesn't Scroll) --- */}
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

            {/* --- SCROLLABLE CONTENT AREA --- */}
            <ScrollView showsVerticalScrollIndicator={false} className="px-6">
              {/* Group Profile Section */}
              <View className="items-center mt-6 mb-8">
                <View className="relative">
                  <View className="w-32 h-32 rounded-full bg-indigo-100 items-center justify-center border-4 border-indigo-50">
                    <Users size={60} color="#4f46e5" />
                  </View>
                  <View className="absolute bottom-1 right-1 bg-indigo-600 p-2 rounded-full border-4 border-white">
                    <Crown size={16} color="white" />
                  </View>
                </View>

                <View className="flex-row items-center mt-4">
                  <Text className="text-2xl font-black text-gray-900 text-center">
                    {group.name}
                  </Text>
                  {(isCreator || isAdmin) && (
                    <TouchableOpacity
                      onPress={() => {
                        Alert.prompt(
                          "Edit Group Name",
                          "Enter a new name for this group",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Save",
                              onPress: (newName: string | undefined) =>
                                handleUpdateGroup("name", newName!),
                            },
                          ],
                          "plain-text",
                          group.name,
                        );
                      }}
                      className="ml-2 bg-gray-100 p-1.5 rounded-full"
                    >
                      {/* You can use a 'Pencil' icon here from lucide-react-native */}
                      <X
                        size={14}
                        color="#6b7280"
                        style={{ transform: [{ rotate: "45deg" }] }}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <View className="flex-row items-center mt-2 bg-gray-100 px-4 py-1.5 rounded-full">
                  <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Created by {isCreator ? "You" : "Estate Admin"}
                  </Text>
                </View>
              </View>

              {/* Stats & Add Button Row */}
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
              <View className="mb-4 flex-row justify-between items-center">
                <Text className="text-gray-900 font-black text-lg">
                  Participants
                </Text>
              </View>

              {/* --- THE ACTUAL LIST --- */}
              <View className="space-y-3 pb-24">
                {group.members?.map((member: any) => {
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
                      {/* WRAP THE INFO SECTION ONLY - To trigger the Profile Modal */}
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

                      {/* ACTIONS SECTION - Stays outside the TouchableOpacity above so they don't overlap */}
                      <View className="flex-row items-center space-x-2">
                        {isCreator && !isMe && !isTargetCreator && (
                          <>
                            <TouchableOpacity
                              onPress={() =>
                                handleToggleAdmin(memberId, isTargetAdmin)
                              }
                              className={`p-2 rounded-full ${isTargetAdmin ? "bg-indigo-100" : "bg-gray-100"}`}
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

                        {/* Logic for Admins who aren't creators */}
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
                })}
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
    </>
  );
};

export default GroupProfileModal;
