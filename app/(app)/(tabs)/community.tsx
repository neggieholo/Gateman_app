import CreatePostModal from "@/app/components/CreatePostModal";
import PostDetailModal from "@/app/components/PostDetailModal";
import { communityApi, getRelativeTime } from "@/app/services/api";
import { Comment, Like, Post } from "@/app/services/interfaces";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  ImageIcon,
  MessageSquare,
  Plus,
  RefreshCw,
  ThumbsUp,
  Trash,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Keyboard,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useUser } from "../../UserContext";

const CATEGORIES = ["Alerts", "General", "Marketplace"];

export default function Community() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Alerts");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postImageUrl, setPostImageUrl] = useState("");
  const [upLoadingNewComment, setUpLoadingNewComment] = useState(false);
  const [likes, setLikes] = useState<Like[]>([]);

  const loadPosts = async () => {
    setLoading(true);
    if (user && user.estate_id && user.id) {
      const data = await communityApi.getPosts(user.estate_id);
      // console.log("Posts:", data);
      setPosts(data);
      setLoading(false);
    } else return;
  };

  useEffect(() => {
    setNewComment("");
    Keyboard.dismiss();
    loadPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => p.category === activeCategory);
  }, [posts, activeCategory]);

  const handleLike = async (postId: string) => {
    if (user && user.id) {
      setPosts(
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes_count: p.has_liked
                  ? p.likes_count - 1
                  : p.likes_count + 1,
                has_liked: !p.has_liked,
              }
            : p,
        ),
      );

      await communityApi.toggleLike(postId);
    } else return;
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) return;

    const payload = {
      estate_id: user!.estate_id,
      author_name: user!.name,
      author_role: "resident",
      title: postTitle,
      content: postContent,
      image_url: postImageUrl,
      category: activeCategory,
    };

    // console.log("Payload for post:", payload);

    await communityApi.createPost(payload);

    // Cleanup
    setPostTitle("");
    setPostContent("");
    setIsModalVisible(false);
    loadPosts(); // Refresh the list
  };

  const handleRefresh = useCallback(
    async (shouldScrollToTop = false) => {
      setIsRefreshing(true);
      await loadPosts();

      if (shouldScrollToTop) {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }

      setIsRefreshing(false);
    },
    [activeCategory, user],
  );

  const handleOpenPost = async (post: Post) => {
    setSelectedPost(post);
    setComments([]);
    setLikes([]); // Clear previous likes
    setIsDetailVisible(true);
    setLoadingComments(true);

    try {
      const [commentsData, likesData] = await Promise.all([
        communityApi.getComments(post.id),
        communityApi.getLikes(post.id),
      ]);

      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                comments_count: commentsData.length,
                likes_count: likesData.length,
              }
            : p,
        ),
      );

      setComments(commentsData);
      setLikes(likesData);
    } catch (err) {
      console.error("Failed to load post details", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDelete = (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to remove this post permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Call the API
              const response = await communityApi.deletePost(postId.toString());

              if (response.success) {
                setPosts((prevPosts) =>
                  prevPosts.filter((p) => p.id !== postId),
                );

                Alert.alert("Success", "Post deleted successfully.");
              }
            } catch (error: any) {
              console.error("Delete Error:", error);
              Alert.alert("Error", "Could not delete post. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim()) return;

    setUpLoadingNewComment(true);

    try {
      await communityApi.addComment({
        post_id: postId,
        author_name: user!.name,
        content: newComment,
      });
      await loadPosts();

      setNewComment("");
    } catch (error) {
      console.error("GateMan Comment Error:", error);
      Alert.alert(
        "Connection Error",
        "Failed to add comment. Please check your internet and try again.",
      );
    } finally {
      setUpLoadingNewComment(false);
    }
  };

  // 3. Function to handle comment submission from inside the modal
  const handleModalCommentSubmit = async () => {
    if (!newComment.trim() || !selectedPost) return;

    await handleAddComment(selectedPost.id); // Uses your existing logic
    setNewComment("");

    // Re-fetch comments to show the new one immediately
    const updatedComments = await communityApi.getComments(selectedPost.id);
    setComments(updatedComments);
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to remove this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Call the API we created in the backend
              const response = await communityApi.deleteComment(
                commentId.toString(),
              );

              if (response.success) {
                // 2. Remove the comment from the local modal state
                setComments((prev) => prev.filter((c) => c.id !== commentId));
                Alert.alert("Success", "Comment removed.");
              }
            } catch (error) {
              console.error("Delete Comment Error:", error);
              Alert.alert("Error", "Could not delete comment.");
            }
          },
        },
      ],
    );
  };

  const renderRoleBadge = (role?: string) => {
    if (!role) return null;
    const bgColor =
      role === "superadmin"
        ? "bg-purple-200 text-purple-800"
        : role === "admin"
          ? "bg-blue-200 text-blue-800"
          : "bg-gray-200 text-gray-800";
    return (
      <Text
        className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${bgColor}`}
      >
        {role.toUpperCase()}
      </Text>
    );
  };

  // --- If user has no estate, show only Join button ---
  if (!user?.estate_id) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-gray-50">
        <TouchableOpacity
          className="bg-indigo-600 py-3 px-6 rounded-xl"
          onPress={() => router.push("/JoinRequest")}
        >
          <Text className="text-white font-bold text-lg text-center">
            Join an Esatate
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="h-16 px-4 py-2 flex-row items-center">
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            className={`flex-1 mx-1 px-4 py-2 rounded-full items-center justify-center ${
              activeCategory === cat ? "bg-indigo-600" : "bg-white"
            } shadow`}
            onPress={() => setActiveCategory(cat)}
          >
            <Text
              className={`font-bold ${activeCategory === cat ? "text-white" : "text-gray-700"}`}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Posts */}
      <ScrollView
        key={activeCategory}
        ref={scrollRef}
        className="px-4 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => handleRefresh(false)}
            colors={["#4f46e5"]}
            tintColor="#4f46e5"
          />
        }
      >
        {filteredPosts.length === 0 && (
          <View className="py-12 items-center">
            <Text className="text-gray-400 text-lg">
              {loading ? "Retrieving Posts ..." : "No posts yet"}
            </Text>
          </View>
        )}
        {filteredPosts.map((post) => (
          <View
            key={post.id}
            className="bg-white p-4 rounded-2xl mb-4 shadow border border-gray-100"
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center gap-2">
                <View
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white ${post.author_role === "admin" || post.author_role === "superadmin" ? "bg-blue-600" : "bg-gray-400"}`}
                >
                  <Text className="text-white font-bold">
                    {post.author_name
                      ? post.author_name.charAt(0).toUpperCase()
                      : "?"}
                  </Text>
                </View>
                <View>
                  <View className="flex items-start justify-center">
                    <Text className="font-bold text-gray-900">
                      {post.author_name}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400">
                    {getRelativeTime(post.created_at)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleOpenPost(post)}
                className="bg-white p-1 rounded-2x"
              >
                <ChevronRight size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <Text className="font-bold text-lg mb-1">{post.title}</Text>

            <Text className="text-gray-600 mb-2">{post.content}</Text>

            <View className="flex-row items-center justify-between my-3">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => handleLike(post.id)}
              >
                <ThumbsUp
                  size={18}
                  color={post.has_liked ? "#2563eb" : "#9ca3af"}
                />
                <Text className="ml-1 font-bold text-sm">
                  {post.likes_count}
                </Text>
              </TouchableOpacity>
              <View className="flex-row items-center">
                <MessageSquare size={18} color="#9ca3af" />
                <Text className="ml-1 font-bold text-sm">
                  {post.comments_count}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              {/* 1. Show 'Image attached' badge only if URL exists */}
              {post.image_url ? (
                <View className="flex-row items-center mt-3 bg-indigo-50 self-start px-2 py-1 rounded-md">
                  <ImageIcon size={14} color="#4f46e5" />
                  <Text className="text-indigo-600 text-xs ml-1 font-bold">
                    Image attached
                  </Text>
                </View>
              ) : (
                <View className="mt-3" /> // Keeps vertical alignment
              )}

              {/* 2. Show Trash icon ONLY if current user is the author */}
              {user?.id === post.author_id && (
                <TouchableOpacity
                  onPress={() => handleDelete(post.id)}
                  className="mt-3 p-1"
                >
                  <Trash size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="absolute bottom-10 right-6 items-center">
        <TouchableOpacity
          onPress={() => {
            handleRefresh(true);
          }}
          disabled={loading || isRefreshing}
          className={`mb-4 w-16 h-16 rounded-full items-center justify-center shadow-lg border border-gray-100 ${
            isRefreshing ? "bg-gray-100" : "bg-white"
          }`}
        >
          <RefreshCw
            size={20}
            color="#4f46e5"
            className={isRefreshing ? "animate-spin" : ""}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          className="bg-indigo-600 w-16 h-16 rounded-full items-center justify-center shadow-xl"
        >
          <Plus size={28} color="white" />
        </TouchableOpacity>
      </View>

      <CreatePostModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleCreatePost}
        category={activeCategory}
        title={postTitle}
        setTitle={setPostTitle}
        content={postContent}
        setContent={setPostContent}
        setImageUrl={setPostImageUrl}
      />
      <PostDetailModal
        isVisible={isDetailVisible}
        onClose={() => {
          setIsDetailVisible(false);
          setSelectedPost(null);
        }}
        post={selectedPost}
        comments={comments}
        likes={likes}
        newComment={newComment}
        setNewComment={setNewComment}
        onAddComment={handleModalCommentSubmit}
        onLike={handleLike}
        isLoadingComments={loadingComments}
        uploadingComment={upLoadingNewComment}
        handleDelete={handleDeleteComment}
      />
    </View>
  );
}
