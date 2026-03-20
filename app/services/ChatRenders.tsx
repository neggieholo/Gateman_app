import { Ionicons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { Directory, File, Paths } from "expo-file-system";
import React, { useEffect, useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { Message } from "react-native-gifted-chat";
// import * as MediaLibrary from 'expo-media-library';


let globalSoundInstance: Audio.Sound | null = null;

// interface RenderActionsProps {
//   props: {
//     context: {
//       actionSheet: () => {
//         showActionSheetWithOptions: (
//           options: any,
//           callback: (i?: number) => void,
//         ) => void;
//       };
//     };
//     [key: string]: any; // Allows for other GiftedChat props
//   };
//   onTakePhoto: () => void;
//   onPickImage: () => void;
//   onPickDocument: () => void;
//   onPickVideo: () => void;
//   onStartRecording: () => void;
//   onStopRecording: () => void;
//   isRecording: boolean;
// }

export const renderMessage = (props: any) => {
  return (
    <View>
      <Message {...props} />
    </View>
  );
};

export const RenderMessageAudio = ({ currentMessage }: any) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying); // SYNC: UI follows actual audio state
      if (status.didJustFinish) {
        setIsPlaying(false);
        sound?.setPositionAsync(0);
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      // 1. Handle Global Overlap
      if (globalSoundInstance && globalSoundInstance !== sound) {
        await globalSoundInstance.stopAsync();
        await globalSoundInstance.unloadAsync();
        globalSoundInstance = null;
      }

      // 2. Existing Sound Toggle
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
        return;
      }

      // 3. Create New Sound (First Click)
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentMessage.audio },
        {
          shouldPlay: true,
          isLooping: false, // FORCE: No looping
        },
        onPlaybackStatusUpdate, // Use the dedicated sync function
      );

      setSound(newSound);
      globalSoundInstance = newSound;
    } catch (error) {
      console.error("Audio Error:", error);
    }
  };

  return (
    <View className="m-2">
      {currentMessage.isForwarded && (
        <View className="flex-row items-center mb-1 opacity-60 ml-2">
          <Ionicons name="arrow-redo" size={12} color="white" />
          <Text className="text-[10px] italic ml-1 font-medium text-white">
            Forwarded
          </Text>
        </View>
      )}
      <TouchableOpacity
        onPress={handlePlayPause}
        className="flex-row items-center p-3 bg-indigo-600 rounded-2xl m-2 w-48"
      >
        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="white" />
        <Text className="text-white ml-2 font-medium">
          {isPlaying ? "Playing..." : "Voice Note"}
        </Text>
        {/* Optional: You can add a duration text here later */}
      </TouchableOpacity>
    </View>
  );
};

