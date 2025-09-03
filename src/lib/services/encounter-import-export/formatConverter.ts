/**
 * Format conversion utilities for encounter import/export
 */

import { XMLParser } from 'fast-xml-parser';
import type { EncounterExportData } from './types';

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build XML element recursively
 */
function buildXmlElement(name: string, value: any, indent: string = ''): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return buildObjectXmlElement(name, value, indent);
  }

  if (Array.isArray(value)) {
    return buildArrayXmlElement(name, value, indent);
  }

  if (typeof value === 'string') {
    return `${indent}<${name}>${escapeXml(value)}</${name}>`;
  }

  return `${indent}<${name}>${value}</${name}>`;
}

/**
 * Build XML element for object values
 */
function buildObjectXmlElement(name: string, value: object, indent: string): string {
  const children = Object.entries(value)
    .map(([key, val]) => buildXmlElement(key, val, indent + '  '))
    .filter(Boolean)
    .join('\n');
  return `${indent}<${name}>\n${children}\n${indent}</${name}>`;
}

/**
 * Build XML element for array values
 */
function buildArrayXmlElement(name: string, value: any[], indent: string): string {
  const items = value
    .map((item, _index) => buildXmlElement(name.slice(0, -1) || 'item', item, indent + '  '))
    .join('\n');
  return `${indent}<${name}>\n${items}\n${indent}</${name}>`;
}

/**
 * Convert export data to XML format
 */
export function convertToXml(data: EncounterExportData): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${buildXmlElement('encounterExport', data)}`;
}


/**
 * Convert XML parsed values to proper types
 */
function convertTypes(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTypes);
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Handle array structures from XML parser
      if (key === 'tags' && value && typeof value === 'object' && value.tag) {
        converted[key] = Array.isArray(value.tag) ? value.tag : [value.tag];
      } else if (key === 'participants' && value && typeof value === 'object' && value.participant) {
        const participants = Array.isArray(value.participant) ? value.participant : [value.participant];
        converted[key] = participants.map(convertTypes);
      } else if (key === 'conditions' && (value === '' || value === null || value === undefined)) {
        // Handle empty conditions array
        converted[key] = [];
      } else {
        converted[key] = convertTypes(value);
      }
    }
    return converted;
  }

  if (typeof obj === 'string') {
    // Convert string booleans
    if (obj === 'true') return true;
    if (obj === 'false') return false;

    // Convert string numbers
    if (/^\d+$/.test(obj)) {
      return parseInt(obj, 10);
    }
    if (/^\d+\.\d+$/.test(obj)) {
      return parseFloat(obj);
    }
  }

  return obj;
}

/**
 * Parse XML data to JavaScript object using fast-xml-parser
 */
export function parseXmlToData(xmlString: string): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: false,
    trimValues: true,
    parseTagValue: false,
  });

  try {
    const jsonObj = parser.parse(xmlString);

    // The parser returns { encounterExport: { metadata: {...}, encounter: {...} } }
    // But we need to return the contents of encounterExport directly
    if (jsonObj && jsonObj.encounterExport) {
      return convertTypes(jsonObj.encounterExport);
    }

    return convertTypes(jsonObj);
  } catch (error) {
    console.error('XML parsing error:', error);
    throw new Error('Failed to parse XML data');
  }
}