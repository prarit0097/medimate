import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleBadge } from '@/components/common/Badges';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account details and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                {user.full_name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.full_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={user.role} />
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input defaultValue={user.full_name} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue={user.email} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Phone number</Label>
                <Input defaultValue={user.phone_number || ''} />
              </div>
              <div className="space-y-2">
                <Label>Preferred language</Label>
                <Select defaultValue={user.preferred_language}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="mr">Marathi</SelectItem>
                    <SelectItem value="ta">Tamil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select defaultValue={user.timezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="America/New_York">US Eastern</SelectItem>
                    <SelectItem value="Europe/London">UK (GMT)</SelectItem>
                    <SelectItem value="Asia/Dubai">UAE (GST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button>Save changes</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <h3 className="font-semibold">Notification Preferences</h3>
            {[
              { label: 'Missed dose alerts', desc: 'Get notified when a dose is missed' },
              { label: 'Refill reminders', desc: 'Receive alerts before medications run out' },
              { label: 'Weekly adherence summary', desc: 'Get a weekly report of medication adherence' },
              { label: 'Caregiver updates', desc: 'Receive updates from caregivers' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <h3 className="font-semibold">Account Security</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button>Update password</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
