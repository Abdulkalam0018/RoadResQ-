const DEVTOOLS_LOCATION_HINT =
  'If you are testing in Chrome device emulation, open DevTools > More tools > Sensors and choose a mock location.';

const DEFAULT_GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000,
};

export const isGeolocationSupported = () =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator;

export const requestCurrentPosition = (options = {}) =>
  new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      const error = new Error('Geolocation is not supported by this browser.');
      error.code = 'UNSUPPORTED';
      reject(error);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        ...DEFAULT_GEOLOCATION_OPTIONS,
        ...options,
      }
    );
  });

export const getGeolocationErrorMessage = (error) => {
  switch (error?.code) {
    case 1:
      return 'Location access was blocked. Allow location permission in your browser and try again.';
    case 2:
      return `Your device could not determine a location. ${DEVTOOLS_LOCATION_HINT}`;
    case 3:
      return `Location lookup timed out. Turn on location services and try again. ${DEVTOOLS_LOCATION_HINT}`;
    case 'UNSUPPORTED':
      return error.message;
    default:
      return `Unable to get your location right now. ${DEVTOOLS_LOCATION_HINT}`;
  }
};
