import React from "react";
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


export default CreateGroupModal;