/**
 * The project grid of the Tumauini drawings, and how to get from it to latitude and longitude.
 *
 * The DED key plans print coordinates such as X = 603 398.296, Y = 1 916 174.594. P00a established
 * that these are PRS92 / Philippines Zone III (EPSG:3123): transverse Mercator on the Clarke 1866
 * ellipsoid, central meridian 121 E, scale 0.99995, false easting 500 000 m. Converted with the
 * PRS92 to WGS84 shift below, the tunnel portals, penstock and powerhouse land on the right valley
 * in open elevation data; read as a WGS84 grid they land about 150 m off, on a hillside.
 *
 * Accuracy of the conversion: about 10 m (the published datum shift is a national average).
 */

export type LatLon = { lat: number; lon: number };
export type GridPoint = { easting: number; northing: number };

type Ellipsoid = { a: number; f: number };
const CLARKE_1866: Ellipsoid = { a: 6378206.4, f: 1 / 294.9786982 };
const WGS84: Ellipsoid = { a: 6378137, f: 1 / 298.257223563 };

const ZONE_III = { lon0: 121, k0: 0.99995, falseEasting: 500000, falseNorthing: 0 };

const RAD = Math.PI / 180;

/** Transverse Mercator, grid to geographic (Snyder's series; good to millimetres at this distance from the meridian). */
function tmInverse(easting: number, northing: number, ell: Ellipsoid): LatLon {
  const { a, f } = ell;
  const e2 = 2 * f - f * f;
  const ep2 = e2 / (1 - e2);
  const m = (northing - ZONE_III.falseNorthing) / ZONE_III.k0;
  const mu = m / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const s = Math.sin(phi1);
  const c = Math.cos(phi1);
  const t = Math.tan(phi1);
  const c1 = ep2 * c * c;
  const t1 = t * t;
  const n1 = a / Math.sqrt(1 - e2 * s * s);
  const r1 = (a * (1 - e2)) / (1 - e2 * s * s) ** 1.5;
  const d = (easting - ZONE_III.falseEasting) / (n1 * ZONE_III.k0);
  const lat =
    phi1 -
    ((n1 * t) / r1) *
      ((d * d) / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) * d ** 6) / 720);
  const lon =
    ZONE_III.lon0 * RAD +
    (d - ((1 + 2 * t1 + c1) * d ** 3) / 6 + ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) * d ** 5) / 120) / c;
  return { lat: lat / RAD, lon: lon / RAD };
}

function toGeocentric(p: LatLon, ell: Ellipsoid): [number, number, number] {
  const e2 = 2 * ell.f - ell.f * ell.f;
  const lat = p.lat * RAD;
  const lon = p.lon * RAD;
  const n = ell.a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  return [n * Math.cos(lat) * Math.cos(lon), n * Math.cos(lat) * Math.sin(lon), n * (1 - e2) * Math.sin(lat)];
}

function fromGeocentric([x, y, z]: [number, number, number], ell: Ellipsoid): LatLon {
  const e2 = 2 * ell.f - ell.f * ell.f;
  const p = Math.hypot(x, y);
  let lat = Math.atan2(z, p * (1 - e2));
  for (let i = 0; i < 6; i++) {
    const n = ell.a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
    lat = Math.atan2(z + e2 * n * Math.sin(lat), p);
  }
  return { lat: lat / RAD, lon: Math.atan2(y, x) / RAD };
}

/** PRS92 geographic to WGS84 geographic: the 7-parameter shift of EPSG:15708 (coordinate-frame rotation). */
function prs92ToWgs84(p: LatLon): LatLon {
  const [x, y, z] = toGeocentric(p, CLARKE_1866);
  const arcsec = Math.PI / 648000;
  const rx = 3.068 * arcsec;
  const ry = -4.903 * arcsec;
  const rz = -1.578 * arcsec;
  const s = 1 - 1.06e-6;
  return fromGeocentric(
    [-127.62 + s * (x + rz * y - ry * z), -67.24 + s * (-rz * x + y + rx * z), -47.04 + s * (ry * x - rx * y + z)],
    WGS84
  );
}

/** A point on the drawings (PRS92 Zone III easting and northing) as WGS84 latitude and longitude. */
export function projectGridToLatLon(p: GridPoint): LatLon {
  return prs92ToWgs84(tmInverse(p.easting, p.northing, CLARKE_1866));
}

/**
 * A grid point in a location's local frame (CONTRACTS.md section 3: metres, Y up, right-handed).
 * `yawToGridNorth` is the bearing, clockwise from grid north in radians, that the local -Z axis
 * points along; local +X is 90 degrees clockwise from that. With yaw 0, +X is east and +Z is south.
 */
export function gridToLocal(p: GridPoint, origin: GridPoint, yawToGridNorth: number): { x: number; z: number } {
  const de = p.easting - origin.easting;
  const dn = p.northing - origin.northing;
  const sin = Math.sin(yawToGridNorth);
  const cos = Math.cos(yawToGridNorth);
  return { x: de * cos - dn * sin, z: -(de * sin + dn * cos) };
}

export function localToGrid(x: number, z: number, origin: GridPoint, yawToGridNorth: number): GridPoint {
  const sin = Math.sin(yawToGridNorth);
  const cos = Math.cos(yawToGridNorth);
  return { easting: origin.easting + x * cos - z * sin, northing: origin.northing - x * sin - z * cos };
}
