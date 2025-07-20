import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Shield, Sword, Gem } from 'lucide-react';
import SubscriptionTierItem from './tiers/SubscriptionTierItem';

const SUBSCRIPTION_TIERS = [
  {
    icon: Shield,
    iconColor: "text-green-500",
    title: "Free Adventurer",
    price: "$0/month",
    features: [
      "1 Party (up to 6 characters)",
      "3 Saved Encounters",
      "10 Custom Creatures",
      "Basic Combat Tracking",
      "Standard Support"
    ]
  },
  {
    icon: Sword,
    iconColor: "text-blue-500",
    title: "Expert Dungeon Master",
    price: "$9.99/month",
    features: [
      "10 Parties",
      "50 Saved Encounters",
      "200 Custom Creatures",
      "Advanced Combat Features",
      "Campaign Management",
      "Priority Support"
    ]
  },
  {
    icon: Gem,
    iconColor: "text-purple-500",
    title: "Guild Master",
    price: "$39.99/month",
    features: [
      "Unlimited Everything",
      "Multi-Campaign Management",
      "Team Collaboration",
      "Advanced Analytics",
      "API Access",
      "White-label Options"
    ]
  }
];

export default function SubscriptionTiersCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Subscription Tiers
        </CardTitle>
        <CardDescription>
          Feature availability across different subscription levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUBSCRIPTION_TIERS.map((tier, index) => (
            <SubscriptionTierItem key={index} {...tier} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}