import { useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
    ChannelProfileType,
    ClientRoleType,
    createAgoraRtcEngine,
    IRtcEngine,
    IRtcEngineEventHandler,
    RtcConnection,
} from "react-native-agora";

const appId = "f88ccd6f74594758b365389af88eb4c5";

export const useVoiceCall = (channelName: string) => {
  const agoraEngineRef = useRef<IRtcEngine | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const eventHandler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: () => {
        setMessage("Joined channel: " + channelName);
        setIsJoined(true);
      },
      onUserJoined: (_connection: RtcConnection, uid: number) => {
        setMessage("Remote user " + uid + " joined");
        setRemoteUid(uid);
      },
      onUserOffline: (_connection: RtcConnection, uid: number) => {
        setMessage("Remote user " + uid + " left");
        setRemoteUid(0);
      },
    };

    const setupVoiceSDKEngine = async () => {
      try {
        if (Platform.OS === "android") {
          const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          );

          if (!hasPermission) {
            const status = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
              {
                title: "Microphone Permission",
                message:
                  "GateMan needs access to your microphone for emergency calls.",
                buttonNeutral: "Ask Me Later",
                buttonNegative: "Cancel",
                buttonPositive: "OK",
              },
            );

            if (status !== PermissionsAndroid.RESULTS.GRANTED) {
              console.warn("Microphone permission denied");
              return;
            }
          }
        }

        // 2. Initialize the Engine
        if (!agoraEngineRef.current) {
          agoraEngineRef.current = createAgoraRtcEngine();
          await agoraEngineRef.current.initialize({ appId });
          agoraEngineRef.current.registerEventHandler(eventHandler);
        }
      } catch (e) {
        console.error("Agora Init Error:", e);
      }
    };

    const init = async () => {
      await setupVoiceSDKEngine();
    };
    init();

    return () => {
      agoraEngineRef.current?.leaveChannel();
      agoraEngineRef.current?.unregisterEventHandler(eventHandler);
      agoraEngineRef.current?.release();
    };
  }, [channelName]);

  const join = async (token: string = "") => {
    if (isJoined) return;
    agoraEngineRef.current?.joinChannel(token, channelName, 0, {
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      autoSubscribeAudio: true,
    });
  };

  const leave = () => {
    agoraEngineRef.current?.leaveChannel();
    setRemoteUid(0);
    setIsJoined(false);
    setMessage("Left the channel");
  };

  return { join, leave, isJoined, remoteUid, message };
};
