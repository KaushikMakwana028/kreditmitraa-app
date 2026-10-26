// src/navigation/AppNavigator.jsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OtpVerificationScreen from '../screens/OtpVerificationScreen';
import DashboardScreen from '../screens/DashboardScreen';
import LoansScreen from '../screens/LoansScreen';
import ReferScreen from '../screens/ReferScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WithdrawalScreen from '../screens/WithdrawalScreen';
import ApplyLoanScreen from '../screens/ApplyLoanScreen';
import LoanDetailsScreen from '../screens/LoanDetailsScreen';

import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import PaymentScreen from '../screens/PaymentScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator with optimized configuration
function MainTabs() {
  return (
    <Tab.Navigator
      // ── Prevent tabs from unmounting ──
      screenOptions={({ route }) => ({
        headerShown: false,
        // Keep screens mounted when inactive
        unmountOnBlur: false,
        // Prevent lazy loading
        lazy: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Loans') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Refer') {
            iconName = focused ? 'gift' : 'gift-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 : 80,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.medium,
          fontSize: 11,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          unmountOnBlur: false,
        }}
      />
      <Tab.Screen
        name="Loans"
        component={LoansScreen}
        options={{
          unmountOnBlur: false,
        }}
      />
      <Tab.Screen
        name="Refer"
        component={ReferScreen}
        options={{
          unmountOnBlur: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          unmountOnBlur: false,
        }}
      />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ animation: 'none' }}
        />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{
            // Prevent MainTabs from unmounting
            gestureEnabled: false,
            headerShown: false,
            headerBackVisible: false,
          }}
        />
        <Stack.Screen name="Withdrawal" component={WithdrawalScreen} />
        <Stack.Screen name="ApplyLoan" component={ApplyLoanScreen} />
        <Stack.Screen name="LoanDetails" component={LoanDetailsScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}