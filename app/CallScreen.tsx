import { router, useLocalSearchParams } from "expo-router";
import { Phone, PhoneOff } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine
} from "react-native-agora";

const AGORA_APP_ID = "YOUR_APP_ID_HERE";

export default function CallScreen() {
  const { callId, callerName, callerAvatar, callType, isIncoming, roomName } = useLocalSearchParams();
  const engine = useRef(createAgoraRtcEngine());
  const [remoteUid, setRemoteUid] = useState<number>(0); // ID of the other person
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    setupVideoSDKEngine();
    return () => {
      engine.current.leaveChannel();
      engine.current.release();
    };
  }, []);

  const setupVideoSDKEngine = async () => {
    try {
      engine.current.initialize({ appId: AGORA_APP_ID });

      // Enable video if the callType is 'video'
      if (callType === "video") {
        engine.current.enableVideo();
        engine.current.startPreview();
      }

      // Register Listeners
      engine.current.registerEventHandler({
        onJoinChannelSuccess: () => {
          setJoined(true);
          console.log("Successfully joined channel:", callId);
        },
        onUserJoined: (connection, uid) => {
          setRemoteUid(uid); // The other resident has arrived!
          console.log("Remote user joined:", uid);
        },
        onUserOffline: () => {
          setRemoteUid(0);
        },
      });

      engine.current.joinChannel("", callId as string, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });
    } catch (e) {
      console.log("Agora Error:", e);
    }
  };

  const handleHangup = async () => {
    try {
      await engine.current.leaveChannel();
      // If you add the Firestore 'active_calls' collection later,
      // you would update the status to 'ended' here.
      router.back();
    } catch (e) {
      router.back();
    }
  };

  const handleAnswer = () => {
    // The engine has already joined the channel in your useEffect,
    // so answering just means we stop the 'ringing' state (if you add sound)
    // and stay on this screen to see/hear the remote user.
    console.log("Call answered locally");
  };

  return (
    <View className="flex-row w-full justify-around px-10 mb-10">
      {isIncoming === "true" ? (
        <>
          {/* Decline Button */}
          <TouchableOpacity
            onPress={handleHangup}
            className="bg-red-500 p-5 rounded-full"
          >
            <PhoneOff color="white" size={32} />
          </TouchableOpacity>

          {/* Answer Button */}
          <TouchableOpacity
            onPress={handleAnswer}
            className="bg-green-500 p-5 rounded-full"
          >
            <Phone color="white" size={32} />
          </TouchableOpacity>
        </>
      ) : (
        /* Outgoing Hangup Button */
        <TouchableOpacity
          onPress={handleHangup}
          className="bg-red-500 p-5 rounded-full"
        >
          <PhoneOff color="white" size={32} />
        </TouchableOpacity>
      )}
    </View>
  );
}
