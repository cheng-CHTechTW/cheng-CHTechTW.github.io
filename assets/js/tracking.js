
(function(){
  const cfg=window.CH_TRACKING_CONFIG||{};
  const id=(cfg.ga4MeasurementId||cfg.googleAdsId||'').trim();
  if(!id)return;

  const s=document.createElement('script');
  s.async=true;
  s.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);

  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  window.gtag=gtag;
  gtag('js',new Date());

  if(cfg.ga4MeasurementId)gtag('config',cfg.ga4MeasurementId);
  if(cfg.googleAdsId)gtag('config',cfg.googleAdsId);
})();
