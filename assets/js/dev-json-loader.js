(function (window, document) {
  "use strict";

  var DATA_FILES = {
    siteData: "assets/data/site-data.json",
    news: "assets/data/news.json",
    partners: "assets/data/partners.json",
    faq: "assets/data/faq.json",
    formsConfig: "assets/data/forms-config.json"
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var node = byId(id);
    if (node) node.textContent = value == null ? "" : String(value);
  }

  function readJson(path) {
    return fetch(path, { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error(path + " returned " + response.status);
      return response.json();
    });
  }

  function loadJsonBundle() {
    var keys = Object.keys(DATA_FILES);
    return Promise.all(keys.map(function (key) {
      return readJson(DATA_FILES[key]).then(function (value) {
        return [key, value];
      });
    })).then(function (entries) {
      return entries.reduce(function (bundle, entry) {
        bundle[entry[0]] = entry[1];
        return bundle;
      }, {
        source: "JSON",
        loadedAt: new Date().toISOString()
      });
    });
  }

  function fallbackBundle(error) {
    return {
      source: "data.js",
      loadedAt: new Date().toISOString(),
      error: error ? String(error.message || error) : "",
      siteData: window.DEFAULT_DATA || {},
      news: {
        title: window.DEFAULT_DATA && window.DEFAULT_DATA.newsTitle,
        display: window.DEFAULT_DATA && window.DEFAULT_DATA.newsDisplay,
        items: window.DEFAULT_DATA && window.DEFAULT_DATA.news || []
      },
      partners: {
        title: window.DEFAULT_DATA && window.DEFAULT_DATA.partnersTitle,
        display: window.DEFAULT_DATA && window.DEFAULT_DATA.partnersDisplay,
        items: window.DEFAULT_DATA && window.DEFAULT_DATA.partners || []
      },
      faq: {
        title: window.DEFAULT_DATA && window.DEFAULT_DATA.faqTitle,
        display: window.DEFAULT_DATA && window.DEFAULT_DATA.faqDisplay,
        items: window.DEFAULT_DATA && window.DEFAULT_DATA.faqs || []
      },
      formsConfig: { forms: [] }
    };
  }

  function getItems(section) {
    if (!section) return [];
    return section.items || section.news || section.partners || section.faqs || [];
  }

  function getSiteVersion(siteData) {
    if (!siteData) return "";
    return siteData.siteVersion || siteData._meta && siteData._meta.version || "";
  }

  function renderList(id, items, map) {
    var root = byId(id);
    if (!root) return;
    root.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("li");
      empty.textContent = "無資料";
      root.appendChild(empty);
      return;
    }
    items.forEach(function (item, index) {
      var li = document.createElement("li");
      li.textContent = map(item, index);
      root.appendChild(li);
    });
  }

  function renderBundle(bundle, pageType) {
    var siteData = bundle.siteData || {};
    var newsItems = getItems(bundle.news);
    var partnerItems = getItems(bundle.partners);
    var faqItems = getItems(bundle.faq);
    var formItems = getItems(bundle.formsConfig.forms ? { items: bundle.formsConfig.forms } : bundle.formsConfig);

    document.documentElement.dataset.dataSource = bundle.source;
    setText("dataSource", bundle.source);
    setText("loadedAt", bundle.loadedAt);
    setText("siteVersion", getSiteVersion(siteData));
    setText("siteTitle", siteData.siteTitle || siteData.site && siteData.site.title || "");
    setText("contactPhone", siteData.contact && siteData.contact.phone || "");
    setText("contactLine", siteData.contact && siteData.contact.lineId || "");
    setText("jsonError", bundle.error || "");
    setText("pageType", pageType || "main");

    setText("newsCount", newsItems.length);
    setText("partnersCount", partnerItems.length);
    setText("faqCount", faqItems.length);
    setText("formsCount", formItems.length);

    renderList("newsList", newsItems, function (item) {
      return (item.publishDate ? item.publishDate + " - " : "") + (item.title || "未命名消息");
    });
    renderList("partnersList", partnerItems, function (item) {
      return (item.companyName || "未命名企業") + (item.phone ? " / " + item.phone : "");
    });
    renderList("faqList", faqItems, function (item) {
      return item.q || item.question || "未命名 FAQ";
    });
    renderList("formsList", formItems, function (item) {
      return (item.type || "form") + " / " + (item.label || "未命名表單");
    });

    if (pageType === "ihome") {
      var ihome = siteData.ihomeConfig || {};
      setText("ihomeTitle", ihome.banner && ihome.banner.logoText || "");
      setText("ihomePhone", ihome.contact && ihome.contact.phone || "");
      setText("ihomeCasesCount", (siteData.ihomeCases || []).length);
    }
  }

  function start(options) {
    options = options || {};
    setText("dataSource", "讀取中");
    return loadJsonBundle().catch(fallbackBundle).then(function (bundle) {
      renderBundle(bundle, options.pageType || "main");
      return bundle;
    });
  }

  window.ChengChuangDevJsonLoader = {
    DATA_FILES: DATA_FILES,
    loadJsonBundle: loadJsonBundle,
    fallbackBundle: fallbackBundle,
    renderBundle: renderBundle,
    start: start
  };
})(window, document);
