import { PrivacyPolicy } from '@/components/legal/PrivacyPolicy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {Metadata} from "next";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <PrivacyPolicy />
        </CardContent>
      </Card>
    </div>
  );
}

export const metadata : Metadata = {
  title: 'Privacy Policy | D&D Encounter Tracker',
  description: 'Privacy Policy for D&D Encounter Tracker - learn how we protect your data.',
};