export const renderMessageVideo = (props: any) => {
  const { currentMessage } = props;
  if (!currentMessage.video) return null;

  return (
    <View className="m-1">
      {currentMessage.isForwarded && (
        <View className="flex-row items-center mb-1 opacity-60 ml-1">
          <Ionicons name="arrow-redo" size={12} color="white" />
          <Text className="text-[10px] italic ml-1 font-medium text-white">
            Forwarded
          </Text>
        </View>
      )}
      <View className="rounded-xl overflow-hidden m-1 bg-black">
        <Video
          source={{ uri: currentMessage.video }}
          style={{ width: 220, height: 160 }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
        />
      </View>
    </View>
  );
};

export const renderCustomView = (props: any) => {
  const { currentMessage } = props;
  const handleDownloadOnly = async (message: any) => {
    // 1. Debug Log - This will now show in your terminal
    console.log("GateMan: Tapped file ->", message.file.url);

    try {
      const gateManDir = new Directory(Paths.cache, "GateMan");
      if (!gateManDir.exists) gateManDir.create();

      // 2. Force the correct name and extension
      const fileName = message.file.name || "Report.pdf";
      const localFile = new File(gateManDir, fileName);

      // 3. Logic Check: Already exists?
      if (localFile.exists) {
        Alert.alert("GateMan", "This document is already downloaded.");
        return;
      }

      // 4. Download directly to the localFile (Prevents .bin error)
      console.log("GateMan: Starting transfer...");
      const downloadedFile = await File.downloadFileAsync(
        message.file.url,
        localFile,
      );

      // 5. Final Confirmation
      if (downloadedFile.exists) {
        Alert.alert("Success", `"${fileName}" has been saved.`);
      }
    } catch (e: any) {
      console.error("GateMan Download Error:", e);
      Alert.alert("Error", "Could not save the file. Check your internet.");
    }
  };

  if (currentMessage?.file) {
    return (
      <View className="p-2 m-1 bg-white/10 rounded-xl w-64">
        {currentMessage.isForwarded && (
          <View className="flex-row items-center mb-2 opacity-60">
            <Ionicons name="arrow-redo" size={12} color="white" />
            <Text className="text-[10px] italic ml-1 font-medium text-white">
              Forwarded
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => handleDownloadOnly(currentMessage)}
          activeOpacity={0.6}
          className="flex items-center p-3 bg-white/10 rounded-lg m-2 border border-gray-200"
        >
          <Ionicons name="download-outline" size={18} color="#9ca3af" />
          <Text>{currentMessage.file.name}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return null;
};

// const saveImageToGallery = async (uri: string) => {
//   try {
//     // 1. Request Permission
//     const { status } = await MediaLibrary.requestPermissionsAsync();
//     if (status !== 'granted') {
//       Alert.alert("Permission Denied", "GateMan needs gallery access.");
//       return;
//     }

//     // 2. Use File (not Directory) for the actual image path
//     const fileName = `GateMan_${Date.now()}.jpg`;
    
//     // Paths.cache is the directory, we join it with the filename
//     const localFile = new File(Paths.cache, fileName); 

//     // 3. Download the remote image
//     // Note: The method is usually File.downloadAsync
//     await File.downloadAsync(uri, localFile);

//     // 4. Save to Gallery
//     // createAssetAsync needs a URI string, which localFile.uri provides
//     const asset = await MediaLibrary.createAssetAsync(localFile.uri);
//     await MediaLibrary.createAlbumAsync("GateMan", asset, false);

//     Alert.alert("Success", "Image saved to your gallery!");
//   } catch (error) {
//     console.error("Save Error:", error);
//     Alert.alert("Error", "Failed to save image.");
//   }
// };

export const renderMessageImage = (props: any) => {
  const { currentMessage, position } = props;
  return (
    <View className="m-1">
      {/* Forwarded Label for Images */}
      {currentMessage.isForwarded && (
        <View className="flex-row items-center mb-1 opacity-60 ml-1">
          <Ionicons
            name="arrow-redo"
            size={12}
            color={position === "right" ? "white" : "#4b5563"}
          />
          <Text
            className={`text-[10px] italic ml-1 font-medium ${
              position === "right" ? "text-white" : "text-gray-500"
            }`}
          >
            Forwarded
          </Text>
        </View>
      )}
      <TouchableOpacity
        onPress={() => {
          /* Logic for full screen preview */
        }}
      >
        <Image
          source={{ uri: props.currentMessage.image }}
          style={{ width: 200, height: 150, borderRadius: 10, margin: 3 }}
        />
      </TouchableOpacity>
    </View>
  );
};

export const renderActions = (config: any) => {
  const { showActionSheet } = config;

  const handlePress = () => {
    // 1. We add two empty strings after 'Cancel' to create the vertical lift
    const options = ["Camera", "Image", "Document", "Video", "Cancel", "", ""];

    // 2. The index of 'Cancel' remains 4.
    // Indices 5 and 6 will act as the transparent-looking padding.
    const cancelButtonIndex = 4;

    showActionSheet(
      {
        options,
        cancelButtonIndex,
        tintColor: "#4f46e5",
      },
      (buttonIndex?: number) => {
        if (buttonIndex === 0) config.onTakePhoto();
        if (buttonIndex === 1) config.onPickImage();
        if (buttonIndex === 2) config.onPickDocument();
        if (buttonIndex === 3) config.onPickVideo();
        // buttonIndex 4, 5, and 6 will just close the menu
      },
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 10,
        marginBottom: 5,
      }}
    >
      {/* Paper Clip Attachment Button */}
      <TouchableOpacity onPress={handlePress} className="p-2">
        <Ionicons name="attach-outline" size={26} color="#4f46e5" />
      </TouchableOpacity>

      {/* Microphone Audio Button */}
      <TouchableOpacity
        onLongPress={config.onStartRecording}
        onPressOut={config.onStopRecording}
        className="p-2"
      >
        <Ionicons
          name="mic"
          size={22}
          color={config.isRecording ? "#ef4444" : "#4f46e5"}
        />
      </TouchableOpacity>
    </View>
  );
};
