import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
// Assuming you have imported icons from a library like 'lucide-react-native'
import { Calendar, Clock, Search, Send, MapPin } from 'lucide-react-native';

// Mock data for Apartment selector
const mockApartments = [
    'Unit 101', 
    'Unit 205', 
    'Unit 301 (Self)', 
    'Unit 404'
];

// --- 1. Invite Guest View Component ---
const InviteGuestForm = () => {
    const [apartmentList , setApartmentList ] = useState<string []>(mockApartments)
    const [guestType, setGuestType] = useState('one_time');
    const [selectedApartment, setSelectedApartment] = useState('');
    const [guestName, setGuestName] = useState('');
    
    // Mock Date and Time states
    const mockDate = '11/12/2025';
    const mockTime = '04:54 PM';

    const handleGenerateCode = () => {
        // Validation and API call logic goes here
        console.log('Generating code for:', {
            guestType,
            selectedApartment,
            guestName,
            arrivalDate: mockDate,
            fromTime: mockTime,
            toTime: mockTime,
        });
        alert(`Access Code Generated for ${guestName}!`);
    };

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
            {/* Guest Type Selector (Radio Buttons) */}
            <View className="flex-row space-x-4 mb-6">
                <TouchableOpacity
                    onPress={() => setGuestType('one_time')}
                    className={`flex-row items-center p-2 rounded-full transition-colors ${
                        guestType === 'one_time' ? 'bg-indigo-100' : 'bg-transparent'
                    }`}
                >
                    <View className={`w-4 h-4 rounded-full border-2 mr-2 ${
                        guestType === 'one_time' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'
                    }`} />
                    <Text className={`font-semibold ${guestType === 'one_time' ? 'text-indigo-800' : 'text-gray-600'}`}>
                        One Time Guest
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    onPress={() => setGuestType('multi_entry')}
                    className={`flex-row items-center p-2 rounded-full transition-colors ${
                        guestType === 'multi_entry' ? 'bg-indigo-100' : 'bg-transparent'
                    }`}
                >
                    <View className={`w-4 h-4 rounded-full border-2 mr-2 ${
                        guestType === 'multi_entry' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'
                    }`} />
                    <Text className={`font-semibold ${guestType === 'multi_entry' ? 'text-indigo-800' : 'text-gray-600'}`}>
                        Multi-Entry Guest
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View className="space-y-4">
                {/* Apartment Selector (Mocked as a simple view) */}
                <View>
                    <Text className="text-gray-600 font-medium mb-1">Apartment:</Text>
                    <TouchableOpacity 
                        className="flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-300"
                        onPress={() => alert('Apartment selection modal triggered')}
                    >
                        <Text className={selectedApartment ? 'text-gray-900' : 'text-gray-400'}>
                            {selectedApartment || 'Select...'}
                        </Text>
                        <Text className="text-gray-400 text-lg">›</Text>
                    </TouchableOpacity>
                </View>

                {/* Guest Name */}
                <View>
                    <Text className="text-gray-600 font-medium mb-1">Guest Name:</Text>
                    <TextInput
                        className="bg-white p-4 rounded-lg border border-gray-300 text-gray-900"
                        placeholder="Enter guest name"
                        value={guestName}
                        onChangeText={setGuestName}
                    />
                </View>

                {/* Arrival Date */}
                <View>
                    <Text className="text-gray-600 font-medium mb-1">Arrival Date:</Text>
                    <View className="flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-300">
                        <View className="flex-row items-center">
                            <Calendar size={20} color="#4B5563" className="mr-2" />
                            <Text className="text-gray-900 font-medium">{mockDate}</Text>
                        </View>
                        <Text className="text-gray-500 text-sm">WAT</Text>
                    </View>
                </View>

                {/* Time Range */}
                <View className="flex-row justify-between space-x-4">
                    <View className="flex-1">
                        <Text className="text-gray-600 font-medium mb-1">From:</Text>
                        <View className="flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-300">
                            <View className="flex-row items-center">
                                <Clock size={20} color="#4B5563" className="mr-2" />
                                <Text className="text-gray-900 font-medium">{mockTime}</Text>
                            </View>
                            <Text className="text-gray-500 text-sm">WAT</Text>
                        </View>
                    </View>
                    <View className="flex-1">
                        <Text className="text-gray-600 font-medium mb-1">To:</Text>
                        <View className="flex-row justify-between items-center bg-white p-4 rounded-lg border border-gray-300">
                            <View className="flex-row items-center">
                                <Clock size={20} color="#4B5563" className="mr-2" />
                                <Text className="text-gray-900 font-medium">{mockTime}</Text>
                            </View>
                            <Text className="text-gray-500 text-sm">WAT</Text>
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    onPress={handleGenerateCode}
                    className="mt-6 bg-indigo-600 py-4 rounded-xl shadow-md shadow-indigo-400/50"
                >
                    <Text className="text-white text-lg font-bold text-center">
                        Generate Access Code
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};


