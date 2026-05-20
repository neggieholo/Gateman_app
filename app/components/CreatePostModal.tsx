import { useUser } from "@/app/UserContext";
import * as ImagePicker from "expo-image-picker";
import { ImageIcon, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getCloudinaryUrl } from "../services/api";

interface CreatePostModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  category: string;
  title: string;
  setTitle: (text: string) => void;
  content: string;
  setContent: (text: string) => void;
  setImageUrl: (text: string) => void;
}

export default function CreatePostModal({
  isVisible,
  onClose,
  onSubmit,
  category,
  title,
  setTitle,
  content,
  setContent,
  setImageUrl,
}: CreatePostModalProps) {
  const { isDarkMode, theme } = useUser();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setIsUploading(true);
    let uploadedUrl = "";

    try {
      if (selectedImage) {
        const url = await getCloudinaryUrl(selectedImage, "image");
        if (url) uploadedUrl = url;
        setImageUrl(uploadedUrl);
      }

      await onSubmit();
      setSelectedImage(null);
    } catch (error) {
      Alert.alert(
        "Upload Failed",
        "Could not upload image. Check your connection.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        className="flex-1 justify-end bg-black/50"
      >
        <View
          className={`rounded-t-[3rem] p-6  pb-20 h-3/4 border-t ${
            isDarkMode ? "bg-gm-charcoal border-slate-800" : "bg-white border-transparent"
          }`}
        >
          {/* Header Layout */}
          <View className="flex-row justify-between items-center mb-6 px-1">
            <Text
              style={{ fontFamily: "montserrat-bold" }}
              className={`text-2xl ${isDarkMode ? "text-gm-gold" : "text-slate-900"}`}
            >
              New Post
            </Text>
            <TouchableOpacity onPress={onClose} disabled={isUploading}>
              <Text
                style={{ fontFamily: "oswald-semibold" }}
                className={`text-sm uppercase tracking-wide ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Content Scroll Group Container */}
          <View className="flex-1">
            {/* Title Field Element */}
            <Text
              style={{ fontFamily: "oswald-semibold" }}
              className={`mb-2 text-xs uppercase tracking-wider ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Title
            </Text>
            <TextInput
              style={{ fontFamily: "montserrat-bold" }}
              className={`rounded-2xl px-4 py-3.5 mb-5 border ${
                isDarkMode
                  ? "bg-gm-navy border-slate-800 text-white"
                  : "bg-slate-100 border-slate-200 text-slate-900"
              }`}
              placeholderTextColor={isDarkMode ? "#475569" : "#9ca3af"}
              placeholder="e.g. Broken Water Pipe"
              value={title}
              onChangeText={setTitle}
              editable={!isUploading}
              maxLength={50}
            />

            {/* Content Field Element */}
            <Text
              style={{ fontFamily: "oswald-semibold" }}
              className={`mb-2 text-xs uppercase tracking-wider ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Content
            </Text>
            <TextInput
              style={{ fontFamily: "roboto-regular" }}
              className={`rounded-2xl px-4 py-4 mb-6 h-36 border leading-6 ${
                isDarkMode
                  ? "bg-gm-navy border-slate-800 text-slate-200"
                  : "bg-slate-100 border-slate-200 text-slate-800"
              }`}
              placeholderTextColor={isDarkMode ? "#475569" : "#9ca3af"}
              placeholder="Provide more details..."
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
              editable={!isUploading}
            />

            {/* Image Upload Preview Framework Block */}
            <View className="mb-8">
              {selectedImage ? (
                <View className="relative w-24 h-24 shadow-md">
                  <Image
                    source={{ uri: selectedImage }}
                    className={`w-24 h-24 rounded-2xl ${
                      isDarkMode ? "bg-slate-900" : "bg-slate-200"
                    }`}
                  />
                  <TouchableOpacity
                    onPress={() => setSelectedImage(null)}
                    disabled={isUploading}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 shadow-lg"
                  >
                    <X size={12} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickImage}
                  className={`flex-row items-center self-start px-5 py-3.5 rounded-2xl border border-dashed ${
                    isDarkMode
                      ? "bg-gm-navy/40 border-slate-700"
                      : "bg-slate-50 border-slate-300"
                  }`}
                >
                  <ImageIcon size={20} color={isDarkMode ? "#D4AF37" : "#4f46e5"} />
                  <Text
                    style={{ fontFamily: "oswald-semibold" }}
                    className={`ml-2 uppercase tracking-wide text-xs ${
                      isDarkMode ? "text-gm-gold" : "text-indigo-600"
                    }`}
                  >
                    Add a Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Action Trigger Node */}
          <TouchableOpacity
            onPress={handlePublish}
            disabled={isUploading}
            className={`py-4 rounded-2xl items-center shadow-xl ${
              isDarkMode ? "bg-gm-charcoal border border-gm-gold" : "bg-slate-900"
            }`}
          >
            {isUploading ? (
              <ActivityIndicator color={isDarkMode ? "#D4AF37" : "white"} />
            ) : (
              <Text
                style={{ fontFamily: "montserrat-bold" }}
                className={`text-base tracking-wide ${isDarkMode ? "text-gm-gold" : "text-white"}`}
              >
                Publish Post
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}