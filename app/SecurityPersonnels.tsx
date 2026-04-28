import { router } from "expo-router";
import { FileText, Mail, MapPin, Phone, Users, X, Search } from "lucide-react-native";
import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getSecurityColleagues } from "./services/api";
import { Guard } from "./services/interfaces";

const { width } = Dimensions.get("window");



export default function SecurityPersonnels() {
  const [allGuards, setAllGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "ON" | "OFF">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchColleagues = async () => {
    const res = await getSecurityColleagues();
    if (res.success) {
      setAllGuards(res.securityGuards);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchColleagues();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchColleagues();
  };

  // Memoized filtered list for performance
  const displayedGuards = useMemo(() => {
    return allGuards.filter((g) => {
      const matchesFilter = 
        filter === "ALL" ? true : 
        filter === "ON" ? g.is_on_duty : !g.is_on_duty;
      
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            g.email.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [allGuards, filter, searchQuery]);

  const renderGuardItem = ({ item }: { item: Guard }) => (
    <View className="bg-white p-4 mb-4 rounded-3xl border border-gray-100 shadow-sm">
      <View className="flex-row items-center">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedImage(item.avatar || "https://via.placeholder.com/150")}
          className="relative"
        >
          <Image
            source={{ uri: item.avatar || "https://via.placeholder.com/150" }}
            className="w-16 h-16 rounded-2xl bg-gray-200"
          />
          <View
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${item.is_on_duty ? "bg-green-500" : "bg-gray-400"}`}
          />
        </TouchableOpacity>

        <View className="flex-1 ml-4 flex gap-1">
          <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <Mail size={12} color="#64748b" />
            <Text className="text-gray-500 text-md ml-1">{item.email}</Text>
          </View>
          <View className="flex-row items-center mt-0.5">
            <Phone size={12} color="#64748b" />
            <Text className="text-gray-500 text-md ml-1 font-medium">
              {item.phone || "No Phone"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
          className="bg-indigo-50 p-3 rounded-2xl"
        >
          <Phone size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <View className={`mt-4 pt-4 border-t border-gray-50 flex-row ${item.is_on_duty ? " justify-between" : "justify-end"}`}>
        {item.is_on_duty && (
          <View className="flex-1 pl-2 border-l border-gray-100">
            <Text className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
              Last Known Location
            </Text>
            <View className="flex-row items-center mt-1">
              <MapPin size={12} color="#6366f1" />
              <Text className="text-gray-700 text-xs ml-1 font-semibold" numberOfLines={1}>
                {item.last_known_location || "Unknown"}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/SubmitSecurityReport",
              params: {
                type: "SECURITY",
                targetId: item.id,
                targetName: item.name,
              },
            } as any)
          }
          className="bg-red-50 px-4 py-2 rounded-xl border border-red-100"
        >
          <Text className="text-red-600 font-bold text-xs">Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4 pt-6 pb-20">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Security Team</Text>
          <Text className="text-gray-500 text-sm">{allGuards.length} total guards</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push({ pathname: "/SubmitSecurityReport", params: { type: "GENERAL" } } as any)}
          className="bg-red-500 p-3 rounded-2xl flex-row items-center"
        >
          <FileText size={12} color="white" />
          <Text className="text-white font-bold ml-2 text-xs">Make a Report</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="bg-white flex-row items-center px-4 py-3 rounded-2xl border border-gray-100 shadow-sm mb-4">
        <Search size={20} color="#94a3b8" />
        <TextInput
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="flex-1 ml-3 text-gray-700 font-medium"
          placeholderTextColor="#94a3b8"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pill Row */}
      <View className="flex-row gap-2 mb-6">
        {[
          { label: "All", value: "ALL" },
          { label: "On Duty", value: "ON" },
          { label: "Off Duty", value: "OFF" },
        ].map((item) => (
          <TouchableOpacity
            key={item.value}
            onPress={() => setFilter(item.value as any)}
            className={`px-5 py-2.5 rounded-full border ${filter === item.value ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"}`}
          >
            <Text className={`font-bold text-xs ${filter === item.value ? "text-white" : "text-gray-500"}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={displayedGuards}
          keyExtractor={(item) => item.id}
          renderItem={renderGuardItem}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4f46e5"]} />}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Users size={50} color="#cbd5e1" />
              <Text className="text-gray-400 mt-4 text-lg font-medium">No one found</Text>
            </View>
          }
        />
      )}
      
      {/* Modal for Avatar Zoom stays the same */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <Pressable className="flex-1 bg-black/90 justify-center items-center" onPress={() => setSelectedImage(null)}>
          <TouchableOpacity onPress={() => setSelectedImage(null)} className="absolute top-12 right-6 z-50 bg-white/20 p-2 rounded-full">
            <X size={28} color="white" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: width * 0.9, height: width * 0.9 }} className="rounded-3xl bg-gray-800" resizeMode="cover" />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}