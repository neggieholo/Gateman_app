import { router } from "expo-router";
import {
  ChevronDown,
  FileText,
  Mail,
  MapPin,
  Phone,
  Search,
  Users,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
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
import { useUser } from "./UserContext";
import { getSecurityColleagues } from "./services/api";
import { Guard } from "./services/interfaces";

const { width } = Dimensions.get("window");

export default function SecurityPersonnels() {
  const { user, isDarkMode, theme } = useUser();
  const [allGuards, setAllGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "ON" | "OFF">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Estate Context Tracking States
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  useEffect(() => {
    if (!user?.estate_ids || user.estate_ids.length === 0) {
      setLoading(false);
      return;
    }

    if (user.estate_ids.length === 1) {
      setSelectedEstateId(user.estate_ids[0]);
    } else {
      setLoading(false);
      setEstatePickerVisible(true);
    }
  }, [user?.estate_ids]);

  const activeEstateName = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return "";
    return user.estates.find((e) => e.id === selectedEstateId)?.name || "";
  }, [selectedEstateId, user?.estates]);

  const fetchColleagues = async (estateId: string) => {
    setLoading(true);
    try {
      const res = await getSecurityColleagues(estateId);
      if (res.success) {
        setAllGuards(res.securityGuards || []);
      } else {
        setAllGuards([]);
      }
    } catch (err) {
      console.error("Fetch Guards Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedEstateId) {
      console.log("fetchng for Estate:", selectedEstateId);
      fetchColleagues(selectedEstateId);
    }
  }, [selectedEstateId]);

  const onRefresh = () => {
    if (selectedEstateId) {
      setRefreshing(true);
      fetchColleagues(selectedEstateId);
    }
  };

  const displayedGuards = useMemo(() => {
    return allGuards.filter((g) => {
      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "ON"
            ? g.is_on_duty
            : !g.is_on_duty;

      const matchesSearch =
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.email.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [allGuards, filter, searchQuery]);

  const renderGuardItem = ({ item }: { item: Guard }) => (
    <View
      className={`p-5 mb-4 rounded-[30px] border shadow-sm ${isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border-gray-100"}`}
    >
      <View className="flex-row items-center">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            setSelectedImage(item.avatar || "https://via.placeholder.com/150")
          }
          className="relative"
        >
          <Image
            source={{ uri: item.avatar || "https://via.placeholder.com/150" }}
            className="w-16 h-16 rounded-2xl bg-gray-200"
          />
          <View
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 ${isDarkMode ? "border-gm-navy" : "border-white"} ${item.is_on_duty ? "bg-green-500" : "bg-gray-400"}`}
          />
        </TouchableOpacity>

        <View className="flex-1 ml-4 flex gap-1">
          <Text
            className={`text-lg font-bold ${isDarkMode ? "text-gm-gold" : "text-gray-900"}`}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View className="flex-row items-center mt-1">
            <Mail size={12} color={isDarkMode ? "#A0AEC0" : "#64748b"} />
            <Text
              className={`text-md ml-1 ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}
              numberOfLines={1}
            >
              {item.email}
            </Text>
          </View>
          <View className="flex-row items-center mt-0.5">
            <Phone size={12} color={isDarkMode ? "#A0AEC0" : "#64748b"} />
            <Text
              className={`text-md ml-1 font-medium ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}
            >
              {item.phone || "No Phone"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
          className={`${isDarkMode ? "bg-gm-charcoal border border-gm-gold" : "bg-indigo-50"} p-3 rounded-2xl`}
        >
          <Phone size={20} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
        </TouchableOpacity>
      </View>

      <View
        className={`mt-4 pt-4 border-t flex-row items-center ${isDarkMode ? "border-slate-800" : "border-gray-50"} ${item.is_on_duty ? " justify-between" : "justify-end"}`}
      >
        {item.is_on_duty && (
          <View className="flex-1 pr-2">
            <Text
              className={`text-[10px] uppercase tracking-widest font-bold ${isDarkMode ? "text-gm-gold" : "text-gray-400"}`}
            >
              Last Known Location
            </Text>
            <View className="flex-row items-center mt-1">
              <MapPin size={12} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
              <Text
                className={`text-xs ml-1 font-semibold flex-1 ${isDarkMode ? "text-white" : "text-gray-700"}`}
                numberOfLines={1}
              >
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
                estateId: selectedEstateId,
              },
            } as any)
          }
          className={`${isDarkMode ? "bg-rose-950/20 border-rose-900/40" : "bg-red-50 border-red-100"} px-4 py-2 rounded-xl border`}
        >
          <Text className="text-red-600 font-bold text-xs">Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View
      className={`flex-1 p-4 pt-6 pb-20 ${isDarkMode ? "bg-slate-950" : "bg-gray-50"}`}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-1 mr-2">
          <Text
            className={`text-2xl font-bold ${isDarkMode ? "text-gray-300" : "text-gray-900"}`}
          >
            Security Team
          </Text>
          <Text className="text-gray-500 text-sm">
            {allGuards.length} guards on this estate
          </Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/SubmitSecurityReport",
              params: { type: "GENERAL", estateId: selectedEstateId },
            } as any)
          }
          className="bg-red-500 px-4 py-3 rounded-2xl flex-row items-center"
        >
          <FileText size={12} color="white" />
          <Text className="text-white font-bold ml-2 text-xs">
            Report Issue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Context Banner Switcher */}
      {user?.estate_ids && user.estate_ids.length > 1 && (
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className={`mb-4 flex-row items-center justify-between p-3.5 rounded-2xl border ${
            isDarkMode
              ? "bg-gm-navy border-gm-gold"
              : "bg-white border-gray-100"
          } shadow-sm`}
        >
          <View className="flex-row items-center flex-1">
            <MapPin size={14} color={isDarkMode ? "#D4AF37" : "#6366f1"} />
            <Text
              className={`ml-2 text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-600"} flex-1`}
              numberOfLines={1}
            >
              Estate: {activeEstateName || "Switch Context"}
            </Text>
          </View>
          <ChevronDown size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View
        className={`flex-row items-center px-4 py-3 rounded-2xl border shadow-sm mb-4 ${isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-white border-gray-100"}`}
      >
        <Search size={20} color="#94a3b8" />
        <TextInput
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className={`flex-1 ml-3 font-medium ${isDarkMode ? "text-white" : "text-gray-700"}`}
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
        ].map((item) => {
          const isSelected = filter === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setFilter(item.value as any)}
              className={`px-5 py-2.5 rounded-full border ${
                isSelected
                  ? isDarkMode
                    ? "bg-gm-navy border-gm-gold"
                    : "bg-indigo-600 border-indigo-600"
                  : isDarkMode
                    ? "bg-gm-charcoal border-slate-800"
                    : "bg-white border-gray-200"
              }`}
            >
              <Text
                className={`font-bold text-xs ${isSelected ? (isDarkMode ? "text-gm-gold" : "text-white") : "text-gray-500"}`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator
            size="large"
            color={isDarkMode ? "#D4AF37" : "#4f46e5"}
          />
        </View>
      ) : (
        <FlatList
          data={displayedGuards}
          keyExtractor={(item) => item.id}
          renderItem={renderGuardItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[isDarkMode ? "#D4AF37" : "#4f46e5"]}
              tintColor={isDarkMode ? "#D4AF37" : undefined}
            />
          }
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Users size={50} color="#cbd5e1" />
              <Text className="text-gray-400 mt-4 text-lg font-medium">
                No one found
              </Text>
            </View>
          }
        />
      )}

      {/* Context Picker Modal */}
      <Modal
        visible={estatePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-center px-4 bg-black/50">
          <View
            className={`${isDarkMode ? "bg-slate-900" : "bg-white"} p-6 max-h-[65%]`}
          >
            <Text
              className={`text-xl font-bold mb-4 ${isDarkMode ? "text-gm-gold" : "text-slate-900"}`}
            >
              Select Estate
            </Text>
            <FlatList
              data={user?.estates || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedEstateId === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEstateId(item.id);
                      setEstatePickerVisible(false);
                    }}
                    className={`p-4 rounded-2xl mb-3 border flex-row items-center ${
                      isSelected
                        ? isDarkMode
                          ? "border-gm-gold bg-gm-navy"
                          : "border-indigo-500 bg-indigo-50/40"
                        : isDarkMode
                          ? "border-slate-800 bg-slate-800/40"
                          : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <MapPin
                      size={20}
                      color={
                        isSelected
                          ? isDarkMode
                            ? "#D4AF37"
                            : "#4f46e5"
                          : "#94a3b8"
                      }
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className={`font-bold text-sm ${isSelected && isDarkMode ? "text-gm-gold" : isDarkMode ? "text-white" : "text-slate-800"}`}
                      >
                        {item.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              onPress={() => setEstatePickerVisible(false)}
              className="mt-2 p-4 bg-slate-200 rounded-2xl items-center"
            >
              <Text className="text-slate-700 font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Avatar Zoom Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <Pressable
          className="flex-1 bg-black/90 justify-center items-center"
          onPress={() => setSelectedImage(null)}
        >
          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            className="absolute top-12 right-6 z-50 bg-white/20 p-2 rounded-full"
          >
            <X size={28} color="white" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{ width: width * 0.9, height: width * 0.9 }}
              className={`rounded-3xl ${isDarkMode ? "bg-gm-navy border border-gm-gold" : "bg-gray-800"}`}
              resizeMode="cover"
            />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
