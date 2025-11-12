'use server';

import { db } from '../db/client';
import { urlEnrichments, urls } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Validation schema for enrichment updates
 */
const enrichmentSchema = z.object({
  notes: z.string().optional(),
  customIdentifiers: z.array(z.string()).optional(),
});

/**
 * Update or create enrichment for a URL
 */
export async function updateEnrichment(
  urlId: number,
  data: {
    notes?: string;
    customIdentifiers?: string[];
  }
) {
  try {
    // Validate input
    const validatedData = enrichmentSchema.parse(data);
    
    // Check if URL exists
    const url = await db.query.urls.findFirst({
      where: eq(urls.id, urlId),
    });
    
    if (!url) {
      return {
        success: false,
        error: 'URL not found',
      };
    }
    
    // Check if enrichment exists
    const existing = await db.query.urlEnrichments.findFirst({
      where: eq(urlEnrichments.urlId, urlId),
    });
    
    if (existing) {
      // Update existing enrichment
      const [updated] = await db
        .update(urlEnrichments)
        .set({
          ...validatedData,
          updatedAt: new Date(),
          reviewedAt: new Date(),
        })
        .where(eq(urlEnrichments.id, existing.id))
        .returning();
      
      return {
        success: true,
        data: updated,
      };
    } else {
      // Create new enrichment
      const [created] = await db
        .insert(urlEnrichments)
        .values({
          urlId,
          ...validatedData,
          reviewedAt: new Date(),
        })
        .returning();
      
      return {
        success: true,
        data: created,
      };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`,
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating enrichment',
    };
  }
}

/**
 * Add an identifier to a URL's custom identifiers
 */
export async function addIdentifier(urlId: number, identifier: string) {
  try {
    if (!identifier || identifier.trim() === '') {
      return {
        success: false,
        error: 'Identifier cannot be empty',
      };
    }
    
    // Get existing enrichment or create new
    const existing = await db.query.urlEnrichments.findFirst({
      where: eq(urlEnrichments.urlId, urlId),
    });
    
    const currentIdentifiers = existing?.customIdentifiers || [];
    
    // Check if identifier already exists
    if (currentIdentifiers.includes(identifier.trim())) {
      return {
        success: false,
        error: 'Identifier already exists',
      };
    }
    
    const newIdentifiers = [...currentIdentifiers, identifier.trim()];
    
    return updateEnrichment(urlId, {
      customIdentifiers: newIdentifiers,
      notes: existing?.notes || undefined,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error adding identifier',
    };
  }
}

/**
 * Remove an identifier from a URL's custom identifiers
 */
export async function removeIdentifier(urlId: number, identifier: string) {
  try {
    const existing = await db.query.urlEnrichments.findFirst({
      where: eq(urlEnrichments.urlId, urlId),
    });
    
    if (!existing || !existing.customIdentifiers) {
      return {
        success: false,
        error: 'No identifiers found for this URL',
      };
    }
    
    const newIdentifiers = existing.customIdentifiers.filter(id => id !== identifier);
    
    return updateEnrichment(urlId, {
      customIdentifiers: newIdentifiers,
      notes: existing.notes || undefined,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error removing identifier',
    };
  }
}

/**
 * Delete enrichment for a URL
 */
export async function deleteEnrichment(urlId: number) {
  try {
    const existing = await db.query.urlEnrichments.findFirst({
      where: eq(urlEnrichments.urlId, urlId),
    });
    
    if (!existing) {
      return {
        success: false,
        error: 'No enrichment found for this URL',
      };
    }
    
    await db.delete(urlEnrichments).where(eq(urlEnrichments.id, existing.id));
    
    return {
      success: true,
      data: { deleted: true },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error deleting enrichment',
    };
  }
}

/**
 * Bulk delete enrichments for multiple URLs
 */
export async function bulkDeleteEnrichments(urlIds: number[]) {
  try {
    if (urlIds.length === 0) {
      return {
        success: false,
        error: 'No URLs provided',
      };
    }
    
    const deleted = await db.transaction(async (tx) => {
      let count = 0;
      
      for (const urlId of urlIds) {
        const existing = await tx.query.urlEnrichments.findFirst({
          where: eq(urlEnrichments.urlId, urlId),
        });
        
        if (existing) {
          await tx.delete(urlEnrichments).where(eq(urlEnrichments.id, existing.id));
          count++;
        }
      }
      
      return count;
    });
    
    return {
      success: true,
      data: { deleted },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error bulk deleting enrichments',
    };
  }
}

/**
 * Get enrichment for a URL
 */
export async function getEnrichment(urlId: number) {
  try {
    const enrichment = await db.query.urlEnrichments.findFirst({
      where: eq(urlEnrichments.urlId, urlId),
    });
    
    return {
      success: true,
      data: enrichment || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching enrichment',
    };
  }
}

/**
 * Get enrichments for multiple URLs
 */
export async function getEnrichmentsForUrls(urlIds: number[]) {
  try {
    if (urlIds.length === 0) {
      return {
        success: true,
        data: {},
      };
    }

    const enrichments = await db.query.urlEnrichments.findMany({
      where: inArray(urlEnrichments.urlId, urlIds),
    });

    // Map by urlId for easy lookup
    const enrichmentMap = enrichments.reduce((acc, enrichment) => {
      acc[enrichment.urlId] = enrichment;
      return acc;
    }, {} as Record<number, typeof enrichments[0]>);

    return {
      success: true,
      data: enrichmentMap,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching enrichments',
    };
  }
}
