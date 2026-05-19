import * as Sharing from "expo-sharing";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Edit2,
  MapPin,
  Search,
  Share2,
  SlidersHorizontal,
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
  Modal,
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
import { TrackInvitationCard } from "./TrackInvitationCard";

const TrackGuestView = ({
  estate_id,
  onInvitePress,
}: {
  estate_id: string;
  onInvitePress: () => void;
}) => {
  const { user } = useUser();

  // Initialize internal filter state with the prop passed from parent tabs
  const [selectedEstateId, setSelectedEstateId] = useState<string>(estate_id);
  const [showEstateFilterModal, setShowEstateFilterModal] = useState(false);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const viewShotRef = useRef<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<Invitation | null>(null);

  // Sync internal estate state if parent container passes a different estate down
  useEffect(() => {
    setSelectedEstateId(estate_id);
  }, [estate_id]);

  const fetchInvitations = async () => {
    if (!selectedEstateId) return;
    setIsLoading(true);
    try {
      const data = await invitationApi.getInvitations(selectedEstateId);
      setInvitations(data);
    } catch (err) {
      console.error("Failed fetching invitations:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Re-fetch automatically whenever the internal selected estate filter switches
  useEffect(() => {
    fetchInvitations();
  }, [selectedEstateId]);

  const activeEstateFilterName = useMemo(() => {
    if (!selectedEstateId || !user?.estates) return "Select Estate";
    const found = user.estates.find(
      (e) => e.id.toString() === selectedEstateId.toString(),
    );
    return found ? found.name : "Select Estate";
  }, [selectedEstateId, user?.estates]);

  const activeEstate = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return null;
    return user.estates.find((e) => e.id === selectedEstateId) || null;
  }, [selectedEstateId, user?.estates]);

  const activeLocations = useMemo(() => {
    if (!user?.locations || !selectedEstateId) return [];
    return user.locations[selectedEstateId] || [];
  }, [selectedEstateId, user?.locations]);

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
      await invitationApi.updateInvitation(selectedInvitation.id, updatedData);
      fetchInvitations();
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

      await new Promise((resolve) => setTimeout(resolve, 400));

      const imageUri = await captureRef(viewShotRef, {
        format: "png",
        quality: 1.0,
      });

      if (imageUri) {
        await Sharing.shareAsync(imageUri, {
          mimeType: "image/png",
          dialogTitle: `Share Access Pass for ${item.guest_name}`,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (item.excluded_dates && item.excluded_dates.length > 0) {
          const formattedExclusions = item.excluded_dates
            .map((d) => d.split("-").reverse().join("/"))
            .join("\n• ");

          const finalMessage = `Hello ${item.guest_name}, here is your access pass for GateMan estate.\n\n⚠️ NOTE: Access is DENIED on these dates:\n• ${formattedExclusions}`;

          await Share.share({ message: finalMessage });
        }
      }
    } catch (err) {
      Alert.alert("Error", "Could not share invitation.");
    } finally {
      setIsSharing(false);
    }
  };

  const formatDisplayName = (dateStr: string | Date) => {
    if (!dateStr) return "N/A";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString("en-GB");
  };

  const formatDisplayTime = (timeStr: string | Date) => {
    if (!timeStr) return "N/A";
    if (timeStr instanceof Date) {
      return timeStr.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isPastTime = (endDate: string, endTime: string) => {
    if (!endDate || !endTime) return false;
    const [hours, minutes] = endTime.split(":");
    const expiry = new Date(endDate);
    expiry.setHours(parseInt(hours), parseInt(minutes), 0);
    return new Date() > expiry;
  };

  const getMultiEntryStatus = (invite: Invitation) => {
    if (invite.is_cancelled) {
      return {
        label: "CANCELLED",
        container: "bg-rose-100",
        text: "text-rose-700",
      };
    }
    const now = new Date();
    const toLocalDateStr = (d: any): string => {
      if (!d) return "";
      return new Date(d).toLocaleDateString("en-CA");
    };

    const todayStr = toLocalDateStr(now);
    const checkinDateStr = toLocalDateStr(invite.actual_checkin_date);
    const checkoutDateStr = toLocalDateStr(invite.actual_checkout_date);

    const [startH, startM] = invite.start_time.split(":");
    const [endH, endM] = invite.end_time.split(":");

    const todayStart = new Date();
    todayStart.setHours(parseInt(startH), parseInt(startM), 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(parseInt(endH), parseInt(endM), 0, 0);

    const overallExpiry = new Date(invite.end_date);
    overallExpiry.setHours(parseInt(endH), parseInt(endM), 0);
    if (now > overallExpiry) {
      return {
        label: "EXPIRED",
        container: "bg-rose-50",
        text: "text-rose-500",
      };
    }

    if (invite.excluded_dates?.includes(todayStr)) {
      return {
        label: "NOT ALLOWED TODAY",
        container: "bg-amber-100",
        text: "text-amber-700",
      };
    }

    if (checkinDateStr && checkinDateStr < todayStr) {
      if (!checkoutDateStr || checkoutDateStr < checkinDateStr) {
        return {
          label: "OVERSTAYED (PAST)",
          container: "bg-red-100",
          text: "text-red-700",
        };
      }
    }

    const isCheckedInToday = checkinDateStr === todayStr;
    const isCheckedOutToday = checkoutDateStr === todayStr;

    if (isCheckedInToday && !isCheckedOutToday) {
      if (now > todayEnd) {
        return {
          label: "OVERSTAYED TODAY",
          container: "bg-red-100",
          text: "text-red-700",
        };
      }
      return {
        label: "INSIDE",
        container: "bg-emerald-100",
        text: "text-emerald-700",
      };
    }

    if (isCheckedOutToday) {
      return {
        label: "DEPARTED TODAY",
        container: "bg-blue-100",
        text: "text-blue-700",
      };
    }

    if (!isCheckedInToday && now > todayEnd) {
      return {
        label: "EXPIRED TODAY",
        container: "bg-rose-50",
        text: "text-rose-400",
      };
    }

    const startDate = toLocalDateStr(invite.start_date);
    const endDate = toLocalDateStr(invite.end_date);

    if (startDate && endDate && todayStr >= startDate && todayStr <= endDate) {
      if (now < todayStart) {
        return {
          label: "NOT ARRIVED TODAY",
          container: "bg-slate-100",
          text: "text-slate-500",
        };
      }
      return {
        label: "READY FOR ENTRY",
        container: "bg-indigo-100",
        text: "text-indigo-700",
      };
    }

    return {
      label: "UPCOMING",
      container: "bg-slate-50",
      text: "text-slate-400",
    };
  };

  const getStatusDetails = (
    status: string,
    isExpired: boolean,
    startDate: string,
    isCancelled: boolean,
    startTime: string,
  ) => {
    if (isCancelled) {
      return {
        label: "CANCELLED",
        container: "bg-rose-100",
        text: "text-rose-700",
      };
    }

    const now = new Date();
    const start = new Date(startDate);
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const startDay = new Date(start.setHours(0, 0, 0, 0));

    if (status === "pending" && today < startDay) {
      return {
        label: "UPCOMING",
        container: "bg-indigo-50",
        text: "text-indigo-500",
      };
    }

    if (status === "pending" && isExpired) {
      return {
        label: "EXPIRED",
        container: "bg-rose-50",
        text: "text-rose-500",
      };
    }

    if (status === "pending") {
      const [startH, startM] = startTime.split(":");
      const todayStartTime = new Date();
      todayStartTime.setHours(parseInt(startH), parseInt(startM), 0, 0);

      if (now >= todayStartTime) {
        return {
          label: "READY FOR ENTRY",
          container: "bg-indigo-100",
          text: "text-indigo-700",
        };
      }
      return {
        label: "NOT ARRIVED",
        container: "bg-slate-100",
        text: "text-slate-600",
      };
    }

    switch (status) {
      case "checked_in":
        return {
          label: "INSIDE",
          container: "bg-emerald-100",
          text: "text-emerald-700",
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
          container: "bg-amber-100",
          text: "text-amber-700",
        };
      default:
        return {
          label: status.toUpperCase(),
          container: "bg-slate-100",
          text: "text-slate-600",
        };
    }
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Search Header and Filter Group */}
      <View className="px-4 mb-3 flex-row gap-2 items-center">
        <View className="flex-1 flex-row items-center bg-slate-50 border border-gray-200 rounded-xl px-3 py-2.5 shadow-xs">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-gray-900 text-sm font-semibold"
            placeholder="Search guest name or code..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button triggers if resident belongs to multiple estates */}
        {user?.estate_ids && user.estate_ids.length > 1 && (
          <TouchableOpacity
            onPress={() => setShowEstateFilterModal(true)}
            className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 items-center justify-center"
          >
            <SlidersHorizontal size={18} color="#4f46e5" />
          </TouchableOpacity>
        )}
      </View>

      {/* Mini Current Filter Status Bar */}
      <View className="mx-4 mb-4 flex-row items-center bg-slate-50 rounded-full py-1.5 px-3 self-start border border-slate-100">
        <MapPin size={12} color="#4f46e5" />
        <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">
          Estate Scope: {activeEstateFilterName}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : filteredInvitations.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-20 h-20 bg-gray-100 rounded-2xl items-center justify-center mb-4">
            <User size={36} color="#4B5563" />
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
          <Text className="text-gray-500 font-medium mb-4 px-4">
            {searchQuery
              ? `Search Results (${filteredInvitations.length})`
              : `Active Passes (${invitations.length})`}
          </Text>

          <ScrollView
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
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
              const isStaffEntry = item.invite_type === "staff_entry";
              const isDone =
                item.status === "checked_out" || (isPending && isExpired);

              const canEdit =
                isStaffEntry || (item.status !== "checked_out" && !isExpired);
              const canCancel = isPending && !isExpired && !isStaffEntry;
              const canShare = isPending && !isExpired;

              const statusInfo = isMultiEntry
                ? getMultiEntryStatus(item)
                : getStatusDetails(
                    item.status,
                    isExpired,
                    item.start_date,
                    item.is_cancelled,
                    item.start_time,
                  );

              return (
                <View
                  key={item.id}
                  className={`mb-4 bg-white p-4 rounded-2xl border ${isStaffEntry ? "border-indigo-100 bg-indigo-50/5" : "border-gray-100"} shadow-sm`}
                >
                  <View className="flex-row items-center">
                    <View className="mr-4">
                      {item.guest_image_url ? (
                        <Image
                          source={{ uri: item.guest_image_url }}
                          className="w-14 h-14 rounded-full"
                        />
                      ) : (
                        <View
                          className={`w-14 h-14 rounded-full ${isStaffEntry ? "bg-indigo-100" : "bg-indigo-50"} items-center justify-center`}
                        >
                          {isStaffEntry ? (
                            <Briefcase size={22} color="#4f46e5" />
                          ) : (
                            <User size={24} color="#4f46e5" />
                          )}
                        </View>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text
                        className="text-lg font-bold text-gray-900 capitalize"
                        numberOfLines={1}
                      >
                        {item.guest_name}
                      </Text>

                      {/* Staff Position Card Text */}
                      {isStaffEntry && item.staff_position && (
                        <Text className="text-slate-500 font-bold text-xs mt-0.5 mb-1">
                          💼 {item.staff_position}
                        </Text>
                      )}

                      <Text className="text-indigo-600 font-mono font-bold tracking-widest">
                        {item.access_code}
                      </Text>

                      <View className="mt-1">
                        {isStaffEntry ? (
                          <>
                            {item.is_activated && item.end_date ? (
                              <>
                                <Text className="text-gray-600 text-xs font-semibold">
                                  Valid: {formatDisplayName(item.start_date)} -{" "}
                                  {formatDisplayName(item.end_date)}
                                </Text>
                                <Text className="text-gray-400 text-[10px]">
                                  Daily: {formatDisplayTime(item.start_time)} —{" "}
                                  {formatDisplayTime(item.end_time)}
                                </Text>
                              </>
                            ) : (
                              <Text className="text-gray-600 text-xs font-semibold">
                                Activated: {formatDisplayName(item.start_date)}
                              </Text>
                            )}
                          </>
                        ) : isMultiEntry ? (
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
                        ) : (
                          /* one_time entry block */
                          <>
                            <Text className="text-gray-600 text-xs font-semibold">
                              {item.end_date &&
                              item.end_date !== item.start_date
                                ? `${formatDisplayName(item.start_date)} - ${formatDisplayName(item.end_date)}`
                                : formatDisplayName(item.start_date)}
                            </Text>
                            <Text className="text-gray-400 text-[10px]">
                              {formatDisplayTime(item.start_time)} —{" "}
                              {formatDisplayTime(item.end_time)}
                            </Text>
                          </>
                        )}
                      </View>

                      {!isStaffEntry && (
                        <View
                          className={`${statusInfo.container} px-2 py-0.5 rounded-md flex w-fit justify-center items-center mt-2 self-start`}
                        >
                          <Text
                            className={`${statusInfo.text} text-[10px] font-extrabold`}
                          >
                            {statusInfo.label}
                          </Text>
                        </View>
                      )}

                      {isStaffEntry && (
                        <View
                          className={`px-2 py-0.5 rounded-md flex w-fit justify-center items-center mt-2 self-start ${item.is_activated ? "bg-emerald-100" : "bg-rose-100"}`}
                        >
                          <Text
                            className={`text-[10px] font-extrabold ${item.is_activated ? "text-emerald-700" : "text-rose-700"}`}
                          >
                            {item.is_activated ? "ACTIVE" : "DISABLED"}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="flex items-center gap-3 mx-1">
                      {canEdit && (
                        <TouchableOpacity
                          onPress={() => handleEditPress(item)}
                          className="p-3 bg-indigo-50 rounded-full"
                        >
                          <Edit2 size={18} color="#4f46e5" />
                        </TouchableOpacity>
                      )}

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

                      {isDone && !isStaffEntry && (
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
                      <TouchableOpacity
                        onPress={() => toggleExpand(item.id!)}
                        className="flex-row items-center justify-between"
                      >
                        <Text className="text-gray-500 text-[10px] font-bold uppercase">
                          Exclusion Dates
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={18} color="#9CA3AF" />
                        ) : (
                          <ChevronDown size={18} color="#9CA3AF" />
                        )}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View className="mt-2">
                          {item.excluded_dates &&
                          item.excluded_dates.length > 0 ? (
                            <View className="flex-row flex-wrap gap-1">
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
                            <Text className="text-gray-400 text-[10px] italic">
                              No excluded dates for this guest.
                            </Text>
                          )}
                        </View>
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

      {/* Internal Estate Switcher Sheet */}
      <Modal visible={showEstateFilterModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white h-[45%] rounded-t-[3rem] p-6">
            <View className="flex-row justify-between items-center mb-4 px-2">
              <Text className="font-black text-xl text-slate-900">
                Switch Estate Scope
              </Text>
              <TouchableOpacity onPress={() => setShowEstateFilterModal(false)}>
                <Text className="text-indigo-600 font-bold">Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} className="mt-2">
              {(user?.estates || []).map((estate) => (
                <TouchableOpacity
                  key={estate.id}
                  className="p-5 border-b border-slate-50 flex-row items-center justify-between"
                  onPress={() => {
                    setSelectedEstateId(estate.id.toString());
                    setShowEstateFilterModal(false);
                  }}
                >
                  <Text
                    className={`font-bold text-base ${selectedEstateId === estate.id.toString() ? "text-indigo-600" : "text-slate-700"}`}
                  >
                    {estate.name}
                  </Text>
                  {selectedEstateId === estate.id.toString() && (
                    <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* <TrackInvitationCard
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
      /> */}

      <InvitationCard
        viewShotRef={viewShotRef}
        guestName={selectedInvitation?.guest_name || ""}
        inviterName={user?.name || "Resident"}
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
        estate_name={activeEstate?.name || ""}
        estate_address={activeEstate?.address || ""}
        locations={activeLocations}
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
