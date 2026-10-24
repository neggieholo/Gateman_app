import * as Sharing from "expo-sharing";
import {
  AlertCircle,
  Briefcase,
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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  LayoutAnimation,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { invitationApi, isOvernightSchedule } from "../services/api";
import { Invitation } from "../services/interfaces";
import { useUser } from "../UserContext";
import { EditInvitationModal } from "./EditInvitationModal";
import { InvitationCard } from "./InvitationCard";

const TrackGuestView = ({
  estate_id,
  onInvitePress,
}: {
  estate_id: string;
  onInvitePress: () => void;
}) => {
  const { user, isDarkMode } = useUser();

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
  const [historyInvites, setHistoryInvites] = useState<string[]>([]);

  // Sync internal estate state if parent container passes a different estate down
  useEffect(() => {
    setSelectedEstateId(estate_id);
  }, [estate_id]);

  const fetchInvitations = useCallback(async () => {
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

  const canInvite = activeEstate?.plan?.selected_add_ons?.includes("security");

  useEffect(() => {
    if (canInvite) {
      fetchInvitations();
    } else return;
  }, [fetchInvitations, canInvite]);

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
              await invitationApi.deleteInvitation(id, selectedEstateId);
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

  const handleClearHistory = () => {
    if (historyInvites.length === 0) return;

    Alert.alert(
      "Clear History",
      `Are you sure you want to clear ${historyInvites.length} past/completed invitation(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await invitationApi.deleteHistory(
                historyInvites,
                selectedEstateId,
              );
              // Remove the cleared history invites from local state
              setInvitations((prev) =>
                prev.filter((item) => !historyInvites.includes(item.id!)),
              );
              setHistoryInvites([]);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to clear history.");
            }
          },
        },
      ],
    );
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

    const expiryDate = new Date(endDate);
    const [hours, minutes] = endTime.split(":").map(Number);

    const expiry = new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate(),
      hours,
      minutes,
      0,
      0,
    );

    return new Date() >= expiry;
  };

  const getMultiEntryStatus = (invite: Invitation) => {
    const isOverNight = isOvernightSchedule(invite.start_time, invite.end_time);

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

    const startDate = toLocalDateStr(invite.start_date);
    const endDate = toLocalDateStr(invite.end_date);

    // Setup today's time window.
    const [startH, startM] = invite.start_time.split(":").map(Number);
    const [endH, endM] = invite.end_time.split(":").map(Number);

    const todayStart = new Date(now);
    todayStart.setHours(startH, startM, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(endH, endM, 0, 0);

    // 1. GLOBAL EXPIRY: end_date + end_time is the exact final expiry.
    const expiryDate = new Date(invite.end_date);

    const overallExpiry = new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate(),
      endH,
      endM,
      0,
      0,
    );

    if (now >= overallExpiry) {
      return {
        label: "EXPIRED",
        container: "bg-rose-50",
        text: "text-rose-500",
      };
    }

    // 2. EXCLUSION CHECK.
    if (invite.excluded_dates?.includes(todayStr)) {
      return {
        label: "NOT ALLOWED TODAY",
        container: "bg-amber-100",
        text: "text-amber-700",
      };
    }

    // 3. OVERSTAYED FROM A PREVIOUS DAY.
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

    // Determine whether the current time falls within today's window
    // or the overnight window that started yesterday.
    const previousDayStart = new Date(todayStart);
    previousDayStart.setDate(previousDayStart.getDate() - 1);

    const previousDayEnd = new Date(now);
    previousDayEnd.setHours(endH, endM, 0, 0);

    const isWithinPreviousOvernightWindow =
      isOverNight && now >= previousDayStart && now <= previousDayEnd;

    const isWithinTodayWindow = isOverNight
      ? now >= todayStart || now <= todayEnd
      : now >= todayStart && now <= todayEnd;

    const isWithinWindow =
      isWithinTodayWindow || isWithinPreviousOvernightWindow;

    // 4. GUEST CURRENTLY INSIDE.
    if (isCheckedInToday && !isCheckedOutToday) {
      if (!isWithinWindow) {
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

    // 5. DEPARTED TODAY.
    if (isCheckedOutToday) {
      return {
        label: "DEPARTED TODAY",
        container: "bg-blue-100",
        text: "text-blue-700",
      };
    }

    // 6. CHECK THE INVITATION DATE RANGE.
    if (startDate && todayStr < startDate) {
      return {
        label: "UPCOMING",
        container: "bg-slate-50",
        text: "text-slate-400",
      };
    }

    if (endDate && todayStr > endDate) {
      return {
        label: "EXPIRED",
        container: "bg-rose-50",
        text: "text-rose-500",
      };
    }

    // 7. READY FOR ENTRY DURING AN OVERNIGHT WINDOW.
    // For example, 8 PM–6 AM: after midnight, the window
    // that started yesterday is still active until 6 AM.
    if (isWithinPreviousOvernightWindow) {
      return {
        label: "READY FOR ENTRY",
        container: "bg-indigo-100",
        text: "text-indigo-700",
      };
    }

    // 8. NOT ARRIVED TODAY.
    if (startDate && endDate && todayStr >= startDate && todayStr <= endDate) {
      if (isWithinTodayWindow) {
        return {
          label: "READY FOR ENTRY",
          container: "bg-indigo-100",
          text: "text-indigo-700",
        };
      }

      if (now < todayStart) {
        return {
          label: "NOT YET READY TODAY",
          container: "bg-slate-100",
          text: "text-slate-500",
        };
      }

      return {
        label: "EXPIRED TODAY",
        container: "bg-rose-50",
        text: "text-rose-400",
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
    endDate: string,
    endTime: string,
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

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );

    if (status === "pending" && today < startDay) {
      return {
        label: "UPCOMING",
        container: "bg-indigo-50",
        text: "text-indigo-500",
      };
    }

    const [endH, endM] = endTime.split(":").map(Number);
    const expiryDate = endDate ? new Date(endDate) : null;

    const overallExpiry = expiryDate
      ? new Date(
          expiryDate.getFullYear(),
          expiryDate.getMonth(),
          expiryDate.getDate(),
          endH,
          endM,
          0,
          0,
        )
      : null;

    if (
      status === "pending" &&
      (isExpired || (overallExpiry && now >= overallExpiry))
    ) {
      return {
        label: "EXPIRED",
        container: "bg-rose-50",
        text: "text-rose-500",
      };
    }

    if (status === "pending") {
      const [startH, startM] = startTime.split(":").map(Number);
      const todayStartTime = new Date(start);
      todayStartTime.setHours(startH, startM, 0, 0);

      const todayEndTime = new Date(start);
      todayEndTime.setHours(endH, endM, 0, 0);

      const isOverNight = todayStartTime > todayEndTime;

      const isWithinWindow = isOverNight
        ? now >= todayStartTime || now <= todayEndTime
        : now >= todayStartTime && now <= todayEndTime;

      if (isWithinWindow) {
        return {
          label: "READY FOR ENTRY",
          container: "bg-indigo-100",
          text: "text-indigo-700",
        };
      }

      return {
        label: now < todayStartTime ? "NOT YET READY" : "EXPIRED",
        container: now < todayStartTime ? "bg-slate-100" : "bg-rose-50",
        text: now < todayStartTime ? "text-slate-600" : "text-rose-500",
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
    <View className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
      {/* Search Header and Filter Group */}
      {user?.estate_ids && user.estate_ids.length > 1 && (
        <TouchableOpacity
          onPress={() => setShowEstateFilterModal(true)}
          className={`mb-4 flex-row items-center justify-between p-4 rounded-2xl border ${
            isDarkMode
              ? "bg-slate-900 border-slate-800"
              : "bg-white border-slate-200"
          } shadow-sm`}
        >
          <View className="flex-row items-center flex-1">
            <MapPin size={14} color="#6366f1" />
            <Text
              className={`ml-2 text-xs font-black uppercase tracking-wider ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              } flex-1`}
              numberOfLines={1}
            >
              Estate Scope: {activeEstateFilterName}
            </Text>
          </View>
          <ChevronDown size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}

      {!canInvite ? (
        <View className="h-full flex items-center justify-center">
          <View
            className={`p-5 rounded-2xl border flex-row justify-between items-center ${
              isDarkMode
                ? "bg-gm-navy border-amber-500/30"
                : "bg-amber-500/5 border-amber-500/20"
            }`}
          >
            <View className="flex-row items-center flex-1 pr-2">
              <AlertCircle size={18} color="#f59e0b" />
              <Text
                className={`ml-3 text-xs font-semibold flex-shrink ${
                  isDarkMode ? "text-amber-400" : "text-amber-600"
                }`}
                numberOfLines={2}
              >
                This estate does not have the Community feature active in its
                subscription plan.
              </Text>
            </View>

            <View className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Text className="text-[10px] font-black uppercase text-amber-500">
                UNAVAILABLE
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View
            className={`flex-row items-center border rounded-xl px-3 py-1 shadow-xs ${
              isDarkMode
                ? "bg-gm-navy border-slate-800"
                : "bg-slate-50 border-gray-200"
            }`}
          >
            <Search size={18} color={isDarkMode ? "#475569" : "#9CA3AF"} />
            <TextInput
              className={`flex-1 ml-2 text-sm font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}
              placeholder="Search guest name or code..."
              placeholderTextColor={isDarkMode ? "#475569" : "#9CA3AF"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color={isDarkMode ? "#64748b" : "#9CA3AF"} />
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator
                size="large"
                color={isDarkMode ? "#D4AF37" : "#4f46e5"}
              />
            </View>
          ) : filteredInvitations.length === 0 ? (
            <View className="flex-1 items-center justify-center p-6">
              <View
                className={`w-20 h-20 rounded-2xl items-center justify-center mb-4 ${isDarkMode ? "bg-gm-navy" : "bg-gray-100"}`}
              >
                <User size={36} color={isDarkMode ? "#64748b" : "#4B5563"} />
              </View>
              <Text
                className={`text-lg font-semibold mb-2 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}
              >
                {searchQuery ? "No matches found" : "No active invitations"}
              </Text>
              <TouchableOpacity
                onPress={onInvitePress}
                className={`py-3 px-6 rounded-xl border ${isDarkMode ? "bg-slate-900 border-gm-gold" : "bg-indigo-600 border-transparent"}`}
              >
                <Text
                  className={`font-bold ${isDarkMode ? "text-gm-gold" : "text-white"}`}
                >
                  Invite a guest
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between py-3">
                <Text className="text-gray-500 font-oswald-semibold">
                  {searchQuery
                    ? `Search Results (${filteredInvitations.length})`
                    : `Active Passes (${invitations.length})`}
                </Text>
                {historyInvites.length > 0 && (
                  <TouchableOpacity
                    className="bg-red-500 rounded-sm"
                    onPress={handleClearHistory}
                  >
                    <Text className="text-white px-1 font-oswald-semibold">
                      Clear All History/Expired({historyInvites.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    tintColor={isDarkMode ? "#D4AF37" : "#4f46e5"}
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
                  if (isDone && !historyInvites.includes(item.id!)) {
                    setHistoryInvites((prev) => [...prev, item.id!]);
                  }

                  const canEdit = isStaffEntry || item.status !== "checked_out";
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
                        item.end_date,
                        item.end_time,
                      );

                  if (
                    statusInfo.label === "EXPIRED" &&
                    !historyInvites.includes(item.id!)
                  ) {
                    setHistoryInvites((prev) => [...prev, item.id!]);
                  }
                  return (
                    <View
                      key={item.id}
                      className={`mb-4 p-4 rounded-2xl border shadow-sm ${
                        isStaffEntry
                          ? isDarkMode
                            ? "border-gm-gold/20 bg-gm-navy/30"
                            : "border-indigo-100 bg-indigo-50/5"
                          : isDarkMode
                            ? "border-slate-800 bg-gm-navy"
                            : "border-gray-100 bg-white"
                      }`}
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
                              className={`w-14 h-14 rounded-full items-center justify-center ${
                                isStaffEntry
                                  ? isDarkMode
                                    ? "bg-slate-900"
                                    : "bg-indigo-100"
                                  : isDarkMode
                                    ? "bg-slate-900"
                                    : "bg-indigo-50"
                              }`}
                            >
                              {isStaffEntry ? (
                                <Briefcase
                                  size={22}
                                  color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                                />
                              ) : (
                                <User
                                  size={24}
                                  color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                                />
                              )}
                            </View>
                          )}
                        </View>

                        <View className="flex-1">
                          <Text
                            className={`text-lg font-bold capitalize ${isDarkMode ? "text-white" : "text-gray-900"}`}
                            numberOfLines={1}
                          >
                            {item.guest_name}
                          </Text>

                          {/* Staff Position Card Text */}
                          {isStaffEntry && item.staff_position && (
                            <Text
                              className={`font-bold text-xs mt-0.5 mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                            >
                              💼 {item.staff_position}
                            </Text>
                          )}

                          <Text
                            className={`font-mono font-bold tracking-widest ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}
                          >
                            {item.access_code}
                          </Text>

                          <View className="mt-1">
                            {isStaffEntry ? (
                              <>
                                {item.is_activated && item.end_date ? (
                                  <>
                                    <Text
                                      className={`${isDarkMode ? "text-slate-300" : "text-gray-600"} text-xs font-semibold`}
                                    >
                                      Valid:{" "}
                                      {formatDisplayName(item.start_date)} -{" "}
                                      {formatDisplayName(item.end_date)}
                                    </Text>
                                    <Text className="text-gray-400 text-[10px]">
                                      Daily:{" "}
                                      {formatDisplayTime(item.start_time)} —{" "}
                                      {formatDisplayTime(item.end_time)}
                                    </Text>
                                  </>
                                ) : (
                                  <>
                                    <Text
                                      className={`${isDarkMode ? "text-slate-300" : "text-gray-600"} text-xs font-semibold`}
                                    >
                                      Activated:{" "}
                                      {formatDisplayName(item.start_date)}
                                    </Text>
                                    <Text className="text-gray-400 text-[10px]">
                                      Daily:{" "}
                                      {formatDisplayTime(item.start_time)} —{" "}
                                      {formatDisplayTime(item.end_time)}
                                    </Text>
                                  </>
                                )}
                              </>
                            ) : isMultiEntry ? (
                              <>
                                <Text
                                  className={`${isDarkMode ? "text-slate-300" : "text-gray-600"} text-xs font-semibold`}
                                >
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
                                <Text
                                  className={`${isDarkMode ? "text-slate-300" : "text-gray-600"} text-xs font-semibold`}
                                >
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
                              className={`px-2 py-0.5 rounded-md flex w-fit justify-center items-center mt-2 self-start ${
                                item.is_activated
                                  ? isDarkMode
                                    ? "bg-emerald-950/40 border border-emerald-900/30"
                                    : "bg-emerald-100"
                                  : isDarkMode
                                    ? "bg-red-950/40 border border-red-900/30"
                                    : "bg-rose-100"
                              }`}
                            >
                              <Text
                                className={`text-[10px] font-extrabold ${item.is_activated ? "text-emerald-500" : "text-rose-500"}`}
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
                              className={`p-3 rounded-full ${isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-indigo-50"}`}
                            >
                              <Edit2
                                size={18}
                                color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                              />
                            </TouchableOpacity>
                          )}

                          {canCancel && (
                            <TouchableOpacity
                              onPress={() =>
                                handleCancel(item.id!, item.guest_name)
                              }
                              className={`p-3 rounded-full ${isDarkMode ? "bg-red-950/30 border border-red-900/20" : "bg-red-50"}`}
                            >
                              <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                          )}

                          {(canShare || isStaffEntry) && (
                            <TouchableOpacity
                              onPress={() => handleShare(item)}
                              disabled={isSharing}
                              className={`p-3 rounded-full ${isDarkMode ? "bg-emerald-950/30 border border-emerald-900/20" : "bg-green-50"}`}
                            >
                              <Share2 size={18} color="#10b981" />
                            </TouchableOpacity>
                          )}

                          {isDone && !isStaffEntry && (
                            <View className="px-2">
                              <Text className="text-gray-400 text-[10px] font-bold">
                                HISTORY
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {isMultiEntry && (
                        <View
                          className={`mt-2 border-t pt-2 ${isDarkMode ? "border-slate-800" : "border-gray-50"}`}
                        >
                          <TouchableOpacity
                            onPress={() => toggleExpand(item.id!)}
                            className="flex-row items-center justify-between"
                          >
                            <Text className="text-gray-500 text-[10px] font-bold uppercase">
                              Exclusion Dates
                            </Text>
                            {isExpanded ? (
                              <ChevronUp
                                size={18}
                                color={isDarkMode ? "#64748b" : "#9CA3AF"}
                              />
                            ) : (
                              <ChevronDown
                                size={18}
                                color={isDarkMode ? "#64748b" : "#9CA3AF"}
                              />
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
                                      className={`px-2 py-1 rounded-md border ${
                                        isDarkMode
                                          ? "bg-red-950/30 border-red-900/20"
                                          : "bg-red-50 border-red-100"
                                      }`}
                                    >
                                      <Text className="text-red-500 text-[10px] font-medium">
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
            inviteType={
              selectedInvitation ? selectedInvitation?.invite_type : ""
            }
            staffPosition={selectedInvitation?.staff_position}
            estate_name={activeEstate?.name || ""}
            estate_address={activeEstate?.street_address || ""}
            estate_state={activeEstate?.state || ""}
            estate_lga={activeEstate?.lga || ""}
            locations={activeLocations}
            permittedDays={selectedInvitation?.permitted_days}
            excludedDates={selectedInvitation?.excluded_dates}
          />

          <EditInvitationModal
            visible={editModalVisible}
            invitation={selectedInvitation}
            onClose={() => setEditModalVisible(false)}
            onUpdate={handleUpdateInvitation}
          />
        </>
      )}
      {/* Internal Estate Switcher Sheet */}
      <Modal
        visible={showEstateFilterModal}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 justify-center bg-black/50 px-4">
          <View
            className={`${isDarkMode ? "bg-slate-900" : "bg-white"} p-6 max-h-[65%]`}
          >
            <Text
              className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Select Active Estate
            </Text>
            <FlatList
              data={user?.estates || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedEstateId(item.id.toString());
                    setShowEstateFilterModal(false);
                  }}
                  className={`p-4 rounded-2xl mb-3 border flex-row items-center ${
                    selectedEstateId === item.id
                      ? "border-indigo-500 bg-indigo-50/40"
                      : isDarkMode
                        ? "border-slate-800 bg-slate-800/40"
                        : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <MapPin
                    size={20}
                    color={selectedEstateId === item.id ? "#4f46e5" : "#94a3b8"}
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}
                    >
                      {item.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            {selectedEstateId && (
              <TouchableOpacity
                onPress={() => setShowEstateFilterModal(false)}
                className="mt-2 p-4 bg-slate-200 rounded-2xl items-center"
              >
                <Text className="text-slate-700 font-bold">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TrackGuestView;
