'use client';

import { useState } from 'react';
import { Trash2, X, Eye, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface BatchActionsProps {
  selectedCount: number;
  selectedParties: string[];
  onClearSelection: () => void;
  onRefetch: () => void;
}

export function BatchActions({ selectedCount, selectedParties, onClearSelection, onRefetch }: BatchActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const handleBulkDelete = async () => {
    try {
      // Delete each party individually using the existing API
      const deletePromises = selectedParties.map(async (partyId) => {
        const response = await fetch(`/api/parties/${partyId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || `Failed to delete party ${partyId}`);
        }

        return response.json();
      });

      // Wait for all deletions to complete
      await Promise.all(deletePromises);

      // Call refetch and clear selection
      onRefetch();
      onClearSelection();

      // Show success toast
      toast({
        title: 'Parties deleted',
        description: `${selectedCount} parties have been deleted successfully.`,
      });

      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Delete parties error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete parties. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleBulkEdit = async () => {
    try {
      console.log('Bulk edit selected parties');

      toast({
        title: 'Bulk edit started',
        description: `Editing ${selectedCount} parties...`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to edit parties. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkView = async () => {
    try {
      console.log('Bulk view selected parties');

      toast({
        title: 'Opening party view',
        description: `Viewing ${selectedCount} parties...`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to view parties. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium">
                {selectedCount} {selectedCount === 1 ? 'party' : 'parties'} selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkView}
                  disabled={selectedCount === 0}
                  aria-label="View selected parties"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkEdit}
                  disabled={selectedCount === 0}
                  aria-label="Edit selected parties"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={selectedCount === 0}
                  className="text-destructive hover:text-destructive"
                  aria-label="Delete selected parties"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              aria-label="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parties</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} {selectedCount === 1 ? 'party' : 'parties'}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}