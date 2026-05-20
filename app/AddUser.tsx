// import React, { useContext, useEffect, useState } from "react";
// import {
//   Alert,
//   FlatList,
//   Image,
//   Modal,
//   ScrollView,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
//   ActivityIndicator
// } from "react-native";
// import { useNavigation } from "@react-navigation/native";
// import * as ImagePicker from "expo-image-picker";
// import { ChevronDown, Check, UserPlus, MapPin } from "lucide-react-native";
// import { createSubUser, fetchRegistrarEstates, fetchEstateLocations } from "./services/api"; 
// import { UserContext } from "../../UserContext";

// interface Estate {
//   id: string; 
//   name: string;
// }

// interface FlatLocationItem {
//   id: string; 
//   block: string;
//   unit: string;
// }

// interface GroupedBlockPayload {
//   block: string;
//   units: string[];
// }

// export default function AddUserForm() {
//   const navigation = useNavigation();
//   const { isDarkMode, theme } = useContext(UserContext);
//   const [loading, setLoading] = useState<boolean>(false);

//   // Core Inputs
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [selfie, setSelfie] = useState<string | null>(null);

//   // Estates Dropdown Controls
//   const [estates, setEstates] = useState<Estate[]>([]);
//   const [selectedEstate, setSelectedEstate] = useState<Estate | null>(null);
//   const [estateDropdownOpen, setEstateDropdownOpen] = useState(false);

//   // Locations Checkbox Tracking Matrices
//   const [flatLocationList, setFlatLocationList] = useState<FlatLocationItem[]>([]);
//   const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

//   useEffect(() => {
//     (async () => {
//       try {
//         const data = await fetchRegistrarEstates();
//         setEstates(data);
//       } catch (err) {
//         Alert.alert("Sync Error", "Failed to resolve active estate domains.");
//       }
//     })();
//   }, []);

//   const handleEstateSelect = async (estate: Estate) => {
//     setSelectedEstate(estate);
//     setEstateDropdownOpen(false);
//     setSelectedLocationIds([]); 
    
//     try {
//       const rawLocations = await fetchEstateLocations(estate.id);
//       const flattened: FlatLocationItem[] = [];
//       rawLocations.forEach((bNode: any) => {
//         bNode.units.forEach((uName: string) => {
//           flattened.push({
//             id: `${bNode.block}-${uName}`,
//             block: bNode.block,
//             unit: uName
//           });
//         });
//       });
//       setFlatLocationList(flattened);
//     } catch (err) {
//       Alert.alert("Data Error", "Could not synchronize structural location items matrix.");
//     }
//   };

//   const toggleLocationSelection = (id: string) => {
//     if (selectedLocationIds.includes(id)) {
//       setSelectedLocationIds(selectedLocationIds.filter(item => item !== id));
//     } else {
//       setSelectedLocationIds([...selectedLocationIds, id]);
//     }
//   };

//   const handlePickSelfie = async () => {
//     const permission = await ImagePicker.requestImageLibraryPermissionsAsync();
//     if (!permission.granted) return Alert.alert("Required", "Storage access authorization required.");

//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       allowsEditing: true,
//       aspect: [1, 1],
//       quality: 0.5,
//     });

//     if (!result.canceled) {
//       setSelfie(result.assets[0].uri);
//     }
//   };

//   const compileGroupedPayload = (): GroupedBlockPayload[] => {
//     const activeItems = flatLocationList.filter(item => selectedLocationIds.includes(item.id));
//     const groupedMap: { [key: string]: string[] } = {};

//     activeItems.forEach(item => {
//       if (!groupedMap[item.block]) {
//         groupedMap[item.block] = [];
//       }
//       groupedMap[item.block].push(item.unit);
//     });

//     return Object.keys(groupedMap).map(blockName => ({
//       block: blockName,
//       units: groupedMap[blockName]
//     }));
//   };

