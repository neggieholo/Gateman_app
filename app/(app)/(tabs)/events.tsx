import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
// Assuming you have installed 'lucide-react-native'
import { Plus, CalendarDays } from 'lucide-react-native'; 

export default function EventsComponent() {
  const handleCreateEvent = () => {
    console.log("Floating button pressed: Navigate to Create Event screen");
    // Add navigation logic here
  };

  return (
    <View className="flex-1 bg-gray-50">
      
      {/* --- Centered Content: No Events State --- */}
      <View className="flex-1 items-center justify-center p-6">
        {/* Optional: Add a subtle icon for visual appeal */}
        <CalendarDays size={48} color="#9CA3AF" className="mb-4" />
        
        <Text className="text-xl font-bold text-gray-700 mb-2">
          No Upcoming Events
        </Text>
        <Text className="text-base text-gray-500 text-center max-w-xs">
          Tap the &apos;+&apos; button to schedule a new community event.
        </Text>
      </View>

      {/* --- Floating Action Button (FAB) --- */}
      <TouchableOpacity 
        onPress={handleCreateEvent}
        // Using indigo for the primary color
        className="absolute bottom-6 right-6 bg-indigo-600 w-14 h-14 rounded-full items-center justify-center shadow-xl shadow-indigo-500/50 z-10"
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}