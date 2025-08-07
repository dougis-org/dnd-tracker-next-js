import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShareIcon } from 'lucide-react';
import { ShareLinkSection } from './sharing/ShareLinkSection';
import { CollaboratorSection } from './sharing/CollaboratorSection';
import { ShareSettingsSection } from './sharing/ShareSettingsSection';
import { useCollaborators } from '@/lib/hooks/useCollaborators';
import type { Encounter } from '@/lib/validations/encounter';

interface SharingSectionProps {
  encounter: Encounter;
}

/**
 * Encounter sharing and collaboration features
 */
export function SharingSection({ encounter }: SharingSectionProps) {
  const [showShareLink, setShowShareLink] = useState(false);
  const {
    newCollaboratorEmail,
    showAddCollaborator,
    setNewCollaboratorEmail,
    handleToggleAdd,
    handleAddCollaborator,
    handleRemoveCollaborator,
  } = useCollaborators();

  const handleGenerateShareLink = () => {
    setShowShareLink(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShareIcon className="h-4 w-4 mr-2" />
          Share Encounter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visibility Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Visibility</span>
          <Badge variant={encounter.isPublic ? 'default' : 'secondary'}>
            {encounter.isPublic ? 'Public' : 'Private'}
          </Badge>
        </div>

        {/* Share Link Generation */}
        <div className="space-y-2">
          <ShareLinkSection
            encounterId={encounter._id || ''}
            showShareLink={showShareLink}
            onGenerateLink={handleGenerateShareLink}
          />
        </div>

        {/* Collaborators */}
        <CollaboratorSection
          encounter={encounter}
          showAddCollaborator={showAddCollaborator}
          newCollaboratorEmail={newCollaboratorEmail}
          onToggleAdd={handleToggleAdd}
          onEmailChange={setNewCollaboratorEmail}
          onAddCollaborator={handleAddCollaborator}
          onRemoveCollaborator={handleRemoveCollaborator}
        />

        {/* Share Settings */}
        <ShareSettingsSection />
      </CardContent>
    </Card>
  );
}