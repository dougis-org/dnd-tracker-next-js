'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import GettingStartedSection from './GettingStartedSection';
import UserGuidesSection from './UserGuidesSection';
import FAQSection from './FAQSection';
import FeaturesSection from './FeaturesSection';
import TroubleshootingSection from './TroubleshootingSection';
import ContactSupportSection from './ContactSupportSection';
import SearchResults from './SearchResults';

const HELP_TABS = [
  { value: 'getting-started', label: 'Getting Started', component: GettingStartedSection },
  { value: 'user-guides', label: 'User Guides', component: UserGuidesSection },
  { value: 'faq', label: 'FAQ', component: FAQSection },
  { value: 'features', label: 'Features', component: FeaturesSection },
  { value: 'troubleshooting', label: 'Troubleshooting', component: TroubleshootingSection },
  { value: 'contact-support', label: 'Contact Support', component: ContactSupportSection }
];

export default function HelpContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('getting-started');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <Card data-testid="help-main-card">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Help & Support</CardTitle>
        <CardDescription>
          D&D Encounter Tracker Documentation - Your comprehensive guide to using the D&D Encounter Tracker for managing characters, encounters, and combat sessions.
        </CardDescription>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
            aria-label="Search help topics"
          />
        </div>
      </CardHeader>

      <CardContent>
        {searchQuery ? (
          <SearchResults query={searchQuery} onClearSearch={clearSearch} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {HELP_TABS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-6" data-testid="help-content">
              <div className="prose prose-slate max-w-none">
                {HELP_TABS.map(tab => {
                  const Component = tab.component;
                  return (
                    <TabsContent key={tab.value} value={tab.value}>
                      <Component />
                    </TabsContent>
                  );
                })}
              </div>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}