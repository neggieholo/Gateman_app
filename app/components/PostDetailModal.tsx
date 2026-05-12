import { Directory, File, Paths } from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";
import {
  Download,
  Heart,
  ImageIcon,
  Send,
  Trash,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { getRelativeTime } from "../services/api";
import { Comment, Like, Post } from "../services/interfaces";
import { useUser } from "../UserContext";

export interface PostDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  post: Post | null;
  comments: Comment[];
  likes: Like[];
  newComment: string;
  setNewComment: (text: string) => void;
  onAddComment: () => void;
  onLike: (postId: string) => void;
  isLoadingComments: boolean;
  uploadingComment: boolean;
  handleDelete: (commentId: number) => void;
}

export default function PostDetailModal({
  isVisible,
  onClose,
  post,
  comments,
  likes,
  newComment,
  setNewComment,
  onAddComment,
  isLoadingComments,
  uploadingComment,
  handleDelete,
}: PostDetailModalProps) {
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "likes">("comments");
  const { user } = useUser();
  const colorScheme = useColorScheme();

  // useEffect(() => {
  //   // Add this right before your return (...)
  //   console.log("--- DEBUG GATEMAN POSTMODAL---");
  //   console.log("Platform OS:", Platform.OS);
  //   console.log(
  //     "Platform Check Result (isAndroid?):",
  //     Platform.OS === "android",
  //   );
  //   console.log(
  //     "StatusBar Style applied:",
  //     Platform.OS === "android" ? "light" : "dark",
  //   );
  //   console.log("Colorscheme:", colorScheme);
  //   console.log("---------------------");
  // }, [colorScheme]);

  if (!post) return null;

  const handleSaveImage = async (url: string) => {
    try {
      setIsSaving(true);

      // 1. Request Permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need access to your gallery to save the photo.",
        );
        return;
      }

      // 2. Ensure Directory exists (Matching your renderCustomView pattern)
      const gateManDir = new Directory(Paths.cache, "GateMan");
      if (!gateManDir.exists) gateManDir.create();

      // 3. Define local file path
      const fileName = `GateMan_Post_${Date.now()}.jpg`;
      const localFile = new File(gateManDir, fileName);

      console.log("GateMan: Downloading image to cache...");

      // 4. Download the file from the remote URL
      const downloadedFile = await File.downloadFileAsync(url, localFile);

      if (downloadedFile.exists) {
        // 5. Save to Gallery
        // MediaLibrary needs a local URI. We use the one we just downloaded.
        const asset = await MediaLibrary.createAssetAsync(downloadedFile.uri);
        await MediaLibrary.createAlbumAsync("GateMan", asset, false);

        Alert.alert("Success", "Image saved to your gallery!");
      }
    } catch (error) {
      console.error("GateMan Image Save Error:", error);
      Alert.alert("Error", "Could not save the image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      statusBarTranslucent={false}
      presentationStyle="fullScreen"
    >
      <SafeAreaProvider>
        <View className="flex-1">
          <StatusBar
            key={`status-bar-${colorScheme}`}
            style={
              Platform.OS === "android"
                ? colorScheme === "dark"
                  ? "light"
                  : "dark"
                : "dark"
            }
            backgroundColor={
              Platform.OS === "android"
                ? colorScheme === "dark"
                  ? "#000000"
                  : "#ffffff"
                : undefined
            }
            translucent={false}
          />
          <SafeAreaView
            className="flex-1 bg-white"
            edges={
              Platform.OS === "ios"
                ? ["top", "left", "right"]
                : ["top", "left", "right", "bottom"]
            }
          >
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-900">
                Discussion
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 bg-gray-100 rounded-full"
              >
                <X size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* 2. FIXED POST CONTENT (Does not scroll) */}
            <View className="p-4 bg-white border-b border-gray-50">
              <View className="flex-row justify-between">
                <Text className="text-xl font-bold text-gray-900 mb-1">
                  {post.title}
                </Text>
              </View>
              <Text className="text-gray-600 text-sm mb-3">{post.content}</Text>

              {post.image_url && (
                <TouchableOpacity
                  onPress={() => setImageModalVisible(true)} // <--- ADD THIS
                  className="flex-row items-center bg-indigo-50 self-start px-2 py-1 rounded-md mb-2"
                >
                  <ImageIcon size={14} color="#4f46e5" />
                  <Text className="text-indigo-600 text-[10px] ml-1 font-bold">
                    View Image
                  </Text>
                </TouchableOpacity>
              )}

              <Text className="text-[10px] text-gray-400">
                {`By ${post.author_name} • ${getRelativeTime(post.created_at)}`}
              </Text>
            </View>

            {/* 3. SCROLLABLE COMMENTS SECTION */}
            <View className="flex-1">
              <View className="flex-row bg-white border-b border-gray-100">
                <TouchableOpacity
                  onPress={() => setActiveTab("comments")}
                  className={`flex-1 py-3 items-center ${activeTab === "comments" ? "border-b-2 border-indigo-600" : ""}`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-widest ${activeTab === "comments" ? "text-indigo-600" : "text-gray-400"}`}
                  >
                    Comments ({comments?.length ?? 0})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab("likes")}
                  className={`flex-1 py-3 items-center ${activeTab === "likes" ? "border-b-2 border-indigo-600" : ""}`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-widest ${activeTab === "likes" ? "text-indigo-600" : "text-gray-400"}`}
                  >
                    Likes ({likes?.length ?? 0})
                  </Text>
                </TouchableOpacity>
              </View>
              <KeyboardAwareScrollView
                className="flex-1 bg-gray-50"
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                bottomOffset={0} // Forces the input to sit flush on the keyboard
              >
                {/* COMMENTS LIST (The flex-1 here pushes the input to the bottom) */}
                {activeTab === "likes" ? (
                  <View className="flex-1 p-4">
                    {isLoadingComments ? (
                      <View className="flex-1 p-4 flex justify-center items-center">
                        <ActivityIndicator size="small" color="#4f46e5" />
                      </View>
                    ) : likes.length > 0 ? (
                      likes.map((like: any, index: number) => (
                        <View
                          key={index}
                          className="flex-row items-center mb-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm"
                        >
                          {/* Avatar Initial */}
                          <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center mr-3 border border-indigo-100">
                            <Text className="text-indigo-600 font-bold text-sm">
                              {like.author_name?.charAt(0).toUpperCase() || "U"}
                            </Text>
                          </View>

                          <View className="flex-1">
                            <Text className="text-sm font-bold text-gray-900">
                              {like.author_name}
                            </Text>
                            <Text className="text-[10px] text-gray-400">
                              Liked {getRelativeTime(like.created_at)}
                            </Text>
                          </View>

                          {/* Heart indicator */}
                          <View className="bg-red-50 p-2 rounded-full">
                            <Heart size={12} color="#ef4444" fill="#ef4444" />
                          </View>
                        </View>
                      ))
                    ) : (
                      <View className="items-center py-10">
                        <Text className="text-gray-400 text-xs">
                          No likes yet
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View className="flex-1 p-4">
                    {comments.length > 0 ? (
                      comments.map((comment: any) => (
                        <View
                          key={comment.id}
                          className="mb-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100"
                        >
                          <Text className="font-bold text-xs text-indigo-600">
                            {comment.author_name}
                          </Text>
                          <Text className="text-gray-800 py-1 text-sm">
                            {comment.content}
                          </Text>
                          <View className="flex-row justify-between w-full">
                            <Text className="text-[9px] text-gray-400">
                              {getRelativeTime(comment.created_at)}
                            </Text>
                            {comment.user_id === user?.id && (
                              <TouchableOpacity
                                onPress={() => handleDelete(comment.id)}
                              >
                                <Trash size={14} color="red" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))
                    ) : (
                      <View className="items-center py-10">
                        <Text className="text-gray-400 text-xs">
                          No comments yet
                        </Text>
                      </View>
                    )}
                    <View className="h-10" />
                  </View>
                )}
              </KeyboardAwareScrollView>
            </View>

            {/* 3. THE INPUT BOX - Inside the scroll view but at the bottom */}
            {activeTab === "comments" && (
              <View>
                <KeyboardAwareScrollView
                  className=" bg-gray-50"
                  keyboardShouldPersistTaps="handled"
                  bottomOffset={0}
                >
                  <View className="p-4 border-t border-gray-100 bg-white">
                    <View className="flex-row items-center px-4 h-12">
                      <TextInput
                        className="flex-1 text-sm text-gray-900 bg-gray-100 rounded-2xl "
                        placeholder="Write a comment..."
                        placeholderTextColor="#9ca3af"
                        value={newComment}
                        onChangeText={setNewComment}
                      />
                      <TouchableOpacity
                        onPress={onAddComment}
                        disabled={uploadingComment}
                        className="ml-2 bg-indigo-600 rounded-full p-2"
                      >
                        {uploadingComment ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Send size={16} color="white" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAwareScrollView>
              </View>
            )}
            <Modal
              visible={isImageModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setImageModalVisible(false)}
            >
              <View className="flex-1 bg-black/95 justify-center items-center">
                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => setImageModalVisible(false)}
                  className="absolute top-12 right-6 z-20 bg-white/20 p-2 rounded-full"
                >
                  <X size={24} color="white" />
                </TouchableOpacity>

                {/* Save Button */}
                <TouchableOpacity
                  onPress={() => handleSaveImage(post.image_url!)}
                  disabled={isSaving}
                  className="absolute top-12 left-6 z-20 bg-indigo-600 p-2 rounded-full"
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Download size={24} color="white" />
                  )}
                </TouchableOpacity>

                <Image
                  source={{
                    uri: post.image_url || "https://via.placeholder.com/300",
                  }}
                  className="w-full h-[80%]"
                  resizeMode="contain"
                />
              </View>
            </Modal>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