//   const handleFormSubmission = async () => {
//     if (!name || !email || !password || !selectedEstate || selectedLocationIds.length === 0) {
//       return Alert.alert("Missing Fields", "Please populate all mandatory framework parameters.");
//     }

//     setLoading(true);
//     try {
//       const compiledLocations = compileGroupedPayload();
//       const formData = new FormData();
//       formData.append("name", name.trim());
//       formData.append("email", email.trim());
//       formData.append("password", password);
//       formData.append("estateId", selectedEstate.id); 
//       formData.append("locations", JSON.stringify(compiledLocations));

//       if (selfie) {
//         formData.append("selfie", {
//           uri: selfie,
//           name: "profile_image.jpg",
//           type: "image/jpeg"
//         } as any);
//       }

//       const res = await createSubUser(formData);
//       if (res.success) {
//         Alert.alert("Account Provisioned", `${name} has been successfully saved to the tenant database logs.`, [
//           { text: "Done", onPress: () => navigation.goBack() }
//         ]);
//       }
//     } catch (err: any) {
//       Alert.alert("Submission Failure", err.message || "Could not save account details configuration layout.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ScrollView className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-gray-50"} p-4`}>
//       <Text className={`text-xl font-bold mb-6 mt-2 ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}>
//         Add New Sub-Account
//       </Text>

//       <View className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-gray-100"} mb-8`}>
        
//         {/* Full Name Input */}
//         <View className="mb-4">
//           <Text className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
//             Full Name
//           </Text>
//           <TextInput
//             value={name}
//             onChangeText={setName}
//             placeholder="Jane Doe"
//             placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
//             className={`border rounded-xl p-3.5 text-sm font-medium ${
//               isDarkMode ? "border-slate-800 bg-slate-950 text-gray-200" : "border-slate-200 bg-slate-50 text-gray-900"
//             }`}
//           />
//         </View>

//         {/* Email Address Input */}
//         <View className="mb-4">
//           <Text className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
//             Email Address
//           </Text>
//           <TextInput
//             value={email}
//             onChangeText={setEmail}
//             autoCapitalize="none"
//             keyboardType="email-address"
//             placeholder="janedoe@domain.com"
//             placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
//             className={`border rounded-xl p-3.5 text-sm font-medium ${
//               isDarkMode ? "border-slate-800 bg-slate-950 text-gray-200" : "border-slate-200 bg-slate-50 text-gray-900"
//             }`}
//           />
//         </View>

//         {/* Password Input */}
//         <View className="mb-6">
//           <Text className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
//             Temporary Password
//           </Text>
//           <TextInput
//             value={password}
//             onChangeText={setPassword}
//             secureTextEntry
//             placeholder="••••••••"
//             placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
//             className={`border rounded-xl p-3.5 text-sm ${
//               isDarkMode ? "border-slate-800 bg-slate-950 text-gray-200" : "border-slate-200 bg-slate-50 text-gray-900"
//             }`}
//           />
//         </View>

//         {/* Profile Image Picker */}
//         <View className="mb-6">
//           <Text className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
//             Profile Portrait
//           </Text>
//           <View className="flex-row items-center gap-x-4">
//             <TouchableOpacity 
//               onPress={handlePickSelfie}
//               className={`border border-dashed h-20 w-20 rounded-xl items-center justify-center overflow-hidden ${
//                 isDarkMode ? "border-slate-700 bg-slate-950" : "border-slate-300 bg-slate-50"
//               }`}
//             >
//               {selfie ? (
//                 <Image source={{ uri: selfie }} className="w-full h-full" />
//               ) : (
//                 <Text className={isDarkMode ? "text-gm-gold text-xl" : "text-indigo-600 text-xl"}>📷</Text>
//               )}
//             </TouchableOpacity>
//             <Text className={`text-xs flex-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
//               Upload a face profile picture from local device gallery storage paths.
//             </Text>
//           </View>
//         </View>

