import { Audio } from 'expo-av';
import * as KeepAwake from 'expo-keep-awake'; 

let soundObject: Audio.Sound | null = null;

export const startEmergencyAlarm = async () => {
  try {
    await KeepAwake.activateKeepAwakeAsync();
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/emergency_alarm.mp3'),
      { isLooping: true, shouldPlay: true, volume: 1.0 }
    );
    soundObject = sound;
  } catch (e) {
    console.log("Alarm error:", e);
  }
};

export const stopEmergencyAlarm = async () => {
  if (soundObject) {
    await soundObject.stopAsync();
    await soundObject.unloadAsync();
    soundObject = null;
  }
  await KeepAwake.deactivateKeepAwake();
};