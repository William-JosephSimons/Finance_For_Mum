import { Tabs } from "expo-router";
import { View, Text } from "react-native";

// Simple icon components for tabs (no external dependencies)
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: "⬡",
    list: "☰",
    calendar: "📅",
    insights: "📊",
    contacts: "👥",
  };

  return (
    <View className="items-center justify-center">
      <Text className={`text-2xl ${focused ? "text-accent" : "text-muted"}`}>
        {icons[name]}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: 90,
          paddingBottom: 30,
          paddingTop: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        tabBarActiveTintColor: "#000000",
        tabBarInactiveTintColor: "#A1A1AA",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="list" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Bills",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="calendar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="insights" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="payid"
        options={{
          title: "PayID",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="contacts" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