//         {/* Target Estate Selection */}
//         <View className="mb-6">
//           <Text className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
//             Select Housing Domain Scope
//           </Text>
//           <TouchableOpacity 
//             onPress={() => setEstateDropdownOpen(true)}
//             className={`flex-row justify-between items-center border rounded-xl p-3.5 ${
//               isDarkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
//             }`}
//           >
//             <Text className={selectedEstate ? (isDarkMode ? "text-gray-200 font-medium" : "text-gray-900 font-medium") : "text-gray-400"}>
//               {selectedEstate ? selectedEstate.name : "Select Estate Domain Context"}
//             </Text>
//             <ChevronDown size={16} color={isDarkMode ? "#D4AF37" : "#94a3b8"} />
//           </TouchableOpacity>
//         </View>

//         <Modal visible={estateDropdownOpen} transparent animationType="fade">
//           <TouchableOpacity className="flex-1 bg-black/60 justify-center p-5" onPress={() => setEstateDropdownOpen(false)}>
//             <View className={`rounded-2xl max-h-[60%] p-2 border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
//               <FlatList data={estates} keyExtractor={(item) => item.id} renderItem={({ item }) => (
//                 <TouchableOpacity 
//                   onPress={() => handleEstateSelect(item)} 
//                   className={`p-4 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}
//                 >
//                   <Text className={`font-bold ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}>{item.name}</Text>
//                 </TouchableOpacity>
//               )}/>
//             </View>
//           </TouchableOpacity>
//         </Modal>

//         {/* Compiled Flat Selection Matrix Checklist */}
//         {selectedEstate && (
//           <View className="mb-6">
//             <Text className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}>
//               Select Authorized Units Space
//             </Text>
//             {flatLocationList.length === 0 ? (
//               <Text className="text-xs text-slate-500 italic pl-1">No locations linked to this context schema.</Text>
//             ) : (
//               <View className={`p-1 rounded-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
//                 {flatLocationList.map((item) => {
//                   const isChecked = selectedLocationIds.includes(item.id);
//                   return (
//                     <TouchableOpacity
//                       key={item.id}
//                       onPress={() => toggleLocationSelection(item.id)}
//                       className={`flex-row items-center justify-between p-3.5 border-b ${
//                         isDarkMode ? "border-slate-900" : "border-slate-200/60"
//                       } last:border-b-0`}
//                     >
//                       <Text className={`text-xs font-semibold ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}>
//                         Block {item.block} ➔ Unit {item.unit}
//                       </Text>
//                       <View className={`w-5 h-5 rounded-md border flex items-center justify-center ${
//                         isChecked 
//                           ? (isDarkMode ? "bg-gm-gold border-gm-gold" : "bg-indigo-600 border-indigo-500") 
//                           : (isDarkMode ? "border-slate-700 bg-slate-900" : "border-slate-300 bg-white")
//                       }`}>
//                         {isChecked && <Check size={11} color={isDarkMode ? "#0A1F44" : "#fff"} strokeWidth={3} />}
//                       </View>
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>
//             )}
//           </View>
//         )}

//         {/* Form Submission Button */}
//         <TouchableOpacity
//           disabled={loading}
//           onPress={handleFormSubmission}
//           className={`py-4 rounded-xl flex-row items-center justify-center shadow-sm mt-4 ${
//             isDarkMode ? "bg-gm-gold border border-gm-gold" : "bg-indigo-600"
//           }`}
//         >
//           {loading ? (
//             <ActivityIndicator size="small" color={isDarkMode ? "#0A1F44" : "#fff"} />
//           ) : (
//             <>
//               <UserPlus size={16} color={isDarkMode ? "#0A1F44" : "#fff"} className="mr-2" />
//               <Text className={`font-bold text-sm ${isDarkMode ? "text-gm-navy" : "text-white"}`}>
//                 Create Account Registry
//               </Text>
//             </>
//           )}
//         </TouchableOpacity>

//       </View>
//     </ScrollView>
//   );
// }