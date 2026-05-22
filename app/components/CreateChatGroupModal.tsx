import { Search, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { User } from "../services/interfaces";
import { useUser } from "../UserContext";

interface CreateGroupModalProps {
  isVisible: boolean;
  onClose: () => void;
  tenants: Partial<User>[] | any;
  selectedMembers: string[];
  onToggleMember: (id: string) => void;
  onNext: () => void;
  insets: any;
  buttonText: string;
  header: string;
  count: number;
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
  buttonText,
  header,
  count,
}: CreateGroupModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { isDarkMode } = useUser();

  const filteredTenants = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return tenants;

    return tenants.filter((t: Partial<User>[] | any) => {
      const name = t.name?.toLowerCase() || "";
      if (t.isGroup) return name.includes(query);
      const block = t.block?.toString().toLowerCase() || "";
      const unit = t.unit?.toString().toLowerCase() || "";

      return (
        name.includes(query) ||
        block.includes(query) ||
        unit.includes(query) ||
        `block ${block}`.includes(query) ||
        `unit ${unit}`.includes(query)
      );
    });
  }, [tenants, searchQuery]);

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View 
        className={`flex-1 ${isDarkMode ? "bg-slate-900" : "bg-white"}`} 
        style={{ paddingTop: insets.top }}
      >
        {/* Modal Header */}
        <View className={`p-4 flex-row justify-between items-center border-b ${
          isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-gray-100"
        }`}>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-red-500 font-bold">Cancel</Text>
          </TouchableOpacity>

          <Text className={`text-lg font-black ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>{header}</Text>

          <TouchableOpacity
            onPress={onNext}
            disabled={selectedMembers.length < count}
          >
            <Text
              className={`font-bold ${
                selectedMembers.length <= count
                  ? isDarkMode ? "text-slate-700" : "text-gray-300"
                  : "text-indigo-600"
              }`}
            >
              {buttonText}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar Container */}
        <View className={`px-4 py-2 border-b ${
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-gray-50 border-b border-gray-100"
        }`}>
          <View className={`flex-row items-center border rounded-xl px-3 py-1 ${
            isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200"
          }`}>
            <Search size={18} color={isDarkMode ? "#64748b" : "#9ca3af"} />
            <TextInput
              placeholder="Search by name or block..."
              className={`flex-1 h-10 ml-2 ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              placeholderTextColor={isDarkMode ? "#64748b" : "#9ca3af"}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text className={`px-2 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-400"}`}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tenant Items List */}
        <FlatList
          data={filteredTenants}
          keyExtractor={(item) =>
            item.id?.toString() || Math.random().toString()
          }
          renderItem={({ item }) => {
            const id = item.id!.toString();
            const isSelected = selectedMembers.includes(id);

            return (
              <TouchableOpacity
                onPress={() => onToggleMember(id)}
                className={`flex-row items-center p-4 border-b ${
                  isSelected 
                    ? isDarkMode ? "bg-indigo-950/40 border-slate-800" : "bg-indigo-50 border-gray-50"
                    : isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-50"
                }`}
              >
                <Image
                  source={{
                    uri: item.avatar || "https://via.placeholder.com/50",
                  }}
                  className={`w-12 h-12 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-gray-200"}`}
                />
                <View className="ml-4 flex-1">
                  <Text className={`font-bold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>{item.name}</Text>
                  {item.isGroup ? (
                    <Text className="text-indigo-500 text-[11px] font-bold">
                      COMMUNITY GROUP • {item.memberCount} MEMBERS
                    </Text>
                  ) : (
                    <Text className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      Block {item.block} • Unit {item.unit}
                    </Text>
                  )}
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 ${
                    isSelected
                      ? "bg-indigo-500 border-indigo-500"
                      : isDarkMode ? "border-slate-700" : "border-gray-300"
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
              <Text className={isDarkMode ? "text-slate-500" : "text-gray-400"}>No residents available</Text>
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
  const { isDarkMode } = useUser();

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className={`w-full rounded-3xl p-6 shadow-xl ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
          <Text className={`text-xl font-black mb-2 ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>
            Group Name
          </Text>
          <Text className={`mb-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
            Give your community group a clear name (e.g., Block A Security).
          </Text>

          <TextInput
            className={`p-4 rounded-xl font-bold mb-6 ${
              isDarkMode ? "bg-slate-950 text-slate-100" : "bg-gray-100 text-gray-900"
            }`}
            placeholderTextColor={isDarkMode ? "#64748b" : "#9ca3af"}
            placeholder="Enter group name..."
            value={groupName}
            onChangeText={setGroupName}
            autoFocus={true}
          />

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={onClose}
              className={`flex-1 py-4 items-center rounded-xl ${isDarkMode ? "bg-slate-800" : "bg-gray-50"}`}
            >
              <Text className={isDarkMode ? "text-slate-400" : "text-gray-500"}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onFinalize}
              className={`flex-1 py-4 items-center rounded-xl ${
                groupName.trim().length > 2 ? "bg-indigo-600" : isDarkMode ? "bg-indigo-950" : "bg-indigo-300"
              }`}
              disabled={groupName.trim().length <= 2}
            >
              <Text className={`font-bold ${groupName.trim().length > 2 ? "text-white" : isDarkMode ? "text-indigo-900" : "text-white"}`}>
                Create Group
              </Text>
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
  const { isDarkMode } = useUser();

  const availableTenants = useMemo(() => {
    return tenants.filter((t) => !existingMemberIds.includes(t.id?.toString()));
  }, [tenants, existingMemberIds]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
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
      <View 
        className={`flex-1 ${isDarkMode ? "bg-slate-900" : "bg-white"}`} 
        style={{ paddingTop: insets.top }}
      >
        {/* Header */}
        <View className={`px-6 py-4 flex-row justify-between items-center border-b ${
          isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-gray-100"
        }`}>
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
            <X size={24} color={isDarkMode ? "#94a3b8" : "#374151"} />
          </TouchableOpacity>

          <View className="items-center">
            <Text className={`text-lg font-black ${isDarkMode ? "text-slate-100" : "text-gray-900"}`}>
              Add Members
            </Text>
            <Text className={`text-[10px] font-bold uppercase tracking-tighter ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              {selectedIds.length} Selected
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={selectedIds.length === 0 || loading}
          >
            <Text
              className={`font-bold ${
                selectedIds.length === 0 
                  ? isDarkMode ? "text-slate-700" : "text-gray-300" 
                  : "text-indigo-600"
              }`}
            >
              {loading ? "Adding..." : "Done"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* List Content */}
        <FlatList
          data={availableTenants}
          keyExtractor={(item) =>
            item.id?.toString() || Math.random().toString()
          }
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
                    ? isDarkMode ? "bg-indigo-950/40 border-indigo-900/60" : "bg-indigo-50 border-indigo-200"
                    : isDarkMode ? "bg-slate-950 border-slate-800/80" : "bg-white border-gray-50"
                }`}
              >
                <Image
                  source={{
                    uri: item.avatar || "https://via.placeholder.com/50",
                  }}
                  className={`w-12 h-12 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}
                />

                <View className="ml-4 flex-1">
                  <Text className={`font-bold ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>{item.name}</Text>
                  <Text className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                    Block {item.block} • Unit {item.unit}
                  </Text>
                </View>

                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600"
                      : isDarkMode ? "border-slate-800" : "border-gray-200"
                  }`}
                >
                  {isSelected && (
                    <Text className="text-white text-[10px]">✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="p-20 items-center">
              <Text className={`text-center font-medium ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
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