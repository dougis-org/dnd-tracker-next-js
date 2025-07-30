'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { createSafeTestRegExp } from '@/test-utils/secure-regexp';

interface SearchResultsProps {
  query: string;
  onClearSearch: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  section: string;
  relevance: number;
}

export default function SearchResults({ query, onClearSearch }: SearchResultsProps) {
  // Mock search results - in a real implementation, this would search through all help content
  const mockResults: SearchResult[] = [
    {
      id: 'character-creation',
      title: 'How to Create a Character',
      content: 'Step-by-step guide to building complete character sheets with stats, abilities, and equipment. Start by adding player characters or NPCs to your library.',
      category: 'Characters',
      section: 'User Guides',
      relevance: 0.9
    },
    {
      id: 'character-import',
      title: 'Character Import/Export',
      content: 'Import characters from D&D Beyond or export your characters for backup. You can paste a D&D Beyond character sheet URL or export data.',
      category: 'Characters',
      section: 'Features',
      relevance: 0.8
    },
    {
      id: 'character-saving',
      title: 'Character Not Saving',
      content: 'If character changes aren\'t being saved properly, check your internet connection, ensure you\'re logged in, and try saving again.',
      category: 'Troubleshooting',
      section: 'Troubleshooting',
      relevance: 0.7
    }
  ];

  // Filter results based on query
  const filteredResults = mockResults.filter(result =>
    result.title.toLowerCase().includes(query.toLowerCase()) ||
    result.content.toLowerCase().includes(query.toLowerCase()) ||
    result.category.toLowerCase().includes(query.toLowerCase())
  );

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const regex = createSafeTestRegExp(`(${query})`);
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">
            Search Results for &quot;{query}&quot;
          </h2>
        </div>
        <Button variant="outline" size="sm" onClick={onClearSearch}>
          <X className="h-4 w-4 mr-2" />
          Clear Search
        </Button>
      </div>

      {filteredResults.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
          </p>

          {filteredResults.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {highlightText(result.title, query)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {highlightText(result.content, query)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {result.section}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {result.category}
                  </Badge>
                  <div className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round(result.relevance * 100)}% match
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn&apos;t find any help topics matching &quot;{query}&quot;.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Try:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Using different keywords</li>
                <li>• Checking your spelling</li>
                <li>• Using more general terms</li>
                <li>• Browsing our help categories</li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={onClearSearch}
            >
              Browse All Help Topics
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t Find What You&apos;re Looking For?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you can&apos;t find the information you need, our support team is here to help.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
            <Button variant="outline" size="sm">
              Ask Community
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}