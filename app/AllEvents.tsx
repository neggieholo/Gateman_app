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
  SlidersHorizontal, // For a clean filter icon
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
import { useUser } from "@/app/UserContext"; // Import context directly
import { deleteEvent, getOrganizerEvents } from "./services/api";
import { EstateEvent } from "./services/interfaces";

export default function AllEventsScreen() {
  const { user } = useUser(); // Access connected estates locally
  const [events, setEvents] = useState<EstateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null); // null = "All Estates"
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

  // Dynamically resolve name for active filter UI label
  const activeEstateFilterName = useMemo(() => {
    if (!selectedEstateId) return "All Estates";
    const found = user?.estates?.find((e) => e.id.toString() === selectedEstateId.toString());
    return found ? found.name : "All Estates";
  }, [selectedEstateId, user?.estates]);

  // Combined client-side filtering logic: filter by Search Text AND selected Estate ID
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

  if (loading) return <ActivityIndicator className="flex-1" color="#6366f1" />;

  return (
    <View className="flex-1 bg-white p-6">
      
      {/* Search & Filter Bar Group */}
      <View className="flex-row items-center gap-2 mb-4">
        <View className="flex-1 flex-row items-center bg-slate-100 rounded-2xl px-4 py-2 border border-slate-200">
          <Search size={20} color="#94a3b8" />
          <TextInput
            placeholder="Search your events..."
            placeholderTextColor="#cbd5e1"
            className="flex-1 ml-3 font-bold text-slate-700"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        {/* Only show the filter trigger button if user has multiple estates */}
        {user?.estate_ids && user.estate_ids.length > 1 && (
          <TouchableOpacity 
            onPress={() => setShowEstateFilterModal(true)}
            className={`p-3.5 rounded-2xl border ${selectedEstateId ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-100 border-slate-200'}`}
          >
            <SlidersHorizontal size={18} color={selectedEstateId ? '#4f46e5' : '#64748b'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Mini Active Filter Indicator Pill */}
      {selectedEstateId && (
        <View className="flex-row items-center self-start bg-indigo-50/60 border border-indigo-100 px-3 py-1.5 rounded-full mb-4">
          <MapPin size={12} color="#4f46e5" />
          <Text className="text-[11px] font-black text-indigo-950 ml-1 mr-2 uppercase tracking-wide">
            {activeEstateFilterName}
          </Text>
          <TouchableOpacity onPress={() => setSelectedEstateId(null)}>
            <Text className="text-indigo-400 font-bold text-xs px-1">✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View className="items-center mt-12">
            <Text className="text-slate-400 font-bold text-sm">No events found matching criteria</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedEvent(item)}
            className="flex-row items-center bg-slate-50 p-4 rounded-3xl mb-4 border border-slate-100"
          >
            {item.banner_url && (
              <Image
                source={{ uri: item.banner_url }}
                className="w-16 h-16 rounded-2xl bg-slate-200"
              />
            )}
            <View className="ml-4 flex-1">
              <Text className="font-black text-slate-900" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-slate-500 text-xs font-bold">
                {item.start_date.split("T")[0]}
              </Text>
            </View>
            <View
              className={`px-3 py-1 rounded-full ${item.is_approved ? "bg-emerald-100" : "bg-amber-50"}`}
            >
              <Text
                className={`text-[10px] font-black uppercase ${item.is_approved ? "text-emerald-700" : item.is_rejected ? "text-red-500" :"text-amber-500"}`}
              >
                {item.is_approved ? "Approved" : item.is_rejected ? "Rejected" : "Pending"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Dedicated Estate Scope Filter Selector Modal */}
      <Modal visible={showEstateFilterModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white h-[50%] rounded-t-[3rem] p-6">
            <View className="flex-row justify-between items-center mb-6 px-2">
              <Text className="font-black text-xl text-slate-900">Filter by Property Scope</Text>
              <TouchableOpacity onPress={() => setShowEstateFilterModal(false)}>
                <Text className="text-indigo-600 font-bold">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Option 1: View Everything across all estates */}
              <TouchableOpacity
                className="p-5 border-b border-slate-50 flex-row items-center justify-between"
                onPress={() => {
                  setSelectedEstateId(null);
                  setShowEstateFilterModal(false);
                }}
              >
                <Text className={`font-bold text-base ${selectedEstateId === null ? "text-indigo-600" : "text-slate-700"}`}>
                  All Estates (Unified Feed)
                </Text>
                {selectedEstateId === null && <View className="w-2 h-2 rounded-full bg-indigo-600" />}
              </TouchableOpacity>

              {/* Connected Estates List mapped from state content context */}
              {(user?.estates || []).map((estate) => (
                <TouchableOpacity
                  key={estate.id}
                  className="p-5 border-b border-slate-50 flex-row items-center justify-between"
                  onPress={() => {
                    setSelectedEstateId(estate.id.toString());
                    setShowEstateFilterModal(false);
                  }}
                >
                  <Text className={`font-bold text-base ${selectedEstateId === estate.id.toString() ? "text-indigo-600" : "text-slate-700"}`}>
                    {estate.name}
                  </Text>
                  {selectedEstateId === estate.id.toString() && <View className="w-2 h-2 rounded-full bg-indigo-600" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Flyout Pass/Flyer Detailed Record View Modal */}
      <Modal visible={!!selectedEvent} animationType="slide" transparent>
        {selectedEvent && (
          <View className="flex-1 bg-black/90">
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
                className="bg-white rounded-[3rem] overflow-hidden shadow-2xl"
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
                      <Text className="text-3xl font-black text-slate-900 leading-tight">
                        {selectedEvent.title}
                      </Text>
                      <View className="bg-indigo-600 self-start px-4 py-1 rounded-full mt-2">
                        <Text className="text-white font-black text-[10px] uppercase tracking-widest">
                          {selectedEvent.is_paid
                            ? `₦${selectedEvent.ticket_price}`
                            : "Free Event"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text className="text-slate-600 font-medium leading-relaxed mb-6">
                    {selectedEvent.description}
                  </Text>

                  <View className="flex-row flex-wrap gap-y-6">
                    <InfoBox
                      icon={<Calendar size={20} color="#6366f1" />}
                      label="DATE"
                      value={formatEventDate()}
                    />
                    <InfoBox
                      icon={<Clock size={20} color="#6366f1" />}
                      label="TIME"
                      value={formatEventTime()}
                    />
                    <InfoBox
                      icon={<MapPin size={20} color="#6366f1" />}
                      label="VENUE"
                      value={selectedEvent.venue_detail}
                    />
                    <InfoBox
                      icon={<Ticket size={20} color="#6366f1" />}
                      label="REF CODE"
                      value={selectedEvent.ref_code}
                    />
                  </View>
                </View>
                <View className="mt-2 p-6 border-t border-slate-100 items-center">
                  <Text className="text-slate-400 font-black text-[9px] uppercase tracking-widest mb-1">
                    Register at
                  </Text>
                  <Text className="text-indigo-600 font-black text-sm lowercase">
                    www.gatemanhq.com/event/{selectedEvent.ref_code}
                  </Text>
                </View>
              </View>

              {!isSharing && (
                <>
                  <View className="mt-8 p-2 border-t border-b border-slate-100">
                    <Text className="text-slate-400 font-black text-[10px] uppercase">
                      STATUS
                    </Text>
                    <Text className="text-indigo-600 font-black text-lg">
                      {selectedEvent.is_approved ? "APPROVED" : selectedEvent.is_rejected ? "REJECTED" : "PENDING"}
                    </Text>
                  </View>
                  <View className="mt-1 p-2 border-b border-slate-100">
                    <Text className="text-indigo-900 font-bold">
                      {selectedEvent.registered_guests || 0} /{" "}
                      {selectedEvent.expected_guests} Guests Registered
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleShare}
                    className="bg-slate-900 p-6 rounded-3xl flex-row justify-center items-center shadow-xl mt-8"
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
}

function InfoBox({ icon, label, value }: InfoBoxProps) {
  return (
    <View className="w-1/2 flex-row items-start mb-4">
      <View className="bg-indigo-50 p-3 rounded-2xl">{icon}</View>
      <View className="ml-3 flex-1">
        <Text className="text-slate-400 font-black text-[9px] uppercase tracking-tighter">
          {label}
        </Text>
        <Text className="text-slate-800 font-bold text-xs leading-4">
          {value || "N/A"}
        </Text>
      </View>
    </View>
  );
}