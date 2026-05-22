import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, ActivityIndicator, Modal } from 'react-native';
import { Phone, ShieldAlert, LifeBuoy, MapPin, ChevronDown } from 'lucide-react-native';
import { useUser } from './UserContext'; // Added theme and profile hook
import { getEmergencyContacts } from './services/api';
import { EmergencyContact } from './services/interfaces';

const EmergencyContactsPage = () => {
  const { user, isDarkMode } = useUser();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  // Estate Context States
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [estatePickerVisible, setEstatePickerVisible] = useState(false);

  // Handle baseline initial setup targeting index 0
  useEffect(() => {
    if (user?.estate_ids && user.estate_ids.length > 0) {
      setSelectedEstateId(user.estate_ids[0]);
    }
  }, [user?.estate_ids]);

  const activeEstateName = useMemo(() => {
    if (!user?.estates || !selectedEstateId) return "";
    return user.estates.find((e) => e.id === selectedEstateId)?.name || "";
  }, [selectedEstateId, user?.estates]);

  const fetchContacts = useCallback(async (estateId: string) => {
    setLoading(true);
    try {
      const res = await getEmergencyContacts(estateId); 
      if (res.success) {
        setContacts(res.contacts || []);
      } else {
        setContacts([]);
      }
    } catch (e) {
      console.error("Emergency line pulling execution failures:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever selected context switches
  useEffect(() => {
    if (selectedEstateId) {
      fetchContacts(selectedEstateId);
    }
  }, [selectedEstateId, fetchContacts]);

  const makeCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  if (loading && contacts.length === 0) return (
    <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}>
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  );

  return (
    <View className={`flex-1 p-6 ${isDarkMode ? "bg-slate-950" : "bg-slate-50"}`}>
      
      {user?.estate_ids && user.estate_ids.length > 1 && (
        <TouchableOpacity
          onPress={() => setEstatePickerVisible(true)}
          className={`mb-6 flex-row items-center justify-between p-4 rounded-2xl border ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
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
              Contacts for: {activeEstateName || "Select Property"}
            </Text>
          </View>
          <ChevronDown size={16} color="#94a3b8" />
        </TouchableOpacity>
      )}

      <View className="mb-6">
        <Text className={`font-bold text-base ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Verified estate contact lines
        </Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={() => selectedEstateId && fetchContacts(selectedEstateId)}
        renderItem={({ item }) => {
          const isUrgent = item.name.toLowerCase().includes('security') || item.name.toLowerCase().includes('police');
          return (
            <TouchableOpacity 
              onPress={() => makeCall(item.phone)}
              activeOpacity={0.8}
              className={`p-5 rounded-[35px] mb-4 flex-row items-center border shadow-sm ${
                isDarkMode ? "bg-slate-900 border-slate-800/60" : "bg-white border-slate-100"
              }`}
            >
              <View className={`p-4 rounded-2xl mr-4 ${isUrgent ? 'bg-rose-100' : 'bg-indigo-100'}`}>
                <ShieldAlert size={24} color={isUrgent ? "#e11d48" : "#4f46e5"} />
              </View>
              
              <View className="flex-1">
                <Text className={`text-lg font-black ${isDarkMode ? "text-white" : "text-slate-800"}`}>{item.name}</Text>
                <Text className="text-slate-400 font-bold tracking-widest">{item.phone}</Text>
              </View>

              <View className="bg-green-500 w-10 h-10 rounded-full items-center justify-center">
                <Phone size={18} color="white" />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="items-center mt-20 opacity-40">
            <LifeBuoy size={80} color="#64748b" />
            <Text className={`font-black mt-6 text-center text-lg ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              No contacts found
            </Text>
          </View>
        }
      />

      {/* Slide-Up Context Picker Sheet */}
      <Modal visible={estatePickerVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-center px-4 bg-black/50">
          <View className={`${isDarkMode ? "bg-slate-900" : "bg-white"} p-6 max-h-[60%]`}>
            <Text className={`text-xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Select Active Estate
            </Text>
            <FlatList
              data={user?.estates || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedEstateId(item.id);
                    setEstatePickerVisible(false);
                  }}
                  className={`p-4 rounded-2xl mb-3 border flex-row items-center ${
                    selectedEstateId === item.id
                      ? "border-indigo-500 bg-indigo-50/40"
                      : isDarkMode ? "border-slate-800 bg-slate-800/40" : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <MapPin size={20} color={selectedEstateId === item.id ? "#4f46e5" : "#94a3b8"} />
                  <View className="ml-3 flex-1">
                    <Text className={`font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                      {item.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            {selectedEstateId && (
              <TouchableOpacity
                onPress={() => setEstatePickerVisible(false)}
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

export default EmergencyContactsPage;