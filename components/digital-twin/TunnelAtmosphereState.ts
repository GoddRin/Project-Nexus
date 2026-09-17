/**
 * TunnelAtmosphereState.ts
 *
 * Atmospheric State & Weather Derivation Helper for Headrace Tunnel Digital Twin.
 * Binds live PAGASA / PANaHON weather overlay and blast/muck event triggers
 * to the subterranean lighting, dust particulate, and water seepage systems.
 */

export interface TunnelAtmosphereConfig {
  /**
   * Airborne particulate density factor: 0.0 (clear) to 1.0 (heavy blast haze).
   * Typically 0.35 - 0.45 under nominal ventilation, spikes to 1.0 on blasting.
   */
  dustIntensity: number;

  /**
   * Subterranean rock mass saturation / seepage factor: 0.0 (dry) to 1.0 (monsoon).
   * Derived from Sierra Madre rainfall and storm signals.
   */
  seepageFactor: number;

  /**
   * Safety alert pulse state (turns string lights pulsing amber on gas detection).
   */
  amberWarning: boolean;

  /**
   * Toggles for individual subsystem rendering.
   */
  showFloodlights: boolean;
  showStringLights: boolean;
  showVolumetrics: boolean;
  showDust: boolean;
  showDrips: boolean;
  showPuddles: boolean;
}

export const DEFAULT_TUNNEL_ATMOSPHERE: TunnelAtmosphereConfig = {
  dustIntensity: 0.40,
  seepageFactor: 0.28,
  amberWarning: false,
  showFloodlights: true,
  showStringLights: true,
  showVolumetrics: true,
  showDust: true,
  showDrips: true,
  showPuddles: true,
};

/**
 * Derives dynamic tunnel environmental parameters based on live surface weather.
 *
 * @param isStormActive - Whether a PAGASA storm signal or active rain is hoisted.
 * @param isBlastingActive - Optional trigger when face drill-and-blast or mucking is in progress.
 * @param isGasAlertActive - Optional trigger when safety officer multi-gas detector flags toxic gas.
 */
export function deriveTunnelAtmosphere(
  isStormActive: boolean = false,
  isBlastingActive: boolean = false,
  isGasAlertActive: boolean = false
): TunnelAtmosphereConfig {
  // During heavy storms, mountain rock fissure percolation increases floor seepage
  const seepageFactor = isStormActive ? 0.82 : 0.28;

  // During blasting or muck mucking, airborne rock dust spikes
  const dustIntensity = isBlastingActive ? 0.95 : isStormActive ? 0.55 : 0.40;

  return {
    ...DEFAULT_TUNNEL_ATMOSPHERE,
    seepageFactor,
    dustIntensity,
    amberWarning: isGasAlertActive,
  };
}
