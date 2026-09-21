import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Compass, Heart, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useExperience } from '@/lib/questionnaire';
import { Page, Loading, Feedback, Action } from '@/components/questionnaire/ui';
export default function DatingLayout(){const {colors}=useTheme(),q=useExperience();if(q.isPending)return <Page title="Strathspace"><Loading/></Page>;if(q.isError)return <Page title="Strathspace"><Feedback error={q.error}/><Action label="Try again" onPress={()=>q.refetch()}/></Page>;if(!q.data?.shell)return <Redirect href="/(tabs)"/>;return <Tabs screenOptions={{headerShown:false,tabBarActiveTintColor:colors.primary,tabBarInactiveTintColor:colors.mutedForeground,tabBarStyle:{backgroundColor:colors.background,borderTopColor:colors.border}}}><Tabs.Screen name="index" options={{title:'Discover',tabBarIcon:({color,size})=><Compass color={color} size={size}/>}}/><Tabs.Screen name="likes" options={{title:'Likes',tabBarIcon:({color,size})=><Heart color={color} size={size}/>}}/><Tabs.Screen name="messages" options={{title:'Messages',tabBarIcon:({color,size})=><MessageCircle color={color} size={size}/>}}/><Tabs.Screen name="profile" options={{title:'Profile',tabBarIcon:({color,size})=><User color={color} size={size}/>}}/></Tabs>;}
