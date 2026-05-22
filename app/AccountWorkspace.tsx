import { router, useFocusEffect } from "expo-router";
import {
  Building,
  Home,
  MapPin,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUser } from "./UserContext";
import { deleteSubUser, leaveEstate } from "./services/api";
import { Estate, User } from "./services/interfaces";

type WorkspaceTab = "estates" | "users";

export default function AccountWorkspace() {
  const { user,setUser, isDarkMode } = useUser();
  const BASE_URL = `${process.env.EXPO_PUBLIC_BASE_URL}/api`;

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("estates");
  const [loading, setLoading] = useState<boolean>(true);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [subUsers, setSubUsers] = useState<Partial<User>[]>([]);

  // Co-occupant Modal States
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Estate Modal States
  const [selectedEstate, setSelectedEstate] = useState<Estate | null>(null);
  const [estateModalVisible, setEstateModalVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Avatar Preview Zoom Modal State
  const [avatarZoomVisible, setAvatarZoomVisible] = useState(false);

  const hasNoEstates = !user?.estate_ids || user.estate_ids.length === 0;
  const isSubAccount = !!user?.parent_account_id;

  const fetchWorkspaceDetails = async () => {
    try {
      const res = await fetch(`${BASE_URL}/resident/accounts-details`);
      const data = await res.json();
      if (data.success) {
        console.log("data.estate:", data.estates);
        setEstates(data.estates || []);
        setSubUsers(data.subUsers || []);
      }
    } catch (err) {
      console.error("Error loading workspace lists:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkspaceDetails();
    }, []),
  );

  const handleOpenUserDetail = (subUser: Partial<User>) => {
    setSelectedUser(subUser);
    setUserModalVisible(true);
  };

  const handleOpenEstateDetail = (estate: Estate) => {
    setSelectedEstate(estate);
    setEstateModalVisible(true);
  };

  const handleDeleteSubUser = async () => {
    if (!selectedUser?.id) return;

    Alert.alert(
      "Confirm Removal",
      `Are you sure you want to permanently revoke entry permissions for ${selectedUser.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Profile",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await deleteSubUser(selectedUser.id!);
              if (res.success) {
                setSubUsers((prev) =>
                  prev.filter((u) => u.id !== selectedUser.id),
                );
                setUserModalVisible(false);
                setSelectedUser(null);
                if (user && setUser) {
                  setUser({
                    ...user,
                    sub_users: user?.sub_users?.filter(
                      (id) => id !== selectedUser.id,
                    ),
                  });
                }
                Alert.alert("Success", "Sub-account deleted successfully.");
              } else {
                Alert.alert("Error", res.message || "Failed to drop account.");
              }
            } catch (err) {
              Alert.alert("Failure", "Network error processing removal.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleLeaveEstate = async () => {
    if (!selectedEstate?.id) return;

    Alert.alert(
      "Sever Connection",
      `Are you sure you want to completely remove your account and all associated co-occupants from ${selectedEstate.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove Estate",
          style: "destructive",
          onPress: async () => {
            setLeaving(true);
            try {
              const res = await leaveEstate(selectedEstate.id);
              if (res.success) {
                setEstates((prev) =>
                  prev.filter((e) => e.id !== selectedEstate.id),
                );
                setEstateModalVisible(false);
                setSelectedEstate(null);
                Alert.alert("Success", "Connection removed successfully.");
                fetchWorkspaceDetails();
              } else {
                Alert.alert(
                  "Error",
                  res.message || "Failed to break estate linkage.",
                );
              }
            } catch (err) {
              Alert.alert(
                "Failure",
                "Network crash parsing server feedback logs.",
              );
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  const renderUserLocationsForEstate = (estateId: string) => {
    const estateLocations = user?.locations?.[estateId] || [];
    if (estateLocations.length === 0) {
      return (
        <Text className="text-xs italic text-slate-400">
          No allocated units found.
        </Text>
      );
    }

    return estateLocations.map((loc: any, idx: number) => {
      const unitList = Array.isArray(loc.unit)
        ? loc.unit
        : [loc.unit || loc.units];
      return (
        <View
          key={idx}
          className={`flex-row items-center p-3 mb-2 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}
        >
          <Home
            size={16}
            color={isDarkMode ? "#D4AF37" : "#4f46e5"}
            className="mr-2"
          />
          <Text
            className={`text-xs font-semibold ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}
          >
            Block {loc.block} ➔ Unit(s): {unitList.join(", ")}
          </Text>
        </View>
      );
    });
  };

  // Helper function to resolve sub-user cross-reference location lists
  const renderSubUserMatchedLocations = (subUser: Partial<User>) => {
    if (!subUser.locations || Object.keys(subUser.locations).length === 0) {
      return (
        <Text className="text-xs italic text-slate-400 mt-1">
          No residential units assigned to this sub-user account.
        </Text>
      );
    }

    return Object.keys(subUser.locations).map((estateId) => {
      // Find matching estate name from parent context workspace records
      const estateMatch =
        estates.find((e) => e.id === estateId) ||
        user?.estates?.find((e) => e.id === estateId);

      const estateName = estateMatch ? estateMatch.name : "Linked Estate Space";
      const pairs = subUser.locations?.[estateId] || [];

      return (
        <View key={estateId} className="mb-4">
          <Text
            className={`text-xs font-bold mb-2 ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}
          >
            🏢 {estateName}
          </Text>
          {pairs.map((loc, idx) => {
            const unitList = Array.isArray(loc.unit) ? loc.unit : [loc.unit];
            return (
              <View
                key={idx}
                className={`flex-row items-center p-3 mb-1.5 rounded-xl border ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-900"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <Home size={14} color="#94a3b8" className="mr-2" />
                <Text
                  className={`text-xs ${isDarkMode ? "text-gray-300" : "text-slate-600"}`}
                >
                  Block {loc.block} ➔ Unit(s): {unitList.join(", ")}
                </Text>
              </View>
            );
          })}
        </View>
      );
    });
  };

  if (hasNoEstates) {
    return (
      <View
        className={`${isDarkMode ? "bg-slate-950" : "bg-slate-50"} flex-1 justify-center items-center p-6`}
      >
        <View
          className={`${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-slate-100"} p-8 rounded-[2.5rem] shadow-sm items-center border`}
        >
          <ShieldCheck size={60} color={isDarkMode ? "#D4AF37" : "#0A1F44"} />
          <Text
            className={`text-xl font-bold ${isDarkMode ? "text-gm-gold" : "text-gm-navy"} mt-4 text-center`}
          >
            Access Restricted
          </Text>
          <Text
            className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"} mt-2 text-center px-4 max-w-[280px]`}
          >
            You are currently not attached to any active estates on GateMan.
          </Text>

          {!isSubAccount && (
            <TouchableOpacity
              className={`w-full p-4 rounded-2xl shadow-sm mt-6 border items-center ${isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"}`}
              onPress={() => router.push("/JoinRequest" as any)}
            >
              <Text className="text-white font-bold text-base">
                Join an Estate
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        className={`flex-1 justify-center items-center ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
      >
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView
      className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}
    >
      {/* TAB CONTROL ELEMENT BLOCK */}
      <View className="flex-row px-2 gap-x-2">
        <TouchableOpacity
          onPress={() => setActiveTab("estates")}
          className={`flex-1 py-3 rounded-xl flex-row justify-center items-center gap-x-2 border ${
            activeTab === "estates"
              ? isDarkMode
                ? "bg-gm-gold border-gm-gold"
                : "bg-indigo-600 border-transparent"
              : isDarkMode
                ? "bg-gm-navy border-slate-800"
                : "bg-white border-slate-200"
          }`}
        >
          <Building
            size={16}
            color={
              activeTab === "estates"
                ? isDarkMode
                  ? "#0A1F44"
                  : "white"
                : "#94a3b8"
            }
          />
          <Text
            className={`font-bold text-sm ${activeTab === "estates" ? (isDarkMode ? "text-gm-navy" : "text-white") : "text-slate-400"}`}
          >
            Estates ({estates.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("users")}
          className={`flex-1 py-3 rounded-xl flex-row justify-center items-center gap-x-2 border ${
            activeTab === "users"
              ? isDarkMode
                ? "bg-gm-gold border-gm-gold"
                : "bg-indigo-600 border-transparent"
              : isDarkMode
                ? "bg-gm-navy border-slate-800"
                : "bg-white border-slate-200"
          }`}
        >
          <Users
            size={16}
            color={
              activeTab === "users"
                ? isDarkMode
                  ? "#0A1F44"
                  : "white"
                : "#94a3b8"
            }
          />
          <Text
            className={`font-bold text-sm ${activeTab === "users" ? (isDarkMode ? "text-gm-navy" : "text-white") : "text-slate-400"}`}
          >
            Co-occupants ({subUsers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONDITIONAL DATA PRESENTATION CONTAINER */}
      {activeTab === "estates" ? (
        <FlatList
          data={estates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOpenEstateDetail(item)}
              className={`p-4 rounded-2xl mb-3 border flex-row items-center justify-between ${isDarkMode ? "bg-gm-navy border-slate-900" : "bg-white border-slate-200"}`}
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View
                  className={`p-3 rounded-xl ${isDarkMode ? "bg-gm-charcoal" : "bg-indigo-50"}`}
                >
                  <MapPin
                    size={20}
                    color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="text-xs text-slate-400 mt-0.5"
                    numberOfLines={1}
                  >
                    {item.address}
                    {item.town ? `, ${item.town}` : ""}, {item.state}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-12">
              <ShieldAlert size={40} color="#94a3b8" />
              <Text className="text-slate-400 text-sm mt-2">
                No connected estate records found.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={subUsers}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOpenUserDetail(item)}
              className={`p-4 rounded-2xl mb-3 border flex-row items-center justify-between ${isDarkMode ? "bg-gm-navy border-slate-900" : "bg-white border-slate-200"}`}
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View className="rounded-xl overflow-hidden">
                  <Image
                    source={{
                      uri: item.avatar || "https://via.placeholder.com/50",
                    }}
                    className={`w-12 h-12 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-gray-200"}`}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="text-xs text-slate-400 mt-0.5"
                    numberOfLines={1}
                  >
                    {item.email || item.phone}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Users size={40} color="#94a3b8" />
              <Text className="text-slate-400 text-sm mt-2">
                No co-occupants registered inside this house block.
              </Text>
            </View>
          }
        />
      )}

      {/* BASEMENT ACTIONS PERSISTENT NAV BAR */}
      {!isSubAccount && (
        <View className="p-4 bg-transparent">
          {activeTab === "estates" ? (
            <TouchableOpacity
              onPress={() => router.push("/JoinRequest" as any)}
              className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-x-2 ${isDarkMode ? "bg-gm-charcoal border border-gm-gold" : "bg-indigo-600"}`}
            >
              <Plus size={18} color={isDarkMode ? "#D4AF37" : "white"} />
              <Text
                className={`font-bold text-base ${isDarkMode ? "text-gm-gold" : "text-white"}`}
              >
                Join New Estate
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/AddUser" as any)}
              className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-x-2 ${isDarkMode ? "bg-gm-charcoal border border-gm-gold" : "bg-emerald-600"}`}
            >
              <UserPlus size={18} color={isDarkMode ? "#D4AF37" : "white"} />
              <Text
                className={`font-bold text-base ${isDarkMode ? "text-gm-gold" : "text-white"}`}
              >
                Add Co-occupant User
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ESTATE DETAILS MODAL SHEET */}
      <Modal visible={estateModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View
            className={`rounded-t-[2.5rem] p-6 border-t ${isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-white border-slate-200"} h-[65%]`}
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text
                className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                Estate Space Details
              </Text>
              <TouchableOpacity
                onPress={() => setEstateModalVisible(false)}
                className={`p-2 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}
              >
                <X size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
            </View>

            {selectedEstate && (
              <View className="flex-1 justify-between pb-10">
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View className="flex gap-4">
                    <View
                      className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}
                    >
                      <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Estate Domain Name
                      </Text>
                      <Text
                        className={`text-base font-semibold mt-1 ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}
                      >
                        {selectedEstate.name}
                      </Text>
                    </View>

                    <View
                      className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}
                    >
                      <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Physical Address Layout
                      </Text>
                      <Text
                        className={`text-sm font-medium mt-1 ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}
                      >
                        {selectedEstate.address}
                        {selectedEstate.lga
                          ? `, ${selectedEstate.lga}`
                          : ""}, {selectedEstate.state}
                      </Text>
                    </View>

                    <View className="pt-2">
                      <Text
                        className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
                      >
                        Your Authorized Living Spaces
                      </Text>
                      {renderUserLocationsForEstate(selectedEstate.id)}
                    </View>
                  </View>
                </ScrollView>

                {!isSubAccount &&
                  user.estate_ids &&
                  user?.estate_ids?.length > 1 && (
                    <TouchableOpacity
                      disabled={leaving}
                      onPress={handleLeaveEstate}
                      className="w-full py-4 bg-red-500/10 border border-red-500/20 active:bg-red-500/20 rounded-2xl flex-row items-center justify-center gap-x-2"
                    >
                      {leaving ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <>
                          <Trash2 size={18} color="#ef4444" />
                          <Text className="text-red-500 font-bold text-base">
                            Unlink & Leave Estate
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* CO-OCCUPANT DETAILS MODAL SHEET */}
      <Modal visible={userModalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end">
          <View
            className={`rounded-t-[2.5rem] p-6 border-t ${isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-white border-slate-200"} h-[75%] pb-10`}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text
                className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                Co-occupant Account Profile
              </Text>
              <TouchableOpacity
                onPress={() => setUserModalVisible(false)}
                className={`p-2 rounded-full ${isDarkMode ? "bg-slate-800" : "bg-slate-100"}`}
              >
                <X size={16} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View className="flex-1 justify-between pb-10">
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  {/* Avatar Profile Section Header with click-to-zoom trigger */}
                  <View className="items-center my-4">
                    <TouchableOpacity
                      onPress={() => setAvatarZoomVisible(true)}
                      className="relative active:opacity-80"
                    >
                      <Image
                        source={{
                          uri:
                            selectedUser.avatar ||
                            "https://via.placeholder.com/150",
                        }}
                        className={`w-24 h-24 rounded-full border-2 ${isDarkMode ? "border-gm-gold bg-slate-900" : "border-indigo-600 bg-gray-100"}`}
                      />
                    </TouchableOpacity>
                    <Text
                      className={`text-base font-bold mt-2 ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    >
                      {selectedUser.name}
                    </Text>
                  </View>

                  <View className="flex gap-3">
                    <View
                      className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}
                    >
                      <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Email Address
                      </Text>
                      <Text
                        className={`text-sm font-semibold mt-1 ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}
                      >
                        {selectedUser.email || "No email assigned"}
                      </Text>
                    </View>

                    {selectedUser.phone && (
                      <View
                        className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}
                      >
                        <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Phone Line
                        </Text>
                        <Text
                          className={`text-sm font-semibold mt-1 ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}
                        >
                          {selectedUser.phone}
                        </Text>
                      </View>
                    )}

                    {/* Dynamic Cross-Referenced Assigned Estate Profiles */}
                    <View
                      className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-100"}`}
                    >
                      <Text className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                        Assigned Residential Units
                      </Text>
                      {renderSubUserMatchedLocations(selectedUser)}
                    </View>
                  </View>
                </ScrollView>

                {!isSubAccount && (
                  <TouchableOpacity
                    disabled={deleting}
                    onPress={handleDeleteSubUser}
                    className="w-full py-4 bg-red-500/10 border border-red-500/20 active:bg-red-500/20 rounded-2xl flex-row items-center justify-center gap-x-2"
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Trash2 size={18} color="#ef4444" />
                        <Text className="text-red-500 font-bold text-base">
                          Revoke & Delete Sub-account
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* AVATAR ZOOM IMAGE PREVIEW MODAL */}
      <Modal
        visible={avatarZoomVisible}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/95 justify-center items-center">
          {/* Close Header button safely aligned down from status bars */}
          <TouchableOpacity
            onPress={() => setAvatarZoomVisible(false)}
            className="absolute top-14 right-6 bg-white/10 p-3 rounded-full z-50 active:bg-white/20"
          >
            <X size={24} color="white" />
          </TouchableOpacity>

          {selectedUser?.avatar ? (
            <Image
              source={{ uri: selectedUser.avatar }}
              className="w-full h-[70%] max-h-[500px]"
              resizeMode="contain"
            />
          ) : (
            <View className="items-center">
              <Users size={80} color="#64748b" />
              <Text className="text-slate-400 mt-4 font-semibold">
                No profile photo loaded
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
