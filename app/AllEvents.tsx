import * as Sharing from "expo-sharing";
import {
  Calendar,
  ChevronLeft,
  Clock,
  MapPin,
  Search,
  Share2,
  Ticket,
  Trash2,
  SlidersHorizontal,
} from "lucide-react-native";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { useUser } from "@/app/UserContext"; 
import { deleteEvent, getOrganizerEvents } from "./services/api";
import { EstateEvent } from "./services/interfaces";

export default function AllEventsScreen() {
  const { user, isDarkMode } = useUser(); 
  const [events, setEvents] = useState<EstateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null); 
  const [showEstateFilterModal, setShowEstateFilterModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EstateEvent | null>(null);
  const flyerRef = useRef<View>(null);

  const fetchEvents = async () => {
    try {
      const data = await getOrganizerEvents();
      setEvents(data);
    } catch (err) {
      Alert.alert("Error", "Could not load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const activeEstateFilterName = useMemo(() => {
    if (!selectedEstateId) return "All Estates";
    const found = user?.estates?.find((e) => e.id.toString() === selectedEstateId.toString());
    return found ? found.name : "All Estates";
  }, [selectedEstateId, user?.estates]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch = e.title.toLowerCase().includes(search.toLowerCase());
      const matchesEstate = selectedEstateId 
        ? e.estate_id?.toString() === selectedEstateId.toString()
        : true;
      return matchesSearch && matchesEstate;
    });
  }, [events, search, selectedEstateId]);

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

  const handleShare = async () => {
    if (!flyerRef.current) return;

    try {
      setIsSharing(true);
      const imageUri = await captureRef(flyerRef, {
        format: "png",
        quality: 0.9,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(imageUri, {
          dialogTitle: `Share Pass for ${selectedEvent?.title}`,
          mimeType: "image/png",
          UTI: "public.png",
        });
      } else {
        await Share.share({ title: selectedEvent?.title, url: imageUri });
      }
    } catch (err) {
      Alert.alert("Sharing Failed", "Could not generate the pass image.");
      console.error(err);
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) return <ActivityIndicator className="flex-1" color={isDarkMode ? "#D4AF37" : "#0A1F44"} />;

  return (
    <View className={`flex-1 p-6 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
      
      {/* Search & Filter Bar Group */}
      <View className="flex-row items-center gap-2 mb-4">
        <View className={`flex-1 flex-row items-center rounded-2xl px-4 py-2 border ${
          isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-100 border-slate-200"
        }`}>
          <Search size={20} color={isDarkMode ? "#475569" : "#94a3b8"} />
          <TextInput
            placeholder="Search your events..."
            placeholderTextColor={isDarkMode ? "#475569" : "#cbd5e1"}
            className={`flex-1 ml-3 font-bold ${isDarkMode ? "text-white" : "text-slate-700"}`}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        {/* Only show the filter trigger button if user has multiple estates */}
        {user?.estate_ids && user.estate_ids.length > 1 && (
          <TouchableOpacity 
            onPress={() => setShowEstateFilterModal(true)}
            className={`p-3.5 rounded-2xl border ${
              selectedEstateId 
                ? isDarkMode ? "bg-gm-navy border-gm-gold" : "bg-indigo-50 border-indigo-200" 
                : isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-100 border-slate-200"
            }`}
          >
            <SlidersHorizontal size={18} color={selectedEstateId ? '#D4AF37' : '#64748b'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Mini Active Filter Indicator Pill */}
      {selectedEstateId && (
        <View className={`flex-row items-center self-start border px-3 py-1.5 rounded-full mb-4 ${
          isDarkMode ? "bg-gm-navy/50 border-gm-gold/40" : "bg-indigo-50/60 border-indigo-100"
        }`}>
          <MapPin size={12} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
          <Text className={`text-[11px] font-oswald-semibold ml-1 mr-2 uppercase tracking-wide ${isDarkMode ? "text-gm-gold" : "text-indigo-950"}`}>
            {activeEstateFilterName}
          </Text>
          <TouchableOpacity onPress={() => setSelectedEstateId(null)}>
            <Text className={`font-bold text-xs px-1 ${isDarkMode ? "text-red-400" : "text-indigo-400"}`}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View className="items-center mt-12">
            <Text className="text-slate-400 font-medium text-sm">No events found matching criteria</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedEvent(item)}
            className={`flex-row items-center p-4 rounded-3xl mb-4 border ${
              isDarkMode ? "bg-gm-navy border-slate-800" : "bg-slate-50 border-slate-100"
            }`}
          >
            {item.banner_url && (
              <Image
                source={{ uri: item.banner_url }}
                className={`w-16 h-16 rounded-2xl ${isDarkMode ? "bg-slate-900" : "bg-slate-200"}`}
              />
            )}
            <View className="ml-4 flex-1">
              <Text className={`font-black ${isDarkMode ? "text-white" : "text-slate-900"}`} numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-slate-500 text-xs font-bold">
                {item.start_date.split("T")[0]}
              </Text>
            </View>
            <View className={`px-3 py-1 rounded-full ${
              item.is_approved 
                ? isDarkMode ? "bg-emerald-950/40 border border-emerald-900/30" : "bg-emerald-100"
                : item.is_rejected
                  ? isDarkMode ? "bg-red-950/40 border border-red-900/30" : "bg-red-50"
                  : isDarkMode ? "bg-amber-950/40 border border-amber-900/30" : "bg-amber-50"
            }`}>
              <Text className={`text-[10px] font-black uppercase ${
                item.is_approved 
                  ? "text-emerald-500" 
                  : item.is_rejected ? "text-red-500" : "text-amber-500"
              }`}>
                {item.is_approved ? "Approved" : item.is_rejected ? "Rejected" : "Pending"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Dedicated Estate Scope Filter Selector Modal */}
      <Modal visible={showEstateFilterModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`h-[50%] rounded-t-[3rem] p-6 border-t ${isDarkMode ? "bg-slate-900 border-gm-gold" : "bg-white"}`}>
            <View className="flex-row justify-between items-center mb-6 px-2">
              <Text className={`font-black text-xl ${isDarkMode ? "text-gm-gold" : "text-slate-900"}`}>Filter by Property Scope</Text>
              <TouchableOpacity onPress={() => setShowEstateFilterModal(false)}>
                <Text className={`font-bold ${isDarkMode ? "text-white" : "text-gm-navy"}`}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                className="p-5 border-b border-slate-800/20 flex-row items-center justify-between"
                onPress={() => {
                  setSelectedEstateId(null);
                  setShowEstateFilterModal(false);
                }}
              >
                <Text className={`font-bold text-base ${
                  selectedEstateId === null 
                    ? isDarkMode ? "text-gm-gold" : "text-indigo-600" 
                    : isDarkMode ? "text-slate-400" : "text-slate-700"
                }`}>
                  All Estates (Unified Feed)
                </Text>
                {selectedEstateId === null && (
                  <View className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-gm-gold" : "bg-indigo-600"}`} />
                )}
              </TouchableOpacity>

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
                    <Text className={`font-bold text-base ${
                      isSelected 
                        ? isDarkMode ? "text-gm-gold" : "text-indigo-600" 
                        : isDarkMode ? "text-slate-400" : "text-slate-700"
                    }`}>
                      {estate.name}
                    </Text>
                    {isSelected && (
                      <View className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-gm-gold" : "bg-indigo-600"}`} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Flyout Pass/Flyer Detailed Record View Modal */}
      <Modal visible={!!selectedEvent} animationType="slide" transparent>
        {selectedEvent && (
          <View className="flex-1 bg-black/95">
            <View className="flex-row justify-between p-6 pt-12 items-center">
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <ChevronLeft color="white" size={28} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(selectedEvent.id)}>
                <Trash2 color="#ef4444" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
              <View
                ref={flyerRef}
                collapsable={false}
                className={`rounded-[3rem] overflow-hidden shadow-2xl border ${
                  isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-transparent"
                }`}
              >
                {selectedEvent.banner_url && (
                  <Image
                    source={{ uri: selectedEvent.banner_url }}
                    className="w-full h-80"
                  />
                )}

                <View className="p-8">
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1">
                      <Text className={`text-3xl font-black leading-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {selectedEvent.title}
                      </Text>
                      <View className={`self-start px-4 py-1 rounded-full mt-2 border ${
                        isDarkMode ? "bg-slate-900 border-gm-gold/30" : "bg-indigo-600 border-transparent"
                      }`}>
                        <Text className={`font-black text-[10px] uppercase tracking-widest ${isDarkMode ? "text-gm-gold" : "text-white"}`}>
                          {selectedEvent.is_paid
                            ? `₦${selectedEvent.ticket_price}`
                            : "Free Event"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text className={`font-medium leading-relaxed mb-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {selectedEvent.description}
                  </Text>

                  <View className="flex-row flex-wrap gap-y-6">
                    <InfoBox
                      icon={<Calendar size={20} color={isDarkMode ? "#D4AF37" : "#6366f1"} />}
                      label="DATE"
                      value={formatEventDate()}
                      isDarkMode={isDarkMode}
                    />
                    <InfoBox
                      icon={<Clock size={20} color={isDarkMode ? "#D4AF37" : "#6366f1"} />}
                      label="TIME"
                      value={formatEventTime()}
                      isDarkMode={isDarkMode}
                    />
                    <InfoBox
                      icon={<MapPin size={20} color={isDarkMode ? "#D4AF37" : "#6366f1"} />}
                      label="VENUE"
                      value={selectedEvent.venue_detail}
                      isDarkMode={isDarkMode}
                    />
                    <InfoBox
                      icon={<Ticket size={20} color={isDarkMode ? "#D4AF37" : "#6366f1"} />}
                      label="REF CODE"
                      value={selectedEvent.ref_code}
                      isDarkMode={isDarkMode}
                    />
                  </View>
                </View>
                
                <View className={`p-6 border-t items-center ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                  <Text className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">
                    Register at
                  </Text>
                  <Text className={`font-black text-sm lowercase ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}>
                    www.gatemanhq.com/event/{selectedEvent.ref_code}
                  </Text>
                </View>
              </View>

              {!isSharing && (
                <>
                  <View className={`mt-8 p-3 border-t border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <Text className="text-slate-400 font-black text-[10px] uppercase">
                      STATUS
                    </Text>
                    <Text className={`font-black text-lg ${isDarkMode ? "text-gm-gold" : "text-indigo-600"}`}>
                      {selectedEvent.is_approved ? "APPROVED" : selectedEvent.is_rejected ? "REJECTED" : "PENDING"}
                    </Text>
                  </View>
                  <View className={`mt-1 p-3 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <Text className={`font-bold ${isDarkMode ? "text-slate-200" : "text-indigo-900"}`}>
                      {selectedEvent.registered_guests || 0} /{" "}
                      {selectedEvent.expected_guests} Guests Registered
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleShare}
                    className={`p-6 rounded-3xl flex-row justify-center items-center shadow-xl mt-8 border ${
                      isDarkMode ? "bg-gm-charcoal border-gm-gold" : "bg-slate-900 border-transparent"
                    }`}
                  >
                    <Share2 color="white" size={20} />
                  </TouchableOpacity>
                </>
              )}

              <View className="h-20" />
            </ScrollView>
          </View>
        )}
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
      <View className={`p-3 rounded-2xl ${isDarkMode ? "bg-slate-900" : "bg-indigo-50"}`}>{icon}</View>
      <View className="ml-3 flex-1">
        <Text className={`font-black text-[9px] uppercase tracking-tighter ${isDarkMode ? "text-gm-gold" : "text-slate-400"}`}>
          {label}
        </Text>
        <Text className={`font-bold text-xs leading-4 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
          {value || "N/A"}
        </Text>
      </View>
    </View>
  );
}
