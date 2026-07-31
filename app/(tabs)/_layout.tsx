import { Tabs } from "expo-router";

import CustomTabBar from "@/components/navigation/CustomTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
        }}
      />

      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
        }}
      />

      <Tabs.Screen
        name="workout"
        options={{
          title: "Entrenar",
        }}
      />

      <Tabs.Screen
        name="progress"
        options={{
          title: "Progreso",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
        }}
      />
    </Tabs>
  );
}