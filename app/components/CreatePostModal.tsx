import React from "react";
import { Modal, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from "react-native";

interface CreatePostModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
  category: string;
  title: string;
  setTitle: (text: string) => void;
  content: string;
  setContent: (text: string) => void;
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
}: CreatePostModalProps) {
  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end bg-black/50"
      >
        <View className="bg-white rounded-t-3xl p-6 h-3/4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold">New {category} Post</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-500 font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-500 mb-2 font-semibold">Title</Text>
          <TextInput
            className="bg-gray-100 rounded-xl px-4 py-3 mb-4 font-bold text-gray-900"
            placeholder="e.g. Broken Water Pipe"
            value={title}
            onChangeText={setTitle}
          />

          <Text className="text-gray-500 mb-2 font-semibold">Content</Text>
          <TextInput
            className="bg-gray-100 rounded-xl px-4 py-4 mb-6 h-32 text-gray-900"
            placeholder="Provide more details..."
            multiline
            textAlignVertical="top"
            value={content}
            onChangeText={setContent}
          />

          <TouchableOpacity 
            onPress={() => onSubmit(title, content)}
            className="bg-indigo-600 py-4 rounded-xl items-center shadow-md"
          >
            <Text className="text-white font-bold text-lg">Publish Post</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}