import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Check, ChevronDown, UserPlus } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { createSubUser, getCloudinaryUrl } from "./services/api";
import { EstateProfile, LocationPair } from "./services/interfaces";
import { useUser } from "./UserContext";

interface FlatLocationItem {
  id: string;
  block: string;
  unit: string;
}

interface GroupedBlockPayload {
  block: string;
  units: string[];
}

export default function AddUserForm() {
  const navigation = useNavigation();
  const { isDarkMode, user, setUser } = useUser();

  const [loading, setLoading] = useState<boolean>(false);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // Core Provisioning Fields Inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);

  // Scoped Estates List State Tracking Matrices
  const [estates, setEstates] = useState<EstateProfile[]>([]);
  const [selectedEstate, setSelectedEstate] = useState<EstateProfile | null>(
    null,
  );
  const [estateDropdownOpen, setEstateDropdownOpen] = useState(false);

  // Scoped Locations Selection Matrices
  const [flatLocationList, setFlatLocationList] = useState<FlatLocationItem[]>(
    [],
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  // 1. Sync domains directly from user context session fields instead of an absolute server dump
  useEffect(() => {
    if (user && user.estates) {
      setEstates(user.estates);
    }
  }, [user]);

  // 2. Expand only the specific properties the logged-in tenant owns/controls inside this estate
  const handleEstateSelect = (estate: EstateProfile) => {
    setSelectedEstate(estate);
    setEstateDropdownOpen(false);
    setSelectedLocationIds([]);

    const tenantEstateLocations: LocationPair[] =
      user?.locations?.[estate.id] || [];
    const flattened: FlatLocationItem[] = [];

    tenantEstateLocations.forEach((bNode) => {
      // Fixed: Synchronized with your interface definition schema property 'unit' (was 'units')
      if (bNode.unit && Array.isArray(bNode.unit)) {
        bNode.unit.forEach((uName: string) => {
          flattened.push({
            id: `${estate.id}-${bNode.block}-${uName}`,
            block: bNode.block,
            unit: uName,
          });
        });
      }
    });

    setFlatLocationList(flattened);
  };

  const toggleLocationSelection = (id: string) => {
    if (selectedLocationIds.includes(id)) {
      setSelectedLocationIds(selectedLocationIds.filter((item) => item !== id));
    } else {
      setSelectedLocationIds([...selectedLocationIds, id]);
    }
  };

  const handlePickSelfie = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert("Required", "Storage access authorization required.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      setUploadingImage(true);
      try {
        const cloudUrl = await getCloudinaryUrl(result.assets[0].uri, "image");
        if (cloudUrl) {
          setSelfie(cloudUrl);
        } else {
          Alert.alert(
            "Upload Error",
            "Failed to secure Cloudinary CDN asset path pointer.",
          );
        }
      } catch (uploadErr) {
        Alert.alert(
          "Engine Failure",
          "Could not process media framework image streams.",
        );
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const compileGroupedPayload = (): GroupedBlockPayload[] => {
    const activeItems = flatLocationList.filter((item) =>
      selectedLocationIds.includes(item.id),
    );
    const groupedMap: { [key: string]: string[] } = {};

    activeItems.forEach((item) => {
      if (!groupedMap[item.block]) {
        groupedMap[item.block] = [];
      }
      groupedMap[item.block].push(item.unit);
    });

    return Object.keys(groupedMap).map((blockName) => ({
      block: blockName,
      units: groupedMap[blockName],
    }));
  };

  const handleFormSubmission = async () => {
    if (
      !name ||
      !email ||
      !password ||
      !selectedEstate ||
      selectedLocationIds.length === 0
    ) {
      return Alert.alert(
        "Missing Fields",
        "Please populate all mandatory framework parameters.",
      );
    }

    setLoading(true);
    try {
      const compiledLocations = compileGroupedPayload();

      // Create a plain JSON payload object
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password,
        estateId: selectedEstate.id,
        locations: JSON.stringify(compiledLocations),
        selfie: selfie || null,
      };

      const res = await createSubUser(payload);
      
      if (!res.success) {
        return Alert.alert(
          "Provisioning Failed",
          res.message ||
            "An unexpected validation error occurred on the server.",
        );
      }
      if (res.success) {
        if (user && setUser) {
        const newSubUserId = res.subUser.id; 
        
        setUser({
          ...user,
          sub_users: [...(user.sub_users || []), newSubUserId],
        });
      }
        Alert.alert(
          "Account Provisioned",
          `${name} has been successfully saved to your account.`,
          [{ text: "Done", onPress: () => navigation.goBack() }],
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Submission Failure",
        err.message || "Could not save account details configuration layout.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className={`flex-1 ${isDarkMode ? "bg-slate-950" : "bg-gray-50"} p-4 pb-10`}
    >
      <Text
        className={`text-xl font-bold mb-6 mt-2 ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
      >
        Add New Sub-Account
      </Text>
      <Text
        className={`text-xs italic mb-6 font-normal tracking-wide leading-relaxed ${
          isDarkMode ? "text-slate-400" : "text-slate-500"
        }`}
        style={{ fontFamily: "Roboto-Regular" }}
      >
        Email verification will be required before this account can login. It is
        strongly advised that the sub-account holder changes their temporary
        password immediately upon their first successful login session.
      </Text>

      <View
        className={`p-5 rounded-3xl border shadow-sm ${isDarkMode ? "bg-gm-navy border-slate-800" : "bg-white border-gray-100"} mb-8 pb-20`}
      >
        {/* Full Name Input */}
        <View className="mb-4">
          <Text
            className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            Full Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
            className={`border rounded-xl p-3.5 text-sm font-medium ${
              isDarkMode
                ? "border-slate-800 bg-slate-950 text-gray-200"
                : "border-slate-200 bg-slate-50 text-gray-900"
            }`}
          />
        </View>

        {/* Email Address Input */}
        <View className="mb-4">
          <Text
            className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            Email Address
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="janedoe@domain.com"
            placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
            className={`border rounded-xl p-3.5 text-sm font-medium ${
              isDarkMode
                ? "border-slate-800 bg-slate-950 text-gray-200"
                : "border-slate-200 bg-slate-50 text-gray-900"
            }`}
          />
        </View>

        {/* Password Input */}
        <View className="mb-6">
          <Text
            className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            Temporary Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
            className={`border rounded-xl p-3.5 text-sm ${
              isDarkMode
                ? "border-slate-800 bg-slate-950 text-gray-200"
                : "border-slate-200 bg-slate-50 text-gray-900"
            }`}
          />
        </View>

        {/* Profile Image Picker */}
        <View className="mb-6">
          <Text
            className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            Profile Portrait
          </Text>
          <View className="flex-row items-center gap-x-4">
            <TouchableOpacity
              disabled={uploadingImage}
              onPress={handlePickSelfie}
              className={`border border-dashed h-20 w-20 rounded-xl items-center justify-center overflow-hidden ${
                isDarkMode
                  ? "border-slate-700 bg-slate-950"
                  : "border-slate-300 bg-slate-50"
              }`}
            >
              {uploadingImage ? (
                <ActivityIndicator
                  size="small"
                  color={isDarkMode ? "#D4AF37" : "#4f46e5"}
                />
              ) : selfie ? (
                <Image source={{ uri: selfie }} className="w-full h-full" />
              ) : (
                <Text
                  className={
                    isDarkMode
                      ? "text-gm-gold text-xl"
                      : "text-indigo-600 text-xl"
                  }
                >
                  📷
                </Text>
              )}
            </TouchableOpacity>
            <Text
              className={`text-xs flex-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              Upload a proper face profile picture. Make sure it depicts the
              user to avoid violating the Gateman policy.
            </Text>
          </View>
        </View>

        {/* Target Estate Selection */}
        <View className="mb-6">
          <Text
            className={`text-xs font-bold uppercase tracking-wide mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
          >
            Select Housing Domain Scope
          </Text>
          <TouchableOpacity
            onPress={() => setEstateDropdownOpen(true)}
            className={`flex-row justify-between items-center border rounded-xl p-3.5 ${
              isDarkMode
                ? "border-slate-800 bg-slate-950"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <Text
              className={
                selectedEstate
                  ? isDarkMode
                    ? "text-gray-200 font-medium"
                    : "text-gray-900 font-medium"
                  : "text-gray-400"
              }
            >
              {selectedEstate
                ? selectedEstate.name
                : "Select Estate Domain Context"}
            </Text>
            <ChevronDown size={16} color={isDarkMode ? "#D4AF37" : "#94a3b8"} />
          </TouchableOpacity>
        </View>

        <Modal visible={estateDropdownOpen} transparent animationType="fade">
          <TouchableOpacity
            className="flex-1 bg-black/60 justify-center p-5"
            onPress={() => setEstateDropdownOpen(false)}
          >
            <View
              className={`rounded-2xl max-h-[60%] p-2 border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
            >
              <FlatList
                data={estates}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleEstateSelect(item)}
                    className={`p-4 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}
                  >
                    <Text
                      className={`font-bold ${isDarkMode ? "text-gray-200" : "text-slate-800"}`}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Compiled Flat Selection Matrix Checklist */}
        {selectedEstate && (
          <View className="mb-6">
            <Text
              className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDarkMode ? "text-gm-gold" : "text-gm-navy"}`}
            >
              Select Authorized Units Space
            </Text>
            {flatLocationList.length === 0 ? (
              <Text className="text-xs text-slate-500 italic pl-1">
                No locations linked to your account within this estate.
              </Text>
            ) : (
              <View
                className={`p-1 rounded-2xl border ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}
              >
                {flatLocationList.map((item) => {
                  const isChecked = selectedLocationIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => toggleLocationSelection(item.id)}
                      className={`flex-row items-center justify-between p-3.5 border-b ${
                        isDarkMode ? "border-slate-900" : "border-slate-200/60"
                      } last:border-b-0`}
                    >
                      <Text
                        className={`text-xs font-semibold ${isDarkMode ? "text-gray-300" : "text-slate-700"}`}
                      >
                        Block {item.block} ➔ Unit {item.unit}
                      </Text>
                      <View
                        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isChecked
                            ? isDarkMode
                              ? "bg-gm-gold border-gm-gold"
                              : "bg-indigo-600 border-indigo-500"
                            : isDarkMode
                              ? "border-slate-700 bg-slate-900"
                              : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && (
                          <Check
                            size={11}
                            color={isDarkMode ? "#0A1F44" : "#fff"}
                            strokeWidth={3}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Form Submission Button */}
        <TouchableOpacity
          disabled={loading || uploadingImage}
          onPress={handleFormSubmission}
          className={`py-4 rounded-xl flex-row items-center justify-center shadow-sm mt-4 ${
            isDarkMode ? "bg-gm-gold border border-gm-gold" : "bg-indigo-600"
          }`}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={isDarkMode ? "#0A1F44" : "#fff"}
            />
          ) : (
            <>
              <UserPlus
                size={16}
                color={isDarkMode ? "#0A1F44" : "#fff"}
                className="mr-2"
              />
              <Text
                className={`font-bold text-sm ${isDarkMode ? "text-gm-navy" : "text-white"}`}
              >
                Create Account Registry
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
