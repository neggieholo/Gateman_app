import { useRouter } from "expo-router";
import { MessageSquare, Plus, Send, ThumbsUp } from "lucide-react-native";
import React, { useContext, useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { UserContext } from "../../UserContext";

interface Comment {
  id: string;
  author: string;
  authorRole?: string;
  content: string;
  timestamp: string;
}

interface Post {
  id: string;
  author: string;
  authorRole?: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  comments: Comment[];
  timestamp: string;
}

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    author: 'Alice Freeman',
    authorRole: 'resident',
    title: 'Suspicious car parked near Gate B',
    content: 'Has anyone seen a red sedan parked near Gate B for the last 3 days?',
    category: 'Alerts',
    likes: 12,
    comments: [
      { id: 'c1', author: 'Security Desk', authorRole: 'admin', content: 'Towing service has been called.', timestamp: '1 hour ago' },
    ],
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    author: 'Mark Wilson',
    authorRole: 'resident',
    title: 'Selling unused Gym Equipment',
    content: 'I am selling a treadmill and some dumbbells. DM for prices.',
    category: 'Marketplace',
    likes: 4,
    comments: [],
    timestamp: '5 hours ago'
  },
  {
    id: '3',
    author: 'Estate Admin',
    authorRole: 'admin',
    title: 'Water tank cleaning schedule',
    content: 'Water tank cleaning will happen on Tuesday from 10 AM to 4 PM.',
    category: 'General',
    likes: 45,
    comments: [],
    timestamp: '1 day ago'
  }
];

export default function Community() {
  const { user } = useContext(UserContext);
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [newComment, setNewComment] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const handleLike = (postId: string) => {
    setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.likes + 1 } : p));
  };

  useEffect(() => {    
    console.log("User:", user)
  },[user])

  const handleAddComment = (postId: string) => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: user!.name,
      content: newComment,
      timestamp: 'Just now'
    };

    setPosts(posts.map(p => 
      p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
    ));
    setNewComment("");
  };

  const renderRoleBadge = (role?: string) => {
    if (!role) return null;
    const bgColor = role === 'superadmin' ? 'bg-purple-200 text-purple-800' 
                  : role === 'admin' ? 'bg-blue-200 text-blue-800' 
                  : 'bg-gray-200 text-gray-800';
    return (
      <Text className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${bgColor}`}>
        {role.toUpperCase()}
      </Text>
    );
  };

  // --- If user has no estate, show only Join button ---
  if (!user?.estate_id) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-gray-50">
        <TouchableOpacity className="bg-indigo-600 py-3 px-6 rounded-xl" onPress={() => router.push('/JoinRequest')}>
          <Text className="text-white font-bold text-lg text-center">Join an Esatate</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categories = ['All', ...Array.from(new Set(posts.map(p => p.category)))];

  const filteredPosts = activeCategory === 'All' 
    ? posts 
    : posts.filter(p => p.category === activeCategory);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Category Tabs */}
      <View className="h-16 px-4 py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
            <View className="flex-row space-x-6">
            {categories.map(cat => (
                <TouchableOpacity
                key={cat}
                className={`px-4 py-2 rounded-full ${activeCategory === cat ? 'bg-indigo-600' : 'bg-white'} shadow`}
                onPress={() => setActiveCategory(cat)}
                >
                <Text className={`font-bold ${activeCategory === cat ? 'text-white' : 'text-gray-700'}`}>
                    {cat}
                </Text>
                </TouchableOpacity>
            ))}
            </View>
        </ScrollView>
    </View>



      {/* Posts */}
      <ScrollView className="px-4 pb-24">
        {filteredPosts.length === 0 && (
          <View className="py-12 items-center">
            <Text className="text-gray-400 text-lg">No posts yet</Text>
          </View>
        )}
        {filteredPosts.map(post => (
          <View key={post.id} className="bg-white p-4 rounded-2xl mb-4 shadow border border-gray-100">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center space-x-2">
                <View className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white ${post.authorRole === 'admin' || post.authorRole === 'superadmin' ? 'bg-blue-600' : 'bg-gray-400'}`}>
                  <Text>
                    {post.author.charAt(0)}
                  </Text>
                </View>
                <View>
                  <View className="flex-row items-center">
                    <Text className="font-bold text-gray-900">{post.author}</Text>
                  </View>
                  <Text className="text-xs text-gray-400">{post.timestamp}</Text>
                </View>
              </View>
            </View>

            <Text className="font-bold text-lg mb-1">{post.title}</Text>
            <Text className="text-gray-600 mb-2">{post.content}</Text>

            <View className="flex-row items-center justify-between">
              <TouchableOpacity className="flex-row items-center" onPress={() => handleLike(post.id)}>
                <ThumbsUp size={18} color={post.likes > 0 ? "#2563eb" : "#9ca3af"} />
                <Text className="ml-1 font-bold text-sm">{post.likes}</Text>
              </TouchableOpacity>
              <View className="flex-row items-center">
                <MessageSquare size={18} color="#9ca3af" />
                <Text className="ml-1 font-bold text-sm">{post.comments.length}</Text>
              </View>
            </View>

            {/* Comment Input */}
            <View className="flex-row items-center mt-2">
              <TextInput
                className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 text-sm"
                placeholder="Add a comment..."
                value={newComment}
                onChangeText={setNewComment}
                onSubmitEditing={() => handleAddComment(post.id)}
              />
              <TouchableOpacity onPress={() => handleAddComment(post.id)} className="ml-2 bg-indigo-600 rounded-2xl p-2">
                <Send size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Floating Action Button to create post */}
      <TouchableOpacity 
        onPress={() => console.log("Create New Post")}
        className="absolute bottom-10 right-6 bg-indigo-600 w-16 h-16 rounded-full items-center justify-center shadow-lg"
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
