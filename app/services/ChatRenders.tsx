import { Ionicons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { Directory, File, Paths } from "expo-file-system";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

export const RenderMessageAudio = ({ currentMessage, position }: any) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const isRight = position === "right";

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
        if (globalSoundInstance === sound) {
          globalSoundInstance = null;
        }
      }
    };
  }, [sound]);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        // Unload if you want to save memory, or just reset position
        sound?.setPositionAsync(0);
      }
    } else if (status.error) {
      console.error(`Playback Error: ${status.error}`);
    }
  };

  // Inside RenderMessageAudio
  const handlePlayPause = async () => {
    try {
      // 1. Handle Global Overlap safely
      if (globalSoundInstance && globalSoundInstance !== sound) {
        try {
          const status = await globalSoundInstance.getStatusAsync();
          if (status.isLoaded) {
            await globalSoundInstance.stopAsync();
            await globalSoundInstance.unloadAsync();
          }
        } catch (e) {
          // Sound was already unloaded elsewhere, ignore error
        }
        globalSoundInstance = null;
      }

      // 2. Existing Sound Toggle
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
          } else {
            // If it finished, restart from 0
            if (
              status.didJustFinish ||
              status.positionMillis === status.durationMillis
            ) {
              await sound.setPositionAsync(0);
            }
            await sound.playAsync();
          }
          return;
        } else {
          // Sound exists in state but is not loaded in memory, clear it to re-create
          setSound(null);
        }
      }

      // 3. Create New Sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentMessage.audio },
        { shouldPlay: true },
        onPlaybackStatusUpdate,
      );

      setSound(newSound);
      globalSoundInstance = newSound;
    } catch (error) {
      console.error("Audio Error:", error);
      // Reset state so user can try tapping again
      setSound(null);
      setIsPlaying(false);
    }
  };

  return (
    <View className="m-2">
      {currentMessage.isForwarded && (
        <View className="flex-row items-center mb-1 opacity-60 ml-2">
          <Ionicons name="arrow-redo" size={12} color="white" />
          <Text
            className={`text-[10px] italic ml-1 font-medium ${
              position === "right" ? "text-white" : "text-gray-500"
            }`}
          >
            Forwarded
          </Text>
        </View>
      )}
      {currentMessage.pending ? (
        // SHOW SPINNER WHILE UPLOADING
        <View className="flex-row items-center p-1">
          <ActivityIndicator
            size="small"
            color={isRight ? "white" : "#4b5563"}
          />
          <Text
            className={`text-[10px] ml-2 font-bold ${isRight ? "text-white" : "text-gray-600"}`}
          >
            Sending voice...
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handlePlayPause}
          className="flex-row items-center p-3 bg-indigo-600 rounded-2xl m-2 w-48"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="white"
          />
          <Text className="text-white ml-2 font-medium">
            {isPlaying ? "Playing..." : "Voice Note"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const renderCustomView = (props: any) => {
  const { currentMessage, position } = props;
  const isRight = position === "right";
  const handleDownloadOnly = async (message: any) => {
    console.log("GateMan: Tapped file ->", message.file.url);

    try {
      const gateManDir = new Directory(Paths.cache, "GateMan");
      if (!gateManDir.exists) gateManDir.create();

      const fileName = message.file.name || "Report.pdf";
      const localFile = new File(gateManDir, fileName);

      if (localFile.exists) {
        Alert.alert("GateMan", "This document is already downloaded.");
        return;
      }

      console.log("GateMan: Starting transfer...");
      const downloadedFile = await File.downloadFileAsync(
        message.file.url,
        localFile,
      );

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
          onPress={() => handleDownloadOnly(currentMessage)}
          disabled={currentMessage.pending}
          activeOpacity={0.6}
          className="flex items-center p-3 bg-white/10 rounded-lg m-2 border border-gray-200"
        >
          {currentMessage.pending ? (
            <ActivityIndicator
              size="small"
              color={isRight ? "white" : "#4b5563"}
              className="mr-2"
            />
          ) : (
            <Ionicons
              name="document-text-outline"
              size={18}
              color={isRight ? "white" : "#9ca3af"}
              className="mr-2"
            />
          )}

          <Text
            numberOfLines={1}
            className={`flex-1 text-sm font-medium ${isRight ? "text-white" : "text-gray-800"}`}
          >
            {currentMessage.pending
              ? "Uploading file..."
              : currentMessage.file.name}
          </Text>

          {!currentMessage.pending && (
            <Ionicons
              name="download-outline"
              size={16}
              color={isRight ? "white" : "#9ca3af"}
            />
          )}
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
  const { currentMessage, position, onOpen } = props;
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
      <TouchableOpacity onPress={() => onOpen(currentMessage.image)}>
        <Image
          source={{ uri: currentMessage.image }}
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

export const RenderMessageImage = (props: any) => {
  const { currentMessage, onOpen, position } = props;

  return (
    <View className="m-1">
      {/* Forwarded Label - Styled exactly like the video one */}
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
        onPress={() => onOpen(currentMessage.image)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: currentMessage.image }}
          style={{
            width: 200,
            height: 150,
            borderRadius: 13,
            margin: 3,
          }}
          resizeMode="cover"
        />
      </TouchableOpacity>
      {currentMessage.pending && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator
            size="small"
            color={position === "right" ? "#fff" : "#4b5563"}
          />
          <Text
            className={`text-[10px] mt-1 font-bold ${
              position === "right" ? "text-white" : "text-gray-600"
            }`}
          >
            Sending...
          </Text>
        </View>
      )}
    </View>
  );
};

export const RenderMessageVideoComponent = (props: any) => {
  const { currentMessage, onOpen, position } = props;

  return (
    <View className="m-1">
      {/* Forwarded Label - keeping it consistent with your images */}
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
        onPress={() => onOpen(currentMessage.video)}
        activeOpacity={0.8}
        className="rounded-xl overflow-hidden m-1 bg-black relative"
      >
        {/* The Thumbnail (Static Video) */}
        <Video
          source={{ uri: currentMessage.video }}
          style={{ width: 220, height: 160 }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isMuted={true}
        />

        {/* Play Icon Overlay so they know to tap */}
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <Ionicons name="play-circle" size={50} color="white" />
        </View>
      </TouchableOpacity>
      {currentMessage.pending && (
        <View className="items-center">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white text-[10px] mt-2 font-bold">
            Sending Video...
          </Text>
        </View>
      )}
    </View>
  );
};
