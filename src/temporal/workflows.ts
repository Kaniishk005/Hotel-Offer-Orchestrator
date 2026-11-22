import { proxyActivities } from '@temporalio/workflow';
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
  const [supplierA, supplierB] = await Promise.all([
    fetchSupplierAHotels(input.city),
    fetchSupplierBHotels(input.city),
  ]);

  return deduplicateHotels([...supplierA, ...supplierB]);
}
