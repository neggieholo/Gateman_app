import React, { useState, useRef } from 'react';
import { Modal, View, StyleSheet, Alert, Linking, Platform } from 'react-native';
import AgoraUIKit from 'agora-rn-uikit';
import createAgoraRtcEngine, { ChannelProfileType, ClientRoleType } from 'react-native-agora';

const AGORA_APP_ID = 'f88ccd6f74594758b365389af88eb4c5'; 

export const useEmergencyCall = () => {
  const [inCall, setInCall] = useState(false);
  const [isVoipOnly, setIsVoipOnly] = useState(true); // Toggle for internet vs cellular
  const [callSettings, setCallSettings] = useState({
    channel: '',
    uid: Math.floor(Math.random() * 1000),
    token: '', // Leave empty if token is disabled in Agora Console
  });

  const engine = useRef<any>(null);

  // --- OPTION 1: INTERNET VOIP (FREE) ---
  const startVoipCall = async (channelName: string) => {
    const cleanChannel = channelName.replace(/\s+/g, '_');
    setCallSettings(prev => ({ ...prev, channel: cleanChannel }));
    setIsVoipOnly(true);
    setInCall(true);
  };

  // --- OPTION 2: CELLULAR CALL (FUTURE UPGRADE) ---
  const startCellularCall = (phoneNumber: string) => {
    // In the future, this would hit your Agora SIP Gateway
    // For now, it just opens the phone dialer
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "Phone calls are not supported on this device.");
      }
    });
  };

  // --- OPTION 3: RAW ENGINE HANDLER (BACKGROUND RINGING) ---
  const initializeRawEngine = async (channelName: string) => {
    if (!engine.current) {
      engine.current = createAgoraRtcEngine();
      engine.current.initialize({ appId: AGORA_APP_ID });
    }

    engine.current.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
    engine.current.joinChannel(
      callSettings.token,
      channelName,
      callSettings.uid,
      { clientRoleType: ClientRoleType.ClientRoleBroadcaster }
    );
  };

 const CallOverlay = () => {
    if (!inCall) return null;

    return (
      <Modal visible={inCall} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {isVoipOnly ? (
            <AgoraUIKit 
              connectionData={{
                appId: AGORA_APP_ID,
                channel: callSettings.channel,
              }} 
              // Some versions of the UI Kit take uid as a top-level prop
              // uid={callSettings.uid} 
              rtcCallbacks={{
                EndCall: () => {
                  setInCall(false);
                  if (engine.current) engine.current.leaveChannel();
                },
              }}
              styleProps={{
                // Changed theme to just the primary color string
                theme: '#ef4444', 
                // Using 'videoMode' or 'localVideoStyle' if needed, 
                // but removing 'fullViewContainer' to clear the error.
              }}
            />
          ) : (
            <View style={styles.fallback}>
               {/* UI for future PSTN/Cellular fallback */}
            </View>
          )}
        </View>
      </Modal>
    );
  };

  return { startVoipCall, startCellularCall, CallOverlay, inCall };
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b'
  }
});