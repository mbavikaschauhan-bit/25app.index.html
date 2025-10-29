(function(){
  // Compatibility shim: ensure both window.dataStore and window.datastore reference the same object
  // Do not overwrite if either already exists. This helps legacy inline code and new modules interoperate.
  try {
    if (typeof window === 'undefined') return;
    // If only one of the names exists, make the other point to the same object.
    if (window.dataStore && !window.datastore) {
      window.datastore = window.dataStore;
      console.log('compat.js: set window.datastore <- window.dataStore');
    } else if (window.datastore && !window.dataStore) {
      window.dataStore = window.datastore;
      console.log('compat.js: set window.dataStore <- window.datastore');
    } else if (!window.datastore && !window.dataStore && window.dataStore === undefined && window.datastore === undefined) {
      // Nothing to map yet — create a placeholder that will be replaced when datastore loads.
      // This placeholder avoids immediate TypeError when code runs early — it will be overwritten by the real datastore later.
      window.dataStore = window.dataStore || null;
      window.datastore = window.datastore || null;
      console.log('compat.js: no datastore detected yet — placeholders created');
    }
  } catch (e) {
    console.warn('compat.js error', e);
  }
})();
