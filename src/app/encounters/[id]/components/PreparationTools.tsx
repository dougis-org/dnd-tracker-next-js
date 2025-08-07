import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import type { Encounter } from '@/lib/validations/encounter';

interface PreparationToolsProps {
  encounter: Encounter;
}

interface PreparationItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}

interface ProgressDisplayProps {
  completedItems: number;
  totalItems: number;
  progressPercentage: number;
  status: string;
  statusColor: string;
}

/**
 * Display preparation progress
 */
function ProgressDisplay({ completedItems, totalItems, progressPercentage, status, statusColor }: ProgressDisplayProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Preparation Progress</span>
        <span className={statusColor}>{status}</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
      <p className="text-xs text-muted-foreground text-center">
        {completedItems}/{totalItems} Complete
      </p>
    </div>
  );
}

interface ChecklistItemProps {
  item: PreparationItem;
  onToggle: (_itemId: string) => void;
}

/**
 * Individual checklist item
 */
function ChecklistItem({ item, onToggle }: ChecklistItemProps) {
  return (
    <div className="flex items-center space-x-3">
      <Checkbox
        id={item.id}
        checked={item.completed}
        onCheckedChange={() => onToggle(item.id)}
      />
      <label
        htmlFor={item.id}
        className={`text-sm cursor-pointer flex-1 ${
          item.completed ? 'line-through text-muted-foreground' : ''
        }`}
      >
        {item.label}
        {item.required && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </label>
    </div>
  );
}

/**
 * Generate preparation status based on completion
 */
function getPreparationStatus(checklist: PreparationItem[], completedItems: number, totalItems: number) {
  const requiredCompleted = checklist
    .filter(item => item.required)
    .every(item => item.completed);

  if (requiredCompleted && completedItems === totalItems) return 'Fully Prepared';
  if (requiredCompleted) return 'Ready to Start';
  return 'Needs Preparation';
}

/**
 * Get status color based on preparation status
 */
function getStatusColor(status: string): string {
  if (status === 'Fully Prepared') return 'text-green-600';
  if (status === 'Ready to Start') return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Encounter preparation checklist and tools to help DMs ready encounters for play
 */
export function PreparationTools({ encounter: _encounter }: PreparationToolsProps) {
  const [checklist, setChecklist] = useState<PreparationItem[]>([
    {
      id: 'participants',
      label: 'Verify participant stats',
      completed: false,
      required: true,
    },
    {
      id: 'initiative',
      label: 'Set initiative order',
      completed: false,
      required: false,
    },
    {
      id: 'notes',
      label: 'Review encounter notes',
      completed: false,
      required: false,
    },
    {
      id: 'environment',
      label: 'Prepare environment and terrain',
      completed: false,
      required: false,
    },
    {
      id: 'objectives',
      label: 'Define victory conditions',
      completed: false,
      required: false,
    },
  ]);

  const completedItems = checklist.filter(item => item.completed).length;
  const totalItems = checklist.length;
  const progressPercentage = (completedItems / totalItems) * 100;

  const toggleItem = (itemId: string) => {
    setChecklist(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  };

  const status = getPreparationStatus(checklist, completedItems, totalItems);
  const statusColor = getStatusColor(status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preparation Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <ProgressDisplay
          completedItems={completedItems}
          totalItems={totalItems}
          progressPercentage={progressPercentage}
          status={status}
          statusColor={statusColor}
        />

        {/* Checklist Items */}
        <div className="space-y-3">
          {checklist.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              onToggle={toggleItem}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Quick Actions</p>
          <div className="space-y-1">
            <button className="text-xs text-blue-600 hover:underline block">
              Roll initiative for all
            </button>
            <button className="text-xs text-blue-600 hover:underline block">
              Reset all HP to max
            </button>
            <button className="text-xs text-blue-600 hover:underline block">
              Clear all conditions
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="pt-3 border-t">
          <p className="text-xs font-medium mb-1">Preparation Tips</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Have backup plans for different scenarios</li>
            <li>• Review monster abilities and special rules</li>
            <li>• Prepare descriptions for key moments</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}