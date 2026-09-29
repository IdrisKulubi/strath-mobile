import type * as Location from 'expo-location';

export function formatCityFromPlacemark(placemark?: Location.LocationGeocodedAddress | null) {
  if (!placemark) return '';

  const city = placemark.city?.trim();
  if (city) return city;

  const subregion = placemark.subregion?.trim();
  if (subregion) return subregion;

  const region = placemark.region?.trim();
  if (region) return region;

  const parts = [placemark.district, placemark.name, placemark.country]
    .map((value) => value?.trim())
    .filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  return parts.join(', ');
}
