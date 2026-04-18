import React, { useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import AgoraUIKit from 'agora-rn-uikit';

const AGORA_APP_ID = 'f88ccd6f74594758b365389af88eb4c5'; 

export const useCallService = () => {
  const [inCall, setInCall] = useState(false);
  const [callSettings, setCallSettings] = useState({
    channel: '',
    videoMode: true,
  });

  const startCall = (channelName: string, isVideo: boolean = true) => {
    const cleanChannel = channelName.replace(/\s+/g, '_');
    setCallSettings({ channel: cleanChannel, videoMode: isVideo });
    setInCall(true);
  };

  const CallOverlay = () => {
    if (!inCall) return null;

    return (
      <Modal visible={inCall} animationType="fade" transparent={false}>
        <View style={styles.container}>
          <AgoraUIKit 
            connectionData={{
              appId: AGORA_APP_ID,
              channel: callSettings.channel,
              // If you get a token error, just remove the line below entirely 
              // while in Test Mode.
            }} 
            rtcCallbacks={{
              EndCall: () => setInCall(false),
            }}
            styleProps={{
              // Use basic theme color
              theme: '#4f46e5',
              // Move background color to the wrapper View to avoid UIKit prop errors
            }}
          />
        </View>
      </Modal>
    );
  };

  return { startCall, CallOverlay, inCall };
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
});