export function pointInZoneBbox(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radiusM: number,
): boolean {
  const latDelta = radiusM / 111000;
  const lngDelta = radiusM / (111000 * Math.cos((centerLat * Math.PI) / 180));

  return (
    lat >= centerLat - latDelta &&
    lat <= centerLat + latDelta &&
    lng >= centerLng - lngDelta &&
    lng <= centerLng + lngDelta
  );
}
