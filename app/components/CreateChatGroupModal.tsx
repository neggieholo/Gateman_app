import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput
} from "react-native";
import { User } from "../services/interfaces";
import { X } from "lucide-react-native";


interface CreateGroupModalProps {
  isVisible: boolean;
  onClose: () => void;
  tenants: Partial<User>[];
  selectedMembers: string[];
  onToggleMember: (id: string) => void;
  onNext: () => void;
  insets: any;
}

interface GroupNameModalProps {
  isVisible: boolean;
  onClose: () => void;
  groupName: string;
  setGroupName: (name: string) => void;
  onFinalize: () => void;
}

interface AddMembersModalProps {
  isVisible: boolean;
  onClose: () => void;
  tenants: any[];
  existingMemberIds: string[];
  onAdd: (selectedIds: string[]) => Promise<void>;
  insets: any;
}

const CreateGroupModal = ({
  isVisible,
  onClose,
  tenants,
  selectedMembers,
  onToggleMember,
  onNext,
  insets,
}: CreateGroupModalProps) => {
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        {/* Modal Header */}
        <View className="p-4 flex-row justify-between items-center border-b border-gray-100">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-red-500 font-bold">Cancel</Text>
          </TouchableOpacity>

          <Text className="text-lg font-black text-gray-900">New Group</Text>

          <TouchableOpacity
            onPress={onNext}
            disabled={selectedMembers.length < 2}
          >
            <Text
              className={`font-bold ${
                selectedMembers.length < 2 ? "text-gray-300" : "text-indigo-600"
              }`}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={tenants}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => {
            const id = item.id!.toString();
            const isSelected = selectedMembers.includes(id);

            return (
              <TouchableOpacity
                onPress={() => onToggleMember(id)}
                className={`flex-row items-center p-4 border-b border-gray-50 ${
                  isSelected ? "bg-indigo-50" : "bg-white"
                }`}
              >
                <Image
                  source={{ uri: item.avatar || "https://via.placeholder.com/50" }}
                  className="w-12 h-12 rounded-full bg-gray-200"
                />
                <View className="ml-4 flex-1">
                  <Text className="font-bold text-gray-800">{item.name}</Text>
                  <Text className="text-gray-400 text-xs">
                    Block {item.block} • Unit {item.unit}
                  </Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 ${
                    isSelected
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <View className="flex-1 items-center justify-center">
                       <Text className="text-white text-[10px]">✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="p-10 items-center">
              <Text className="text-gray-400">No residents available</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
};


export const GroupNameModal = ({
  isVisible,
  onClose,
  groupName,
  setGroupName,
  onFinalize,
}: GroupNameModalProps) => {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white w-full rounded-3xl p-6 shadow-xl">
          <Text className="text-xl font-black text-gray-900 mb-2">Group Name</Text>
          <Text className="text-gray-500 mb-4">
            Give your community group a clear name (e.g., Block A Security).
          </Text>

          <TextInput
            className="bg-gray-100 p-4 rounded-xl text-gray-900 font-bold mb-6"
            placeholder="Enter group name..."
            value={groupName}
            onChangeText={setGroupName}
            autoFocus={true}
          />

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-4 items-center rounded-xl bg-gray-50"
            >
              <Text className="text-gray-500 font-bold">Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onFinalize}
              className={`flex-1 py-4 items-center rounded-xl ${
                groupName.trim().length > 2 ? "bg-indigo-600" : "bg-indigo-300"
              }`}
              disabled={groupName.trim().length <= 2}
            >
              <Text className="text-white font-bold">Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


export const AddMembersModal = ({
  isVisible,
  onClose,
  tenants,
  existingMemberIds,
  onAdd,
  insets,
}: AddMembersModalProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter: Only show tenants who are NOT already in the group
  const availableTenants = useMemo(() => {
    return tenants.filter(
      (t) => !existingMemberIds.includes(t.id?.toString())
    );
  }, [tenants, existingMemberIds]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    await onAdd(selectedIds);
    setLoading(false);
    setSelectedIds([]);
    onClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        
        {/* Header */}
        <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
            <X size={24} color="#374151" />
          </TouchableOpacity>
          
          <View className="items-center">
            <Text className="text-lg font-black text-gray-900">Add Members</Text>
            <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
              {selectedIds.length} Selected
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={selectedIds.length === 0 || loading}
          >
            <Text className={`font-bold ${
              selectedIds.length === 0 ? "text-gray-300" : "text-indigo-600"
            }`}>
              {loading ? "Adding..." : "Done"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        <FlatList
          data={availableTenants}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const id = item.id?.toString();
            const isSelected = selectedIds.includes(id);

            return (
              <TouchableOpacity
                onPress={() => toggleMember(id)}
                activeOpacity={0.7}
                className={`flex-row items-center p-4 mx-4 mt-2 rounded-2xl border ${
                  isSelected 
                    ? "bg-indigo-50 border-indigo-200" 
                    : "bg-white border-gray-50"
                }`}
              >
                <Image
                  source={{ uri: item.avatar || "https://via.placeholder.com/50" }}
                  className="w-12 h-12 rounded-full bg-gray-100"
                />
                
                <View className="ml-4 flex-1">
                  <Text className="font-bold text-gray-800">{item.name}</Text>
                  <Text className="text-gray-400 text-xs">
                    Block {item.block} • Unit {item.unit}
                  </Text>
                </View>

                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-200"
                  }`}
                >
                  {isSelected && <Text className="text-white text-[10px]">✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="p-20 items-center">
              <Text className="text-gray-400 text-center font-medium">
                Everyone from your estate is already in this group!
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
};

export default CreateGroupModal;