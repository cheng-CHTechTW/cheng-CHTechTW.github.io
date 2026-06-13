(function (window) {
  "use strict";

  var DATA_FILES = {
    siteData: "assets/data/site-data.json",
    news: "assets/data/news.json",
    partners: "assets/data/partners.json",
    faq: "assets/data/faq.json",
    formsConfig: "assets/data/forms-config.json"
  };

  var STORAGE_KEYS = {
    draft: "cc_admin_draft",
    preview: "cc_admin_preview"
  };

  function readJson(path) {
    return fetch(path, { cache: "no-store" }).then(function (response) {
      if (!response.ok) {
        throw new Error("JSON load failed: " + path + " (" + response.status + ")");
      }
      return response.json();
    });
  }

  function readStorageJson(key) {
    try {
      var value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn("Unable to read localStorage key:", key, error);
      return null;
    }
  }

  function getDefaultSiteData() {
    return window.DEFAULT_DATA || window.CC_DEFAULT_SITE_DATA || {};
  }

  function loadJsonBundle() {
    var names = Object.keys(DATA_FILES);
    return Promise.all(names.map(function (name) {
      return readJson(DATA_FILES[name]).then(function (data) {
        return [name, data];
      });
    })).then(function (entries) {
      return entries.reduce(function (bundle, entry) {
        bundle[entry[0]] = entry[1];
        return bundle;
      }, {
        source: "json",
        loadedAt: new Date().toISOString()
      });
    });
  }

  function loadOfficialData() {
    return loadJsonBundle().catch(function (error) {
      console.warn("Official JSON load failed; using data.js defaults.", error);
      return {
        source: "data-js-fallback",
        loadedAt: new Date().toISOString(),
        siteData: getDefaultSiteData(),
        news: { items: [] },
        partners: { items: [] },
        faq: { items: [] },
        formsConfig: { forms: [] }
      };
    });
  }

  function loadPreviewData() {
    return readStorageJson(STORAGE_KEYS.preview) || readStorageJson(STORAGE_KEYS.draft);
  }

  window.ChengChuangCloudData = {
    DATA_FILES: DATA_FILES,
    STORAGE_KEYS: STORAGE_KEYS,
    readJson: readJson,
    readStorageJson: readStorageJson,
    loadOfficialData: loadOfficialData,
    loadPreviewData: loadPreviewData
  };
})(window);
