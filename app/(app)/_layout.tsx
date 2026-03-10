import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";
import { router, usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Bell, HelpCircle, LogOut, X } from "lucide-react-native";
import { useContext } from "react";
import { Image, TouchableOpacity, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserContext } from "../UserContext";
import CookieManager from '@react-native-cookies/cookies';

function CustomDrawerContent(props: any) {
const { setUser, setSessionId } = useContext(UserContext);
const router = useRouter();

const logout = async () => {
  try {

    await CookieManager.clearAll(); 
    
    setUser(null);
    router.replace("/");
  } catch (e) {
    console.error("Logout failed", e);
  }
};
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 60 }}
    >
      <View className="w-full z-50 flex-row justify-end px-2">
        <TouchableOpacity
          onPress={() => props.navigation.dispatch(DrawerActions.closeDrawer())}
          className="bg-black/20 p-2 rounded-full mb-4"
        >
          <X size={20} color="white" />
        </TouchableOpacity>
      </View>
      <View className="flex items-center justify-start">
        <Image
          source={require("../../assets/images/gateman_w_nobg_cropped copy.png")}
          style={{ borderRadius: 10 }}
          className="w-full h-16 mb-4 mt-5"
        />
      </View>

      <View className="h-16" />

      <DrawerItem
        label="Help"
        labelStyle={{ color: "white", fontSize: 16, fontWeight: "bold" }}
        icon={() => <HelpCircle size={30} color="white" />}
        onPress={() => {}}
      />

      <DrawerItem
        label="Logout"
        labelStyle={{ color: "white", fontSize: 16, fontWeight: "bold" }}
        icon={() => <LogOut size={30} color="#ef4444" />}
        onPress={() => router.replace("/")}
      />
    </DrawerContentScrollView>
  );
}

export default function AppLayout() {
  const pathname = usePathname();
  const { badgeCount } = useContext(UserContext);

  const getHeaderTitle = () => {
    if (pathname.includes("community")) return "Community";
    if (pathname.includes("events")) return "Events";
    if (pathname.includes("guests")) return "Guests";
    if (pathname.includes("invoices")) return "Invoices";
    return "";
  };
  const isDashboard = pathname.includes("dashboard");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          drawerStyle: { width: 260, backgroundColor: "#2563eb" },
          headerTitleAlign: "center",
          headerTitle: getHeaderTitle(),
          headerStyle: {
            backgroundColor: "#2563eb",
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            color: "#ffffff",
            fontWeight: "bold",
          },
          headerRight: () => {
            if (isDashboard) {
              return (
                <TouchableOpacity
                  style={{ marginRight: 16 }}
                  onPress={() => {router.push("/NotificationsPage")}}
                >
                  <Bell size={24} color="#ffffff" />
                  {badgeCount > 0 && (
                    <View
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full flex items-center justify-center border-2 border-[#36AA8F]"
                      style={{ minWidth: 20, height: 20, paddingHorizontal: 4 }}
                    >
                      <Text className="text-white text-[10px] font-bold">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }
            return <View style={{ width: 40, marginRight: 16 }} />;
          },
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
