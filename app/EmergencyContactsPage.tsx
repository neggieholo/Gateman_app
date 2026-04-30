import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { Phone, ShieldAlert, LifeBuoy } from 'lucide-react-native';
import { getEmergencyContacts } from './services/api';
import { EmergencyContact } from './services/interfaces';

const EmergencyContactsPage = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await getEmergencyContacts();
      if (res.success) setContacts(res.contacts);
    } finally {
      setLoading(false);
    }
  };

  const makeCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  if (loading) return (
    <View className="flex-1 justify-center items-center bg-slate-50">
      <ActivityIndicator size="large" color="#4f46e5" />
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50 p-6">
      <View className="mb-8">
        <Text className="text-slate-500 font-bold text-base">Verified estate contact lines</Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            onPress={() => makeCall(item.phone)}
            activeOpacity={0.8}
            className="bg-white p-5 rounded-[35px] mb-4 flex-row items-center border border-slate-100 shadow-sm"
          >
            {/* Dynamic Icon Color based on Name */}
            <View className={`p-4 rounded-2xl mr-4 ${item.name.toLowerCase().includes('security') || item.name.toLowerCase().includes('police') ? 'bg-rose-100' : 'bg-indigo-100'}`}>
              <ShieldAlert size={24} color={item.name.toLowerCase().includes('security') ? "#e11d48" : "#4f46e5"} />
            </View>
            
            <View className="flex-1">
              <Text className="text-lg font-black text-slate-800">{item.name}</Text>
              <Text className="text-slate-400 font-bold tracking-widest">{item.phone}</Text>
            </View>

            <View className="bg-green-500 w-10 h-10 rounded-full items-center justify-center">
              <Phone size={18} color="white" />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center mt-20 opacity-40">
            <LifeBuoy size={80} color="#64748b" />
            <Text className="text-slate-600 font-black mt-6 text-center text-lg">
              No contacts found
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default EmergencyContactsPage;