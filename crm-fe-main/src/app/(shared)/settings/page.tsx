"use client";

import { useAuth } from "@/providers/auth-provider";
import { User, Lock, Bell, Palette, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "@/components/settings/profile-form";
import { SecurityForm } from "@/components/settings/security-form";
import { NotificationsForm } from "@/components/settings/notifications-form";
import { AppearanceForm } from "@/components/settings/appearance-form";
import EmailSettingsForm from "@/components/settings/email-settings-form";
import { ListPageLayout } from "@/components/shared/list-page-layout";

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <ListPageLayout
      title="Settings"
      description="Manage your account preferences"
      breadcrumbs={[{ label: "Settings" }]}
    >
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full lg:w-[500px] grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">
            <span className="hidden sm:inline">Alerts</span>
            <span className="sm:hidden">
              <Bell className="w-4 h-4" />
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileForm />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityForm />
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <EmailSettingsForm />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <AppearanceForm />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsForm />
        </TabsContent>
      </Tabs>
    </ListPageLayout>
  );
}
