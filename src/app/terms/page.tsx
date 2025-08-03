import { TermsOfService } from '@/components/legal/TermsOfService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {Metadata} from "next";

export default function TermsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Terms of Service</CardTitle>
        </CardHeader>
        <CardContent>
          <TermsOfService />
        </CardContent>
      </Card>
    </div>
  );
}

export const metadata: Metadata = {
  title: 'Terms of Service | D&D Encounter Tracker',
  description: 'Terms of Service for D&D Encounter Tracker - the modern tool for managing combat encounters.',
};