import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
// Assuming you have installed 'lucide-react-native' or similar icon library
import { FileText, Zap, DollarSign, Clock, ChevronRight } from 'lucide-react-native';

// --- Reusable Navigation Item Component ---
interface InvoiceItemProps {
    title: string;
    icon: React.ElementType;
    color: string;
    onPress: () => void;
}

const InvoiceListItem: React.FC<InvoiceItemProps> = ({ title, icon: Icon, color, onPress }) => (
    <TouchableOpacity 
        onPress={onPress}
        className="flex-row items-center justify-between p-4 bg-white border-b border-gray-100 my-2"
    >
        <View className="flex-row items-center">
            {/* Icon and Title */}
            <Icon size={24} color={color} className="mr-4" />
            <Text className="text-base font-medium text-gray-800">{title}</Text>
        </View>
        
        {/* Navigation Arrow */}
        <ChevronRight size={20} color="#9CA3AF" />
    </TouchableOpacity>
);

// --- Main Component ---
export default function InvoicesScreen() {
    // Handler functions for navigation (replace console.log with actual navigation calls)
    const handleOutstandingInvoices = () => console.log('Navigate to Outstanding Invoices');
    const handleUtilityPayments = () => console.log('Navigate to Utility Payments');
    const handleOtherPayments = () => console.log('Navigate to Other Payments');
    const handlePaymentHistory = () => console.log('Navigate to Payment History');

    return (
        <View className="flex-1 bg-gray-50">
            <ScrollView className="flex-1 mt-12">
                {/* --- Navigation List Items --- */}
                
                {/* 1. Outstanding Invoices */}
                <InvoiceListItem
                    title="Outstanding Invoices"
                    icon={FileText} // Lucide icon representing a document/invoice
                    color="#10B981" // Green color
                    onPress={handleOutstandingInvoices}
                />

                {/* 2. Utility Payments */}
                <InvoiceListItem
                    title="Utility Payments"
                    icon={Zap} // Lucide icon representing electricity/utility
                    color="#3B82F6" // Blue color
                    onPress={handleUtilityPayments}
                />
                
                {/* 3. Other Payments */}
                <InvoiceListItem
                    title="Other Payments"
                    icon={DollarSign} // Lucide icon representing general payments
                    color="#F59E0B" // Amber/Orange color
                    onPress={handleOtherPayments}
                />
                
                {/* 4. Payment History */}
                <InvoiceListItem
                    title="Payment History"
                    icon={Clock} // Lucide icon representing history/time
                    color="#4B5563" // Gray color
                    onPress={handlePaymentHistory}
                />

                {/* Additional content or space */}
                <View className="h-20" /> 
            </ScrollView>

            {/* Note: The bottom navigation bar (Feed, Guests, Events, Invoices) is not 
                included as per the prompt's instruction to exclude tabs. */}
        </View>
    );
}

// You can run this component in your React Native environment 
// (assuming Tailwind CSS and lucide-react-native are set up).