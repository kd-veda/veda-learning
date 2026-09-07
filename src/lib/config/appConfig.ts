/**
 * Admin-configurable platform settings: the note→scale recommendation
 * mapping and pitch tolerance bands. Defaults match the product spec.
 * When a Supabase project is connected, the admin "Configuration" page
 * persists overrides to the `app_config` table (see supabase/migrations);
 * in local/guest mode overrides are persisted to IndexedDB. Either way,
 * everything downstream (calibration, scoring) reads through this module
 * rather than importing the defaults directly, so an admin edit takes
 * effect everywhere at once.
 */

import { DEFAULT_SCALE_MAPPING, type ScaleMapping } from "@/lib/audio/scaleMapping";
import { DEFAULT_PITCH_TOLERANCE, type PitchTolerance } from "@/lib/audio/scoring";

export interface AppConfig {
  scaleMapping: ScaleMapping;
  pitchTolerance: PitchTolerance;
  /** Minimum voiced-frame confidence used across calibration + scoring. */
  minConfidence: number;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  scaleMapping: DEFAULT_SCALE_MAPPING,
  pitchTolerance: DEFAULT_PITCH_TOLERANCE,
  minConfidence: 0.5,
};
