import { ActivityFailure, ApplicationFailure, log, proxyActivities } from '@temporalio/workflow';
import { deduplicateHotels } from '../services/deduplicate-hotels.js';
import type { HotelResult, HotelWorkflowInput } from '../types/hotel.js';
import type * as activities from './activities.js';

const { fetchSupplierAHotels, fetchSupplierBHotels } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  retry: {
    initialInterval: '500 milliseconds',
    backoffCoefficient: 2,
    maximumInterval: '5 seconds',
    maximumAttempts: 3,
  },
});

export async function hotelOrchestrationWorkflow(
  input: HotelWorkflowInput,
): Promise<HotelResult[]> {
  const { city } = input;
  log.info('Hotel workflow started', { city });
  try {
    const pending = [fetchSupplierAHotels(city), fetchSupplierBHotels(city)];
    log.info('Supplier activities scheduled', { city, supplierCount: pending.length });
    const results = await Promise.all(pending);
    const offers = deduplicateHotels(results.flat());
    log.info('Hotel workflow completed', { city, hotelCount: offers.length });
    return offers;
  } catch (error) {
    const cause = error instanceof ActivityFailure ? error.cause : error;
    log.error('Hotel workflow failed', {
      city,
      activity: error instanceof ActivityFailure ? error.activityType : undefined,
      failureType: cause instanceof ApplicationFailure ? cause.type : cause instanceof Error ? cause.name : 'Unknown',
    });
    throw error;
  }
}
