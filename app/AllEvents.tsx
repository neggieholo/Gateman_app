import { useUser } from "@/app/UserContext";
import * as ImagePicker from "expo-image-picker";
import {
  Calendar,
  ChevronLeft,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  Hash,
  Landmark,
  MapPin,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteEvent,
  getAllBookings,
  getAllLocations,
  getBookingStatusBadge,
  getS3UploadedUrl,
  getEstatePaymentSettings,
  submitBookingPayment,
} from "./services/api";
import {
  EstateFacility,
  LocationBooking,
  PaymentMode,
  UtilityPaymentInfo,
} from "./services/interfaces";
import { DetailRow, MissingDetailsMessage } from "./UtilityPayment";

export default function AllEventsScreen() {
  const { user, isDarkMode, theme } = useUser();
  const [events, setEvents] = useState<LocationBooking[]>([]);
  const [locations, setLocations] = useState<EstateFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [showEstateFilterModal, setShowEstateFilterModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocationBooking | null>(
    null,
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_type: "bank_transfer",
    transaction_ref: "",
    receipt_url: "",
  });

  const [config, setConfig] = useState<{
    payment_type: PaymentMode;
    details: UtilityPaymentInfo;
  } | null>(null);

  const isApiReady =
    config?.payment_type === "api" && !!config.details?.external_api_url;

  const isManualReady =
    config?.payment_type === "manual" &&
    !!config.details?.bank_name &&
    !!config.details?.bank_account_number &&
    !!config.details?.bank_account_name;

  // Modal state for viewing the proof of payment / receipt image
  const [showPaymentImageModal, setShowPaymentImageModal] = useState(false);

  const flyerRef = useRef<View>(null);

  const fetchLocations = async (estateId: string | null) => {
    if (!estateId) return;
    setLoadingLocations(true);
    try {
      const locationsData = await getAllLocations(estateId);
      setLocations(locationsData);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      const idToFetch = selectedEstateId || user?.estate_ids?.[0];

      if (!idToFetch) return;

      try {
        setLoading(true);
        const [bookingsData] = await Promise.all([
          getAllBookings(idToFetch.toString()),
          fetchLocations(idToFetch.toString()),
        ]);
        setEvents(bookingsData);

        if (!selectedEstateId) {
          setSelectedEstateId(idToFetch.toString());
        }
      } catch (err) {
        Alert.alert("Error", "Could not load events or facilities");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedEstateId, user?.estate_ids]);

  const activeEstateFilterName = useMemo(() => {
    if (!selectedEstateId) return "All Estates";
    const found = user?.estates?.find(
      (e) => e.id.toString() === selectedEstateId.toString(),
    );
    return found ? found.name : "All Estates";
  }, [selectedEstateId, user?.estates]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) =>
      e.venue_name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [events, search]);

  // Retrieve the matched facility/venue details for capacity & pricing
  const selectedVenue = useMemo(() => {
    if (!selectedEvent) return null;
    return (
      locations.find((loc) => loc.id.toString() === selectedEvent.venue_id) ||
      locations.find((loc) => loc.name === selectedEvent.venue_name)
    );
  }, [selectedEvent, locations]);

  const formatEventDate = () => {
    if (selectedEvent) {
      const start = selectedEvent.start_date.split("T")[0];
      const end = selectedEvent.end_date?.split("T")[0];

      if (end && end !== start) {
        return `${start}\nto\n${end}`;
      }
      return start;
    }
  };

  const formatEventTime = () => {
    if (selectedEvent) {
      return `${selectedEvent.start_time} - ${selectedEvent.end_time}`;
    }
  };

  const handleOpenURL = async (url: string) => {
    if (!url) return;

    // Ensure protocol exists
    const finalUrl = url.toLowerCase().startsWith("http")
      ? url
      : `https://${url}`;

    try {
      const supported = await Linking.canOpenURL(finalUrl);
      if (supported) {
        await Linking.openURL(finalUrl);
      } else {
        Alert.alert(
          "Invalid Link",
          "The estate portal link is not properly formatted.",
        );
      }
    } catch (err) {
      console.error("GateMan Linking Error:", err);
      Alert.alert("Error", "Could not open the portal at this time.");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Event", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEvent(id);
          setEvents(events.filter((e) => e.id !== id));
          setSelectedEvent(null);
        },
      },
    ]);
  };

  const fetchPaymentInfo = async (id: string) => {
    setLoading(true);
    try {
      const res = await getEstatePaymentSettings(id);

      if (res.success && res.data) {
        setConfig({
          payment_type: res.data.payment_type,
          details: res.data.details,
        });
      } else {
        console.warn("Settings fetched but data block is empty");
      }
    } catch (err) {
      console.error("Fetch Settings Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0].uri) {
        setUploadingImage(true);
        const cloudUrl = await getS3UploadedUrl(result.assets[0].uri, "Event-Receipts");
        if (cloudUrl) {
          setPaymentForm((prev) => ({ ...prev, receipt_url: cloudUrl }));
        }
      }
    } catch (error) {
      console.error("Image Pick Error:", error);
      Alert.alert("Upload Error", "Could not process image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitPayment = async (id: string) => {
    if (!paymentForm.transaction_ref.trim()) {
      Alert.alert(
        "Validation Error",
        "Please enter the transaction reference code.",
      );
      return;
    }

    if (!paymentForm.receipt_url) {
      Alert.alert(
        "Validation Error",
        "Please upload your payment receipt image.",
      );
      return;
    }

    try {
      setSubmittingPayment(true);

      const paymentRes = await submitBookingPayment(id, {
        payment_url: paymentForm.receipt_url,
        transaction_ref: paymentForm.transaction_ref,
        payment_type: paymentForm.payment_type,
      });

      if (paymentRes.success) {
        Alert.alert(
          "Success",
          "Payment receipt submitted successfully! Pending admin confirmation.",
        );
      } else {
        throw new Error(
          paymentRes.message || "Failed to submit payment proof.",
        );
      }

      // Update local state so UI reflects PAYMENT_SUBMITTED instantly
      setSelectedEvent((prev) =>
        prev
          ? {
              ...prev,
              status: "PAYMENT_SUBMITTED",
              payment_url: paymentForm.receipt_url,
              transaction_ref: paymentForm.transaction_ref,
              payment_type: paymentForm.payment_type,
            }
          : null,
      );

      // Reset payment form state
      setPaymentForm({
        payment_type: "bank_transfer",
        transaction_ref: "",
        receipt_url: "",
      });
    } catch (error: any) {
      console.error("Payment Submission Error:", error);
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading)
    return (
      <ActivityIndicator
        className={`flex-1 ${isDarkMode ? "bg-slate-950" : ""}`}
        color={theme.accent}
      />
    );

  return (
    <View className={`flex-1 p-6 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
      {/* Search & Filter Bar Group */}
      <View className="flex-row items-center gap-2 mb-4">
        <View
          className={`flex-1 flex-row items-center rounded-2xl px-4 py-2 border ${
            isDarkMode
              ? "bg-gm-navy border-slate-800"
              : "bg-slate-100 border-slate-200"
          }`}
        >
          <Search size={20} color={isDarkMode ? "#475569" : "#94a3b8"} />
          <TextInput
            placeholder="Search your events..."
            placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
            className={`flex-1 ml-3 font-bold ${
              isDarkMode ? "text-white" : "text-slate-700"
            }`}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {user?.estate_ids && user.estate_ids.length > 1 && (
          <TouchableOpacity
            onPress={() => setShowEstateFilterModal(true)}
            className={`p-3.5 rounded-2xl border ${
              selectedEstateId
                ? isDarkMode
                  ? "bg-gm-navy border-gm-gold"
                  : "bg-indigo-50 border-indigo-200"
                : isDarkMode
                  ? "bg-gm-navy border-slate-800"
                  : "bg-slate-100 border-slate-200"
            }`}
          >
            <SlidersHorizontal
              size={18}
              color={selectedEstateId ? "#D4AF37" : "#64748b"}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filter Pill */}
      {selectedEstateId && (
        <View
          className={`flex-row items-center self-start border px-3 py-1.5 rounded-full mb-4 ${
            isDarkMode
              ? "bg-gm-navy/50 border-gm-gold/40"
              : "bg-indigo-50/60 border-indigo-100"
          }`}
        >
          <MapPin size={12} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
          <Text
            className={`text-[11px] font-oswald-semibold ml-1 mr-2 uppercase tracking-wide ${
              isDarkMode ? "text-gm-gold" : "text-indigo-950"
            }`}
          >
            {activeEstateFilterName}
          </Text>
        </View>
      )}

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View className="items-center mt-12">
            <Text className="text-slate-400 font-medium text-sm">
              No events found matching criteria
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = getBookingStatusBadge(item.status);
          const isApproved = item.status === "APPROVED";
          const isRejected = item.status === "REJECTED";
          const isPaymentPending = item.status === "PAYMENT_PENDING";

          return (
            <TouchableOpacity
              onPress={() => {
                setSelectedEvent(item);
                if (
                  (isPaymentPending || item.status === "PENDING_APPROVAL") &&
                  selectedEstateId
                ) {
                  fetchPaymentInfo(selectedEstateId);
                }
              }}
              className={`flex-row items-center p-4 rounded-3xl mb-4 border ${
                isDarkMode
                  ? "bg-gm-navy border-slate-800"
                  : "bg-slate-50 border-slate-100"
              }`}
            >
              <View className="ml-4 flex-1">
                <Text
                  className={`font-black ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                  numberOfLines={1}
                >
                  {item.venue_name}
                </Text>
                <Text className="text-slate-500 text-xs font-bold">
                  {item.start_date.split("T")[0]}
                </Text>
              </View>
              <View
                className={`px-3 py-1 rounded-full ${
                  isApproved
                    ? isDarkMode
                      ? "bg-emerald-950/40 border border-emerald-900/30"
                      : "bg-emerald-100"
                    : isRejected
                      ? isDarkMode
                        ? "bg-red-950/40 border border-red-900/30"
                        : "bg-red-50"
                      : isDarkMode
                        ? "bg-amber-950/40 border border-amber-900/30"
                        : "bg-amber-50"
                }`}
              >
                <Text
                  className={`text-[10px] font-black uppercase ${badge.color}`}
                >
                  {badge.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Property Scope Filter Selector Modal */}
      <Modal visible={showEstateFilterModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className={`h-[50%] rounded-t-[3rem] p-6 border-t ${
              isDarkMode ? "bg-slate-900 border-gm-gold" : "bg-white"
            }`}
          >
            <View className="flex-row justify-between items-center mb-6 px-2">
              <Text
                className={`font-black text-xl ${
                  isDarkMode ? "text-gm-gold" : "text-slate-900"
                }`}
              >
                Filter by Property Scope
              </Text>
              <TouchableOpacity onPress={() => setShowEstateFilterModal(false)}>
                <Text
                  className={`font-bold ${
                    isDarkMode ? "text-white" : "text-gm-navy"
                  }`}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(user?.estates || []).map((estate) => {
                const isSelected = selectedEstateId === estate.id.toString();
                return (
                  <TouchableOpacity
                    key={estate.id}
                    className="p-5 border-b border-slate-800/20 flex-row items-center justify-between"
                    onPress={() => {
                      setSelectedEstateId(estate.id.toString());
                      setShowEstateFilterModal(false);
                    }}
                  >
                    <Text
                      className={`font-bold text-base ${
                        isSelected
                          ? isDarkMode
                            ? "text-gm-gold"
                            : "text-indigo-600"
                          : isDarkMode
                            ? "text-slate-400"
                            : "text-slate-700"
                      }`}
                    >
                      {estate.name}
                    </Text>
                    {isSelected && (
                      <View
                        className={`w-2 h-2 rounded-full ${
                          isDarkMode ? "bg-gm-gold" : "bg-indigo-600"
                        }`}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detailed Booking Modal */}
      <Modal visible={!!selectedEvent} animationType="slide" transparent>
        {selectedEvent &&
          (() => {
            const badge = getBookingStatusBadge(selectedEvent.status);
            return (
              <View className="flex-1 bg-black/95 justify-center pb-12">
                {/* Top action bar: Close & Delete */}
                <View className="flex-row justify-between p-6 pt-12 items-center">
                  <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                    <ChevronLeft color="white" size={28} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(selectedEvent.id)}
                  >
                    <Trash2 color="#ef4444" size={24} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  className="px-4 py-2"
                  contentContainerStyle={{
                    flexGrow: 1,
                    paddingBottom: 60, 
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  <View
                    ref={flyerRef}
                    collapsable={false}
                    className={`rounded-[3rem] overflow-hidden shadow-2xl border ${
                      isDarkMode
                        ? "bg-gm-navy border-slate-800"
                        : "bg-white border-transparent"
                    }`}
                  >
                    <View className="p-8">
                      <View className="flex-row justify-between items-start mb-6">
                        <View className="flex-1">
                          <Text
                            className={`text-3xl font-black leading-tight ${
                              isDarkMode ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {selectedEvent.venue_name}
                          </Text>
                          <View
                            className={`self-start px-4 py-1.5 rounded-full mt-3 border ${
                              isDarkMode
                                ? "bg-slate-900 border-gm-gold/30"
                                : "bg-indigo-600 border-transparent"
                            }`}
                          >
                            <Text
                              className={`font-black text-[10px] uppercase tracking-widest ${
                                isDarkMode ? "text-gm-gold" : "text-white"
                              }`}
                            >
                              {selectedVenue?.is_paid
                                ? "Paid Venue"
                                : "Free Venue"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="flex-row flex-wrap gap-y-6">
                        <InfoBox
                          icon={
                            <Calendar
                              size={20}
                              color={isDarkMode ? "#D4AF37" : "#6366f1"}
                            />
                          }
                          label="DATE"
                          value={formatEventDate()}
                          isDarkMode={isDarkMode}
                        />
                        <InfoBox
                          icon={
                            <Clock
                              size={20}
                              color={isDarkMode ? "#D4AF37" : "#6366f1"}
                            />
                          }
                          label="TIME"
                          value={formatEventTime()}
                          isDarkMode={isDarkMode}
                        />
                        <InfoBox
                          icon={
                            <MapPin
                              size={20}
                              color={isDarkMode ? "#D4AF37" : "#6366f1"}
                            />
                          }
                          label="VENUE"
                          value={selectedEvent.venue_name}
                          isDarkMode={isDarkMode}
                        />
                        <InfoBox
                          icon={
                            <Users
                              size={20}
                              color={isDarkMode ? "#D4AF37" : "#6366f1"}
                            />
                          }
                          label="MAX CAPACITY"
                          value={
                            selectedVenue?.capacity
                              ? `${selectedVenue.capacity} guests`
                              : "N/A"
                          }
                          isDarkMode={isDarkMode}
                        />

                        {/* Conditional Payment Details */}
                        {selectedVenue?.is_paid && (
                          <>
                            <InfoBox
                              icon={
                                <DollarSign
                                  size={20}
                                  color={isDarkMode ? "#D4AF37" : "#6366f1"}
                                />
                              }
                              label="PAYMENT RATE"
                              value={
                                selectedVenue?.bookingRate
                                  ? `₦${selectedVenue.bookingRate}`
                                  : "N/A"
                              }
                              isDarkMode={isDarkMode}
                            />
                            <InfoBox
                              icon={
                                <CreditCard
                                  size={20}
                                  color={isDarkMode ? "#D4AF37" : "#6366f1"}
                                />
                              }
                              label="RATE UNIT"
                              value={
                                selectedVenue?.bookingRateUnit
                                  ? selectedVenue.bookingRateUnit.replace(
                                      "_",
                                      " ",
                                    )
                                  : "N/A"
                              }
                              isDarkMode={isDarkMode}
                            />
                          </>
                        )}

                        {/* Conditional Transaction Ref */}
                        {selectedEvent.transaction_ref && (
                          <InfoBox
                            icon={
                              <Hash
                                size={20}
                                color={isDarkMode ? "#D4AF37" : "#6366f1"}
                              />
                            }
                            label="TXN REF"
                            value={selectedEvent.transaction_ref}
                            isDarkMode={isDarkMode}
                          />
                        )}
                      </View>

                      {/* Payment Proof Button */}
                      {selectedEvent.payment_url && (
                        <TouchableOpacity
                          onPress={() => setShowPaymentImageModal(true)}
                          className={`mt-6 p-4 rounded-2xl flex-row items-center justify-center gap-2 border ${
                            isDarkMode
                              ? "bg-gm-navy border-gm-gold/40"
                              : "bg-indigo-50 border-indigo-200"
                          }`}
                        >
                          <Eye
                            size={18}
                            color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                          />
                          <Text
                            className={`font-black text-xs uppercase tracking-wider ${
                              isDarkMode ? "text-gm-gold" : "text-indigo-600"
                            }`}
                          >
                            View Payment Receipt
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Approval Status */}
                  <View
                    className={`mt-4 p-4 rounded-2xl border ${
                      isDarkMode
                        ? "border-slate-800 bg-gm-navy"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <Text className="text-slate-400 font-black text-[10px] uppercase mb-1">
                      APPROVAL STATUS
                    </Text>
                    <Text className={`font-black text-base ${badge.color}`}>
                      {badge.label.toUpperCase()}
                    </Text>
                  </View>

                  {selectedEvent.status === "PAYMENT_PENDING" && (
                    <>
                      <View className="p-4 pt-12">
                        {/* Amount Summary Card */}
                        <View
                          className={`${
                            isDarkMode
                              ? "bg-gm-navy border-gm-gold"
                              : "bg-indigo-900 border-indigo-800"
                          } p-6 rounded-3xl border mb-6 flex-row items-center justify-between shadow-md`}
                        >
                          <View>
                            <Text
                              className={`text-[10px] font-oswald-semibold uppercase tracking-widest ${
                                isDarkMode ? "text-gm-gold" : "text-indigo-200"
                              }`}
                            >
                              Total Amount Due
                            </Text>
                            <Text className="text-2xl font-montserrat-bold text-white mt-1">
                              ₦
                              {selectedEvent?.total_amount
                                ? Number(
                                    selectedEvent.total_amount,
                                  ).toLocaleString()
                                : "0.00"}
                            </Text>
                          </View>
                          <View
                            className={`${
                              isDarkMode ? "bg-gm-charcoal" : "bg-indigo-800/60"
                            } p-3 rounded-2xl`}
                          >
                            <CreditCard
                              size={28}
                              color={isDarkMode ? "#D4AF37" : "#FFFFFF"}
                            />
                          </View>
                        </View>

                        {/* API / External Portal Flow */}
                        {config?.payment_type === "api" && (
                          <View
                            className={`${
                              isDarkMode
                                ? "bg-gm-navy border-gm-gold"
                                : "bg-white border-slate-100"
                            } p-8 rounded-[40px] border shadow-sm items-center`}
                          >
                            {isApiReady ? (
                              <>
                                <TouchableOpacity
                                  onPress={() =>
                                    handleOpenURL(
                                      config.details.external_api_url!,
                                    )
                                  }
                                  activeOpacity={0.8}
                                  className={`${
                                    isDarkMode
                                      ? "bg-gm-charcoal border border-gm-gold"
                                      : "bg-gm-navy"
                                  } w-full p-5 rounded-3xl flex-row items-center justify-center gap-3`}
                                >
                                  <ExternalLink
                                    size={22}
                                    color={isDarkMode ? "#D4AF37" : "#FFFFFF"}
                                  />
                                  <Text
                                    className={`${
                                      isDarkMode ? "text-gm-gold" : "text-white"
                                    } font-montserrat-bold text-lg`}
                                  >
                                    External Portal
                                  </Text>
                                </TouchableOpacity>

                                <Text
                                  className={`text-xs mt-4 text-center ${
                                    isDarkMode
                                      ? "text-slate-400"
                                      : "text-slate-500"
                                  }`}
                                >
                                  Please proceed to the external portal to
                                  complete your payment of{" "}
                                  <Text className="font-bold">
                                    ₦
                                    {selectedEvent?.total_amount
                                      ? Number(
                                          selectedEvent.total_amount,
                                        ).toLocaleString()
                                      : "0.00"}
                                  </Text>
                                  , then upload your payment confirmation
                                  details below.
                                </Text>
                              </>
                            ) : (
                              <MissingDetailsMessage
                                type="Portal Link"
                                isDarkMode={isDarkMode}
                              />
                            )}
                          </View>
                        )}

                        {/* Manual / Bank Transfer Flow */}
                        {config?.payment_type === "manual" && (
                          <View
                            className={`${
                              isDarkMode
                                ? "bg-gm-navy border-gm-gold"
                                : "bg-white border-slate-100"
                            } p-8 rounded-[40px] border shadow-sm`}
                          >
                            {isManualReady ? (
                              <>
                                <View className="items-center mb-6">
                                  <View
                                    className={`${
                                      isDarkMode
                                        ? "bg-gm-charcoal"
                                        : "bg-emerald-50"
                                    } p-5 rounded-3xl mb-3`}
                                  >
                                    <Landmark
                                      size={32}
                                      color={isDarkMode ? "#D4AF37" : "#10b981"}
                                    />
                                  </View>
                                  <Text
                                    className={`text-xl font-montserrat-bold ${
                                      isDarkMode
                                        ? "text-gm-gold"
                                        : "text-gm-navy"
                                    } text-center`}
                                  >
                                    Bank Transfer Details
                                  </Text>
                                  <Text
                                    className={`text-xs mt-2 text-center ${
                                      isDarkMode
                                        ? "text-slate-400"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    Transfer{" "}
                                    <Text className="font-bold text-emerald-500">
                                      ₦
                                      {selectedEvent?.total_amount
                                        ? Number(
                                            selectedEvent.total_amount,
                                          ).toLocaleString()
                                        : "0.00"}
                                    </Text>{" "}
                                    using the bank details below, then upload
                                    your payment proof.
                                  </Text>
                                </View>

                                <View
                                  className={`${
                                    isDarkMode
                                      ? "bg-gm-charcoal border border-gm-gold"
                                      : "bg-slate-50 border-slate-100"
                                  } p-6 rounded-3xl border`}
                                >
                                  <DetailRow
                                    label="Bank Name"
                                    value={config.details.bank_name}
                                  />
                                  <DetailRow
                                    label="Account Number"
                                    value={config.details.bank_account_number}
                                    bold
                                  />
                                  <DetailRow
                                    label="Account Name"
                                    value={config.details.bank_account_name}
                                    italic
                                  />
                                  <DetailRow
                                    label="Amount Due"
                                    value={`₦${selectedEvent?.total_amount ? Number(selectedEvent.total_amount).toLocaleString() : "0.00"}`}
                                    bold
                                  />
                                </View>
                              </>
                            ) : (
                              <MissingDetailsMessage
                                type="Account Details"
                                isDarkMode={isDarkMode}
                              />
                            )}
                          </View>
                        )}
                      </View>

                      <View className="mt-4 gap-y-3 px-2">
                        {/* 1. Payment Method Selector */}
                        <View
                          className={`p-2 rounded-3xl ${
                            isDarkMode
                              ? "bg-gm-navy border border-slate-800"
                              : "border border-slate-100 bg-slate-50"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-oswald-semibold uppercase mb-2 ${
                              isDarkMode ? "text-gm-gold" : "text-slate-400"
                            }`}
                          >
                            Select Payment Method
                          </Text>
                          <View className="flex-row gap-3">
                            {[
                              { id: "bank_transfer", label: "Bank Transfer" },
                              { id: "card", label: "Card Payment" },
                            ].map((item) => {
                              const isSelected =
                                paymentForm.payment_type === item.id;
                              return (
                                <TouchableOpacity
                                  key={item.id}
                                  onPress={() =>
                                    setPaymentForm({
                                      ...paymentForm,
                                      payment_type: item.id,
                                    })
                                  }
                                  activeOpacity={0.7}
                                  className={`flex-1 flex-row items-center p-3 rounded-2xl border ${
                                    isSelected
                                      ? isDarkMode
                                        ? "bg-gm-charcoal border-gm-gold"
                                        : "bg-indigo-50 border-indigo-600"
                                      : isDarkMode
                                        ? "bg-gm-navy border-slate-800"
                                        : "bg-white border-slate-100"
                                  }`}
                                >
                                  <View
                                    className={`w-4 h-4 rounded-full border items-center justify-center mr-2.5 ${
                                      isSelected
                                        ? isDarkMode
                                          ? "border-gm-gold"
                                          : "border-indigo-600"
                                        : "border-slate-400"
                                    }`}
                                  >
                                    {isSelected && (
                                      <View
                                        className={`w-2 h-2 rounded-full ${
                                          isDarkMode
                                            ? "bg-gm-gold"
                                            : "bg-indigo-600"
                                        }`}
                                      />
                                    )}
                                  </View>
                                  <Text
                                    className={`font-bold text-xs ${
                                      isSelected
                                        ? isDarkMode
                                          ? "text-gm-gold"
                                          : "text-indigo-900"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {item.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>

                        {/* 2. Transaction Reference Input */}
                        <View
                          className={`p-4 rounded-3xl ${
                            isDarkMode
                              ? "bg-gm-navy border border-slate-800"
                              : "border border-slate-100 bg-slate-50"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-oswald-semibold uppercase mb-1.5 ${
                              isDarkMode ? "text-gm-gold" : "text-slate-400"
                            }`}
                          >
                            Transaction Reference
                          </Text>
                          <TextInput
                            value={paymentForm.transaction_ref}
                            onChangeText={(text) =>
                              setPaymentForm((prev) => ({
                                ...prev,
                                transaction_ref: text,
                              }))
                            }
                            placeholder="e.g. TXN-982384729"
                            placeholderTextColor={
                              isDarkMode ? "#64748b" : "#94a3b8"
                            }
                            className={`p-3.5 rounded-2xl border font-bold text-sm ${
                              isDarkMode
                                ? "bg-slate-900 border-slate-800 text-white"
                                : "bg-white border-slate-200 text-slate-900"
                            }`}
                          />
                        </View>

                        {/* 3. Upload Receipt Section */}
                        <TouchableOpacity
                          onPress={pickImage}
                          disabled={uploadingImage}
                          className={`p-4 rounded-3xl flex-row items-center justify-between border ${
                            paymentForm.receipt_url
                              ? isDarkMode
                                ? "bg-emerald-950/30 border-emerald-800"
                                : "bg-emerald-50 border-emerald-200"
                              : isDarkMode
                                ? "bg-gm-navy border-slate-800"
                                : "bg-slate-50 border-slate-100"
                          }`}
                        >
                          <View className="flex-row items-center gap-3">
                            <Upload
                              size={20}
                              color={
                                paymentForm.receipt_url
                                  ? "#10b981"
                                  : isDarkMode
                                    ? "#D4AF37"
                                    : "#6366f1"
                              }
                            />
                            <View>
                              <Text
                                className={`font-bold text-xs ${
                                  paymentForm.receipt_url
                                    ? "text-emerald-500"
                                    : isDarkMode
                                      ? "text-white"
                                      : "text-slate-900"
                                }`}
                              >
                                {uploadingImage
                                  ? "Uploading image..."
                                  : paymentForm.receipt_url
                                    ? "Receipt Attached"
                                    : "Upload Payment Receipt"}
                              </Text>
                              <Text className="text-[10px] text-slate-400">
                                {paymentForm.receipt_url
                                  ? "Tap to replace receipt"
                                  : "PNG, JPG or PDF proof of transfer"}
                              </Text>
                            </View>
                          </View>
                          {uploadingImage && (
                            <ActivityIndicator size="small" color="#6366f1" />
                          )}
                        </TouchableOpacity>

                        {/* 4. Submit Payment Button */}
                        <TouchableOpacity
                          onPress={() => handleSubmitPayment(selectedEvent.id)}
                          disabled={submittingPayment || uploadingImage}
                          className={`py-4 rounded-2xl flex-row justify-center items-center gap-2 ${
                            submittingPayment || uploadingImage
                              ? "bg-indigo-400"
                              : "bg-indigo-600 active:opacity-80"
                          }`}
                        >
                          {submittingPayment ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <>
                              <CreditCard size={18} color="white" />
                              <Text className="text-white font-bold text-xs uppercase tracking-wider">
                                Submit Payment Proof (₦
                                {selectedEvent?.total_amount
                                  ? Number(
                                      selectedEvent.total_amount,
                                    ).toLocaleString()
                                  : "0.00"}
                                )
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
            );
          })()}
      </Modal>
    </View>
  );
}

interface InfoBoxProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | undefined | null;
  isDarkMode?: boolean;
}

function InfoBox({ icon, label, value, isDarkMode }: InfoBoxProps) {
  return (
    <View className="w-1/2 flex-row items-start mb-4">
      <View
        className={`p-3 rounded-2xl ${
          isDarkMode ? "bg-slate-900" : "bg-indigo-50"
        }`}
      >
        {icon}
      </View>
      <View className="ml-3 flex-1">
        <Text
          className={`font-black text-[9px] uppercase tracking-tighter ${
            isDarkMode ? "text-gm-gold" : "text-slate-400"
          }`}
        >
          {label}
        </Text>
        <Text
          className={`font-bold text-xs leading-4 ${
            isDarkMode ? "text-white" : "text-slate-800"
          }`}
        >
          {value || "N/A"}
        </Text>
      </View>
    </View>
  );
}
