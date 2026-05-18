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
  // Updated to include the image URL
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false
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
        // Offset helps ensure the button isn't hidden by the keyboard
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-white rounded-t-3xl p-6 h-3/4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold">{`New Post`}</Text>
            <TouchableOpacity onPress={onClose} disabled={isUploading}>
              <Text className="text-gray-500 font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-500 mb-2 font-semibold">Title</Text>
          <TextInput
            className="bg-gray-100 rounded-xl px-4 py-3 mb-4 font-bold text-gray-900"
            placeholderTextColor="#9ca3af"
            placeholder="e.g. Broken Water Pipe"
            value={title}
            onChangeText={setTitle}
            editable={!isUploading}
            maxLength={50}
          />

          <Text className="text-gray-500 mb-2 font-semibold">Content</Text>
          <TextInput
            className="bg-gray-100 rounded-xl px-4 py-4 mb-4 h-32 text-gray-900"
            placeholderTextColor="#9ca3af"
            placeholder="Provide more details..."
            multiline
            textAlignVertical="top"
            value={content}
            onChangeText={setContent}
            editable={!isUploading}
          />

          {/* Image Upload/Preview Area */}
          <View className="mb-6">
            {selectedImage ? (
              <View className="relative w-24 h-24">
                <Image
                  source={{ uri: selectedImage }}
                  className="w-24 h-24 rounded-xl"
                />
                <TouchableOpacity
                  onPress={() => setSelectedImage(null)}
                  disabled={isUploading}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                >
                  <X size={12} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickImage}
                className="flex-row items-center bg-gray-100 self-start px-4 py-3 rounded-xl border border-dashed border-gray-300"
              >
                <ImageIcon size={20} color="#4f46e5" />
                <Text className="text-indigo-600 ml-2 font-bold">
                  Add a Photo
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handlePublish}
            disabled={isUploading}
            className="bg-indigo-600 py-4 rounded-xl items-center shadow-md"
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Publish Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
