import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { router, usePathname } from "expo-router"; 
import { View, TouchableOpacity, Image } from "react-native";
import { Bell, HelpCircle, LogOut } from "lucide-react-native";

function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 60 }}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Image 
          source={require("../../assets/images/gateman_bgimage.png")} 
          style={{ width: 80, height: 80, borderRadius: 10 }} 
        />
      </View>

      <DrawerItem
        label="Help"
        icon={() => <HelpCircle size={20} color="#6366f1" />}
        onPress={() => {}} 
      />

      <DrawerItem
        label="Logout"
        icon={() => <LogOut size={20} color="#ef4444" />}
        onPress={() => router.replace("/")}
      />
    </DrawerContentScrollView>
  );
}

export default function AppLayout() {
  const pathname = usePathname();

  // Check if we are on the dashboard
  const isDashboard = pathname === "/dashboard" || pathname === "/(tabs)" || pathname === "/";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          drawerStyle: { width: 260 },
          headerTitleAlign: 'center', // 1. Force alignment to center for all titles
          headerRight: () => {
            // 2. Only render the Bell component on the Dashboard
            if (isDashboard) {
              return (
                <TouchableOpacity style={{ marginRight: 16 }} onPress={() => {}}>
                  <Bell size={24} color="#000" />
                </TouchableOpacity>
              );
            }
            // 3. Return a View with the same width as the Bell icon 
            // to keep the title perfectly centered on other pages
            return <View style={{ width: 40, marginRight: 16 }} />;
          },
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerItemStyle: { display: "none" },
            // 4. REMOVED headerTitle: "" here so screen titles can bubble up
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}