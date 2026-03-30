import { Clock, MapPin, Search, Trash2, User, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { invitationApi } from "../services/api";
import { Invitation } from "../services/interfaces";
import { useUser } from "../UserContext";

const TrackGuestView = ({ onInvitePress }: { onInvitePress: () => void }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user } = useUser();
  const estateId = user?.estate_id || "";

  const fetchInvitations = async () => {
    const data = await invitationApi.getInvitations(estateId);
    setInvitations(data);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const filteredInvitations = useMemo(() => {
    const activeInvitations = invitations.filter((inv) => !inv.is_cancelled);
    return activeInvitations.filter(
      (inv) =>
        inv.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.access_code.includes(searchQuery),
    );
  }, [searchQuery, invitations]);

  const handleCancel = (id: string, name: string) => {
    Alert.alert(
      "Cancel Invitation",
      `Are you sure you want to revoke access for ${name}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await invitationApi.deleteInvitation(id);
              setInvitations((prev) => prev.filter((item) => item.id !== id));
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          },
        },
      ],
    );
  };

  const handleExtend = async (id: string) => {
    // Simple debug: Extend by 2 hours for now
    const now = new Date();
    now.setHours(now.getHours() + 2);
    const newTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const newDate = now.toISOString().split("T")[0];

    try {
      await invitationApi.extendStay(id, newDate, newTime);
      fetchInvitations(); // Refresh list
      Alert.alert("Success", "Guest stay extended by 2 hours.");
    } catch (err) {
      Alert.alert("Error", "Could not extend stay.");
    }
  };

  const formatDisplayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }); // Result: 29 Mar 2026
  };

  const formatDisplayTime = (timeStr: string) => {
    // If timeStr is "21:00:00", this converts it to "9:00 PM"
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "NOT ARRIVED",
          container: "bg-gray-100",
          text: "text-gray-600",
        };
      case "checked_in":
        return {
          label: "INSIDE",
          container: "bg-green-100",
          text: "text-green-700",
        };
      case "checked_out":
        return {
          label: "DEPARTED",
          container: "bg-blue-100",
          text: "text-blue-700",
        };
      case "overstayed":
        return {
          label: "OVERSTAYED",
          container: "bg-red-100",
          text: "text-red-700",
        };
      default:
        return {
          label: status.toUpperCase(),
          container: "bg-gray-100",
          text: "text-gray-600",
        };
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Search Header */}
      <View className="px-4 mb-4">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <Search size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-gray-900 text-base"
            placeholder="Search guest name or code..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredInvitations.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 bg-gray-100 rounded-2xl items-center justify-center mb-4">
            <MapPin size={36} color="#4B5563" />
          </View>
          <Text className="text-lg font-semibold text-gray-700 mb-2">
            {searchQuery ? "No matches found" : "No active invitations"}
          </Text>
          <TouchableOpacity
            onPress={onInvitePress}
            className="bg-indigo-600 py-3 px-6 rounded-xl"
          >
            <Text className="text-white font-bold">Invite a guest</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text className="text-gray-500 font-medium mb-4">
            {searchQuery
              ? `Search Results (${filteredInvitations.length})`
              : `Active Passes (${invitations.length})`}
          </Text>
          <ScrollView
            className="flex-1 px-4"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => {
                  setIsRefreshing(true);
                  fetchInvitations();
                }}
              />
            }
          >
            {filteredInvitations.map((item) => (
              <View
                key={item.id}
                className="bg-white p-4 rounded-2xl mb-4 border border-gray-100 shadow-sm flex-row items-center"
              >
                <View className="mr-4">
                  {item.guest_image_url ? (
                    <Image
                      source={{ uri: item.guest_image_url }}
                      className="w-14 h-14 rounded-full"
                    />
                  ) : (
                    <View className="w-14 h-14 rounded-full bg-indigo-50 items-center justify-center">
                      <User size={24} color="#4f46e5" />
                    </View>
                  )}
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-lg font-bold text-gray-900 capitalize flex-1 mr-2" // Added flex-1 and margin here
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.guest_name}
                    </Text>
                  </View>

                  <Text className="text-indigo-600 font-mono font-bold tracking-widest">
                    {item.access_code}
                  </Text>

                  {/* Conditional Date/Time Rendering */}
                  <View className="mt-1">
                    {item.invite_type === "one_time" ? (
                      <>
                        <Text className="text-gray-600 text-xs font-semibold">
                          {formatDisplayName(item.start_date)}
                        </Text>
                        <Text className="text-gray-400 text-[10px]">
                          {formatDisplayTime(item.start_time)} —{" "}
                          {formatDisplayTime(item.end_time)}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text className="text-gray-600 text-xs font-semibold">
                          {formatDisplayName(item.start_date)} -{" "}
                          {formatDisplayName(item.end_date)}
                        </Text>
                        <Text className="text-gray-400 text-[10px]">
                          Daily: {formatDisplayTime(item.start_time)} —{" "}
                          {formatDisplayTime(item.end_time)}
                        </Text>
                      </>
                    )}
                  </View>

                  {(() => {
                    const { label, container, text } = getStatusDetails(
                      item.status,
                    );
                    return (
                      <View className={`${container} px-2 py-0.5 rounded-md mt-1 flex-row justify-center items-center w-24`}>
                        <Text
                          className={`${text} text-[10px] font-extrabold tracking-tight`}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })()}
                  
                </View>

                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => handleCancel(item.id!, item.guest_name)}
                    className="p-3 bg-red-50 rounded-full"
                  >
                    <Trash2 size={20} color="#ef4444" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleExtend(item.id)}
                    className="p-3 bg-indigo-50 rounded-full mr-2"
                  >
                    <Clock size={20} color="#4f46e5" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View className="h-20" />
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default TrackGuestView;
