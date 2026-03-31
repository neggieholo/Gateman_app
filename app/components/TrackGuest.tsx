import * as Sharing from "expo-sharing";
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  MapPin,
  Search,
  Share2,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { invitationApi } from "../services/api";
import { Invitation } from "../services/interfaces";
import { useUser } from "../UserContext";
import { EditInvitationModal } from "./EditInvitationModal";
import { InvitationCard } from "./InvitationCard";

const TrackGuestView = ({ onInvitePress }: { onInvitePress: () => void }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const viewShotRef = useRef<any>(null); // Add this ref
  const [isSharing, setIsSharing] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<Invitation | null>(null);

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

  const handleEditPress = (item: Invitation) => {
    setSelectedInvitation(item);
    setEditModalVisible(true);
  };

  const handleUpdateInvitation = async (updatedData: Partial<Invitation>) => {
    if (!selectedInvitation?.id) return;

    try {
      // Call your service to update (ensure your API service has an 'update' method)
      await invitationApi.updateInvitation(selectedInvitation.id, updatedData);

      fetchInvitations(); // Refresh the list
      setEditModalVisible(false);
      Alert.alert("Success", "Invitation updated successfully.");
    } catch (err) {
      Alert.alert("Error", "Failed to update invitation.");
    }
  };

  const handleShare = async (item: Invitation) => {
    try {
      setIsSharing(true);
      setSelectedInvitation(item);

      // 1. Ensure the UI has rendered the card with the new data
      await new Promise((resolve) => setTimeout(resolve, 400));

      const imageUri = await captureRef(viewShotRef, {
        format: "png",
        quality: 1.0,
      });

      if (imageUri) {
        // 2. Share the Image FIRST and WAIT for it to finish
        await Sharing.shareAsync(imageUri, {
          mimeType: "image/png",
          dialogTitle: `Share Access Pass for ${item.guest_name}`,
        });

        // 3. Add a small buffer so the system share sheet can fully dismiss
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 4. Only share text if there are exclusions or if you want a follow-up message
        if (item.excluded_dates && item.excluded_dates.length > 0) {
          const formattedExclusions = item.excluded_dates
            .map((d) => d.split("-").reverse().join("/"))
            .join("\n• ");

          const finalMessage = `Hello ${item.guest_name}, here is your access pass for GateMan estate.\n\n⚠️ NOTE: Access is DENIED on these dates:\n• ${formattedExclusions}`;

          await Share.share({
            message: finalMessage,
          });
        }
      }
    } catch (err) {
      Alert.alert("Error", "Could not share invitation.");
    } finally {
      setIsSharing(false);
    }
  };

  const formatDisplayName = (dateStr: string | Date) => {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString("en-GB"); // Result: DD/MM/YYYY
  };

  const formatDisplayTime = (timeStr: string | Date) => {
    if (timeStr instanceof Date) {
      return timeStr.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    // Handle "21:00:00" string from API
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isPastTime = (endDate: string, endTime: string) => {
    const [hours, minutes] = endTime.split(":");
    const expiry = new Date(endDate);
    expiry.setHours(parseInt(hours), parseInt(minutes), 0);
    return new Date() > expiry;
  };

  const getStatusDetails = (status: string, isExpired: boolean) => {
    if (status === "pending" && isExpired) {
      return { label: "EXPIRED", container: "bg-red-50", text: "text-red-400" };
    }

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

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
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
            {filteredInvitations.map((item) => {
              const isExpired = isPastTime(item.end_date, item.end_time);
              const isPending = item.status === "pending";
              const isExpanded = expandedId === item.id;
              const isMultiEntry = item.invite_type === "multi_entry";
              const isDone =
                item.status === "checked_out" || (isPending && isExpired);
              const canCancel = isPending && !isExpired;
              const canEdit = item.status !== "checked_out" && !isExpired;
              const canShare = isPending && !isExpired;
              const statusInfo = getStatusDetails(item.status, isExpired);
              return (
                <View key={item.id} className="mb-4 flex gap-2 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <View className="flex-row items-center">
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

                      <View
                        className={`${statusInfo.container} px-2 py-0.5 rounded-md flex w-fit justify-center items-center mt-2`}
                      >
                        <Text
                          className={`${statusInfo.text} text-[10px] font-extrabold`}
                        >
                          {statusInfo.label}
                        </Text>
                      </View>
                    </View>

                    <View className="flex items-center gap-3 mx-1">
                      {canEdit && (
                        <TouchableOpacity
                          onPress={() => handleEditPress(item)} // This will open your new Modal
                          className="p-3 bg-indigo-50 rounded-full"
                        >
                          <Edit2 size={18} color="#4f46e5" />
                        </TouchableOpacity>
                      )}

                      {/* CANCEL BUTTON (Trash) - Only for Pending */}
                      {canCancel && (
                        <TouchableOpacity
                          onPress={() =>
                            handleCancel(item.id!, item.guest_name)
                          }
                          className="p-3 bg-red-50 rounded-full"
                        >
                          <Trash2 size={18} color="#ef4444" />
                        </TouchableOpacity>
                      )}

                      {canShare && (
                        <TouchableOpacity
                          onPress={() => handleShare(item)}
                          disabled={isSharing}
                          className="p-3 bg-green-50 rounded-full"
                        >
                          <Share2 size={18} color="#10b981" />
                        </TouchableOpacity>
                      )}

                      {/* LOCKED STATE (If nothing can be done) */}
                      {isDone && (
                        <View className="px-2">
                          <Text className="text-gray-300 text-[10px] font-bold">
                            HISTORY
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {isMultiEntry && (
                    <View className="mt-2 border-t border-gray-50 pt-2">
                      {/* The Toggle Row */}
                      <TouchableOpacity
                        onPress={() => toggleExpand(item.id!)}
                        className="flex-row items-center justify-between"
                      >
                        <Text className="text-gray-500 text-[10px] font-bold uppercase">
                          Exclusion Dates
                        </Text>
                        <View className="ml-2">
                          {isExpanded ? (
                            <ChevronUp size={18} color="#9CA3AF" />
                          ) : (
                            <ChevronDown size={18} color="#9CA3AF" />
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* The Conditional Expansion */}
                      {isExpanded && (
                        <>
                          {item.excluded_dates &&
                          item.excluded_dates.length > 0 ? (
                            <View className="flex-row flex-wrap gap-1 mt-2">
                              {item.excluded_dates.map((date) => (
                                <View
                                  key={date}
                                  className="bg-red-50 px-2 py-1 rounded-md border border-red-100"
                                >
                                  <Text className="text-red-600 text-[10px] font-medium">
                                    {date.split("-").reverse().join("/")}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text className="text-gray-400 text-[10px] italic mt-1">
                              No excluded dates for this guest.
                            </Text>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            <View className="h-20" />
          </ScrollView>
        </>
      )}
      <InvitationCard
        viewShotRef={viewShotRef}
        guestName={selectedInvitation?.guest_name || ""}
        guestImage={selectedInvitation?.guest_image_url || null}
        accessCode={selectedInvitation?.access_code || "000000"}
        startDate={
          selectedInvitation
            ? formatDisplayName(selectedInvitation.start_date)
            : ""
        }
        endDate={
          selectedInvitation
            ? formatDisplayName(selectedInvitation.end_date)
            : ""
        }
        startTime={
          selectedInvitation
            ? formatDisplayTime(selectedInvitation.start_time)
            : ""
        }
        endTime={
          selectedInvitation
            ? formatDisplayTime(selectedInvitation.end_time)
            : ""
        }
        inviteType={selectedInvitation ? selectedInvitation?.invite_type : ""}
      />
      <EditInvitationModal
        visible={editModalVisible}
        invitation={selectedInvitation}
        onClose={() => setEditModalVisible(false)}
        onUpdate={handleUpdateInvitation}
      />
    </View>
  );
};

export default TrackGuestView;