// --- 2. Track Guest View Component ---
const TrackGuestView = () => {
    return (
        <View className="flex-1 items-center justify-center p-6">
            {/* Search Bar (Mocked) */}
            <View className="absolute top-0 right-0 p-4">
                <TouchableOpacity className="bg-white p-3 rounded-full border border-gray-200 shadow-sm">
                    <Search size={22} color="#4B5563" />
                </TouchableOpacity>
            </View>

            {/* Empty State Content */}
            <View className="items-center mt-[-100]">
                {/* Icon Placeholder */}
                <View className="w-20 h-20 bg-gray-100 rounded-2xl items-center justify-center mb-4 border border-gray-200">
                    <MapPin size={36} color="#4B5563" />
                </View>
                
                <Text className="text-lg font-semibold text-gray-700 mb-6">
                    Nothing to show here
                </Text>

                <TouchableOpacity
                    onPress={() => { /* Logic to switch back to Invite View */ }}
                    className="bg-indigo-600 py-3 px-6 rounded-xl shadow-md"
                >
                    <Text className="text-white text-base font-bold text-center">
                        Invite a guest
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};


// --- Main Component ---
export default function GuestInvitesComponent() {
    // State to toggle between 'Invite Guest' and 'Track Guest'
    const [currentView, setCurrentView] = useState('invite'); // 'invite' or 'track'

    // Mock data for the tab bar and current view state
    const tabData = [
        { key: 'invite', label: 'Invite Guest' },
        { key: 'track', label: 'Track Guest' },
    ];

    return (
        <View className="flex-1 bg-gray-50 p-4">
            {/* --- Custom Tab Bar (Invite Guest / Track Guest) --- */}
            <View className="flex-row mb-6 justify-center">
                {tabData.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        onPress={() => setCurrentView(tab.key)}
                        className={`py-2 px-6 rounded-lg ${
                            currentView === tab.key 
                                ? 'border-b-4 border-indigo-600' 
                                : 'border-b-4 border-transparent'
                        }`}
                    >
                        <Text className={`text-lg font-bold ${
                            currentView === tab.key ? 'text-indigo-800' : 'text-gray-500'
                        }`}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            

            {/* --- Content Area --- */}
            {currentView === 'invite' ? (
                <InviteGuestForm />
            ) : (
                <TrackGuestView />
            )}
            
            {/* --- Floating Action Button (Moved the FAB from TrackGuestView here for consistency) --- */}
             {currentView === 'track' && (
                <TouchableOpacity
                    onPress={() => setCurrentView('invite')}
                    className="absolute bottom-6 right-6 bg-indigo-600 w-14 h-14 rounded-full items-center justify-center shadow-2xl shadow-indigo-500/50 z-10"
                >
                    <Send size={24} color="white" />
                </TouchableOpacity>
             )}
        </View>
    );
}