/**
 * 誠創科技｜電子發票相關問題 QA 專用 Apps Script
 *
 * 重要：
 * 1. 請建立「另一份全新的 Google 試算表」，不要使用公司主頁原本的試算表。
 * 2. 在這份新試算表：擴充功能 → Apps Script → 貼上本檔。
 * 3. Apps Script 專案設定 → 指令碼屬性：
 *      INVOICE_ADMIN_KEY = 自行設定一組管理金鑰
 * 4. 執行 setupInvoiceQaSheet() 一次，建立工作表與範例資料。
 * 5. 部署 → 新部署 → 網頁應用程式 → 執行身分：我 → 存取權：所有人。
 * 6. 把 Web App URL 貼到 invoice/config/invoice-google-sheets.js。
 */

const INVOICE_QA_SHEET = '電子發票相關問題QA';
const HEADERS = ['ID','分類','問題','回答','排序','啟用','更新時間'];

function doGet(e){
  try{
    const action=String((e.parameter||{}).action||'');
    if(action==='getInvoiceFaqs'){
      return json_({ok:true,items:listFaqs_(false)});
    }
    if(action==='listInvoiceFaqs'){
      requireKey_(String((e.parameter||{}).key||''));
      return json_({ok:true,items:listFaqs_(true)});
    }
    return json_({ok:false,message:'UNKNOWN_ACTION'});
  }catch(err){
    return json_({ok:false,message:String(err.message||err)});
  }
}

function doPost(e){
  try{
    const body=JSON.parse((e.postData&&e.postData.contents)||'{}');
    requireKey_(String(body.key||''));
    const action=String(body.action||'');
    const data=body.data||{};
    if(action==='saveInvoiceFaq') return json_(saveFaq_(data));
    if(action==='deleteInvoiceFaq') return json_(deleteFaq_(String(data.id||'')));
    if(action==='importCurrentInvoiceFaqs') return json_({ok:true,message:importCurrentInvoiceFaqs()});
    return json_({ok:false,message:'UNKNOWN_ACTION'});
  }catch(err){
    return json_({ok:false,message:String(err.message||err)});
  }
}

function setupInvoiceQaSheet(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sh=ss.getSheetByName(INVOICE_QA_SHEET);
  if(!sh) sh=ss.insertSheet(INVOICE_QA_SHEET);
  sh.clear();
  sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
  sh.setFrozenRows(1);

  const demo=[
    [Utilities.getUuid(),"基礎認識","電子發票是甚麼？","根據財政部「電子發票實施作業要點」說明，電子發票係指以網際網路或其他電子方式開立、傳輸或接收之統一發票。簡單來說，就是將發票資料透過網路傳送並存證於財政部相關系統。",10,'Y',new Date()],
    [Utilities.getUuid(),"基礎認識","B2B、B2C、交換與存證是甚麼？","一般可分為 B2B 與 B2C：

B2B（Business to Business）：企業對企業，也就是公司對公司交易。

B2C（Business to Consumer）：企業對一般消費者的交易。

常見模式：

• B2C 存證：開立後可列印、網路傳送給消費者，或存入載具，再將發票資料存證至財政部。

• B2B 存證：開立後交付買方營業人，再將發票資料存證至財政部。

• B2B 交換：不列印紙本，直接透過網路交換給買方營業人，由買方進行接收確認。",20,'Y',new Date()],
    [Utilities.getUuid(),"申請與憑證","申請電子發票一定要工商憑證嗎？","也可以依適用資格使用負責人的自然人憑證；使用自然人憑證時需注意營業人型態與負責人身分是否符合申辦條件。若尚未有工商憑證，可先至經濟部工商憑證管理中心申請。工商憑證可作為公司、分公司、有限合夥或商業在網路上的身分驗證工具，後續也會使用於財政部電子發票整合服務平台。",30,'Y',new Date()],
    [Utilities.getUuid(),"申請與憑證","工商憑證可以自己申請嗎？還是需要透過會計事務所？","工商憑證可以自行申請，不一定要透過會計事務所，可至經濟部工商憑證管理中心辦理。",40,'Y',new Date()],
    [Utilities.getUuid(),"申請與憑證","拿工商憑證登入財政部電子發票平台，但一直登入不進去，怎麼辦？","請先確認：

1. 讀卡機驅動程式是否已安裝。

2. 是否已安裝 HiCOS 卡片管理工具。

3. 工商憑證是否已啟用、是否被鎖卡。

若以上皆已確認，可重新整理頁面後再試；若仍持續無法登入，建議洽詢財政部電子發票整合服務平台客服。",50,'Y',new Date()],
    [Utilities.getUuid(),"申請與憑證","我們是企業社／商號，也可以申請電子發票嗎？","只要營業人具有效的統一編號並符合相關申請條件，即可辦理電子發票申請。若要確認統一編號狀態，可先使用營業人統一編號查詢服務確認。",60,'Y',new Date()],
    [Utilities.getUuid(),"申請流程","電子發票的申請流程有哪些？","一般可整理為四個主要部分：

Step 1 工商憑證／適用憑證準備

Step 2 加值服務中心註冊與設定

Step 3 財政部電子發票整合服務平台申請與設定

Step 4 完成系統設定後正式開立發票

部分步驟可能會交叉進行，可搭配本站各頁操作說明逐項完成。",70,'Y',new Date()],
    [Utilities.getUuid(),"總分公司","總公司和分公司都要使用電子發票，申請步驟一樣嗎？","總公司與分公司皆需依實際營業人及配號需求完成相關申請與設定。若由總機構統一辦理其他固定營業場所的字軌相關事項，應依申請書及附表規定填寫。",80,'Y',new Date()],
    [Utilities.getUuid(),"總分公司","電子發票字軌號碼申請書中的「首次申請多少組」，是總公司加分公司的總數嗎？","若由總公司統一辦理並分配給各分公司使用，需將總公司本身與各分公司預計需要的組數合計後提出申請，再由總公司依實際需求分配。",90,'Y',new Date()],
    [Utilities.getUuid(),"總分公司","總公司申請完電子發票，後續新增分公司需要重新申請嗎？","若後續新增固定營業場所，相關申請文件仍需再辦理；若使用「總機構代其他固定營業場所申請電子發票字軌號碼明細總表」，可依新增的營業場所資料填寫並送件。",100,'Y',new Date()],
    [Utilities.getUuid(),"字軌與配號","開電子發票一定要匯入字軌嗎？","開立電子發票需使用可供電子發票開立的字軌號碼。收到受理機關通知後，先至電子發票整合服務平台完成取號，再依實際使用的加值服務中心或系統完成字軌匯入與設定後，才能正常開立。",110,'Y',new Date()],
    [Utilities.getUuid(),"字軌與配號","電子發票配號方式「期配」及「年配」有什麼差別？","期配：以每 2 個月為一期進行配號，完成取號後，再將字軌匯入實際使用的平台或系統。

年配：一次申請整年度的字軌號碼區間；使用年配時需留意年度配號申請及平台操作時間。

實際採用哪種方式，仍依營業人核准的配號方式與主管稽徵機關規定為準。",120,'Y',new Date()],
    [Utilities.getUuid(),"字軌與配號","請問空白字軌是我們自己上傳嗎？","若使用的加值服務中心有提供空白未使用發票號碼上傳服務，通常可由系統依服務設定協助處理。若字軌沒有匯入該加值服務中心，系統就無法代為處理該段字軌，以避免與其他電商平台或其他加值中心的字軌重複。需要確認時，可向誠創科技客服諮詢。",130,'Y',new Date()],
    [Utilities.getUuid(),"字軌與配號","空白未使用字軌要在什麼時候上傳？","空白未使用字軌須於次期開始 10 日內，也就是單月 10 日前完成上傳。

    例如：

    • 1–2 月期發票 → 須於 3 月 10 日前完成上傳。

    • 3–4 月期發票 → 須於 5 月 10 日前完成上傳。

    • 5–6 月期發票 → 須於 7 月 10 日前完成上傳。

    以此類推，原則就是「次期開始 10 日內」完成空白未使用字軌上傳。",140,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","開立電子發票有時間限制嗎？","依你提供的內容整理：

• B2C：需於規定時限內完成發票及載具識別資訊傳輸。

• B2B：需於規定時限內完成發票開立、接收與傳輸。

如遇不可抗力或不可歸責於營業人的情形，應依統一發票使用辦法及主管機關規定辦理。",150,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","發票開錯了怎麼辦？要怎麼處理？","依發票類型與實際交易狀況處理：

1. B2B 發票：常見作法為作廢後重新開立，或依實際交易狀態辦理折讓。

2. B2C 發票：若需作廢重開，應確認是否已列印紙本、是否使用載具及是否已交付消費者，再依系統與法規流程處理。

若已跨期或涉及申報，建議先與會計或客服確認後再操作。",160,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","B2C 銷售金額已經含稅，開立時要選免稅嗎？","不是。是否選擇免稅是依商品／服務的稅別判斷，不是因為售價是否含稅。一般應稅商品仍選擇應稅，再於「單價（含稅）」欄輸入含稅售價，由系統依設定計算未稅金額與稅額。",170,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","開立發票後想列印，怎麼沒有顯示列印？","開立後系統需先完成上傳並取得成功狀態，之後才會開放列印、作廢等後續操作。

B2B 通常會有下載／列印相關功能；B2C 若使用載具，代表採雲端發票方式，通常不會列印紙本。若交易流程需要紙本，需依系統設定與實際載具使用方式處理。",180,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","電子發票開立後，最晚多久要上傳？","電子發票開立後需在規定期限內完成上傳：

    • B2C（消費者）：開立後 48 小時內完成上傳。

    • B2B（營業人／有統編）：開立後 7 日內完成上傳。

    建議開立後即由系統儘速傳送，不要等到期限最後一天才處理。",190,'Y',new Date()],
    [Utilities.getUuid(),"作廢與折讓","第一個月開的發票，客人第二個月退貨，應該作廢還是折讓？","同一期兩個月內，實務上可能依會計處理方式選擇作廢或折讓；常見分類為：

• 同月：較常使用作廢。

• 跨月：較常使用折讓。

• 若已跨期並完成申報：通常應使用折讓處理。

實際仍應依交易狀況與會計申報結果判斷。",200,'Y',new Date()],
    [Utilities.getUuid(),"服務與設定","我沒有電子發票，也可以申請加值中心嗎？","可以先註冊加值服務，再依申請流程完成憑證、電子發票整合服務平台與字軌相關設定。本站也會依步驟提供申請與操作說明。",210,'Y',new Date()],
    [Utilities.getUuid(),"服務與設定","我已經有電子發票，要怎麼申請加值中心？","可先完成加值服務註冊，再依實際系統需求完成「授權加值中心」、「接收方式設定」、「字軌授權」與「種子密碼」等設定，即可進行後續串接與開立作業。",220,'Y',new Date()],
    [Utilities.getUuid(),"其他","收到中獎發票通知，如何領獎？","可依財政部電子發票相關領獎方式辦理，例如使用官方服務設定領獎帳戶，或依中獎發票類型使用適用的領獎管道。若需要操作教學，可再由本站提供對應說明。",230,'Y',new Date()]
  ];
  sh.getRange(2,1,demo.length,HEADERS.length).setValues(demo);
  sh.autoResizeColumns(1,HEADERS.length);
  return 'OK';
}


/**
 * 將網站目前 23 題 QA 一次帶入試算表。
 * - 若問題已存在，不重複新增。
 * - 可在既有資料表上安全執行。
 */
function importCurrentInvoiceFaqs(){
  const sh=getSheet_();
  const current=listFaqs_(true);
  const existing=new Set(current.map(x=>String(x.question||'').trim()));
  const seed=getCurrentInvoiceFaqSeed_();
  let added=0;
  seed.forEach(x=>{
    if(existing.has(x[2])) return;
    sh.appendRow(x);
    existing.add(x[2]);
    added++;
  });
  return '已新增 '+added+' 題，目前共 '+(current.length+added)+' 題';
}

function getCurrentInvoiceFaqSeed_(){
  return [
    [Utilities.getUuid(),"基礎認識","電子發票是甚麼？","根據財政部「電子發票實施作業要點」說明，電子發票係指以網際網路或其他電子方式開立、傳輸或接收之統一發票。簡單來說，就是將發票資料透過網路傳送並存證於財政部相關系統。",10,'Y',new Date()],
    [Utilities.getUuid(),"基礎認識","B2B、B2C、交換與存證是甚麼？","一般可分為 B2B 與 B2C：\n\nB2B（Business to Business）：企業對企業，也就是公司對公司交易。\n\nB2C（Business to Consumer）：企業對一般消費者的交易。\n\n常見模式：\n\n• B2C 存證：開立後可列印、網路傳送給消費者，或存入載具，再將發票資料存證至財政部。\n\n• B2B 存證：開立後交付買方營業人，再將發票資料存證至財政部。\n\n• B2B 交換：不列印紙本，直接透過網路交換給買方營業人，由買方進行接收確認。",20,'Y',new Date()],
    [Utilities.getUuid(),"申請與憑證","申請電子發票一定要工商憑證嗎？","也可以依適用資格使用負責人的自然人憑證；使用自然人憑證時需注意營業人型態與負責人身分是否符合申辦條件。若尚未有工商憑證，可先至經濟部工商憑證管理中心申請。工商憑證可作為公司、分公司、有限合夥或商業在網路上的身分驗證工具，後續也會使用於財政部電子發票整合服務平台。",30,'Y',new Date()],
    [Utilities.getUuid(),"申請與憑證","工商憑證可以自己申請嗎？還是需要透過會計事務所？","工商憑證可以自行申請，不一定要透過會計事務所，可至經濟部工商憑證管理中心辦理。",40,'Y',new Date()],
    [Utilities.getUuid(),"申請與憑證","拿工商憑證登入財政部電子發票平台，但一直登入不進去，怎麼辦？","請先確認：\n\n1. 讀卡機驅動程式是否已安裝。\n\n2. 是否已安裝 HiCOS 卡片管理工具。\n\n3. 工商憑證是否已啟用、是否被鎖卡。\n\n若以上皆已確認，可重新整理頁面後再試；若仍持續無法登入，建議洽詢財政部電子發票整合服務平台客服。",50,'Y',new Date()],
    [Utilities.getUuid(),"申請與憑證","我們是企業社／商號，也可以申請電子發票嗎？","只要營業人具有效的統一編號並符合相關申請條件，即可辦理電子發票申請。若要確認統一編號狀態，可先使用營業人統一編號查詢服務確認。",60,'Y',new Date()],
    [Utilities.getUuid(),"申請流程","電子發票的申請流程有哪些？","一般可整理為四個主要部分：\n\nStep 1 工商憑證／適用憑證準備\n\nStep 2 加值服務中心註冊與設定\n\nStep 3 財政部電子發票整合服務平台申請與設定\n\nStep 4 完成系統設定後正式開立發票\n\n部分步驟可能會交叉進行，可搭配本站各頁操作說明逐項完成。",70,'Y',new Date()],
    [Utilities.getUuid(),"總分公司","總公司和分公司都要使用電子發票，申請步驟一樣嗎？","總公司與分公司皆需依實際營業人及配號需求完成相關申請與設定。若由總機構統一辦理其他固定營業場所的字軌相關事項，應依申請書及附表規定填寫。",80,'Y',new Date()],
    [Utilities.getUuid(),"總分公司","電子發票字軌號碼申請書中的「首次申請多少組」，是總公司加分公司的總數嗎？","若由總公司統一辦理並分配給各分公司使用，需將總公司本身與各分公司預計需要的組數合計後提出申請，再由總公司依實際需求分配。",90,'Y',new Date()],
    [Utilities.getUuid(),"總分公司","總公司申請完電子發票，後續新增分公司需要重新申請嗎？","若後續新增固定營業場所，相關申請文件仍需再辦理；若使用「總機構代其他固定營業場所申請電子發票字軌號碼明細總表」，可依新增的營業場所資料填寫並送件。",100,'Y',new Date()],
    [Utilities.getUuid(),"字軌與配號","開電子發票一定要匯入字軌嗎？","開立電子發票需使用可供電子發票開立的字軌號碼。收到受理機關通知後，先至電子發票整合服務平台完成取號，再依實際使用的加值服務中心或系統完成字軌匯入與設定後，才能正常開立。",110,'Y',new Date()],
    [Utilities.getUuid(),"字軌與配號","電子發票配號方式「期配」及「年配」有什麼差別？","期配：以每 2 個月為一期進行配號，完成取號後，再將字軌匯入實際使用的平台或系統。\n\n年配：一次申請整年度的字軌號碼區間；使用年配時需留意年度配號申請及平台操作時間。\n\n實際採用哪種方式，仍依營業人核准的配號方式與主管稽徵機關規定為準。",120,'Y',new Date()],
    [Utilities.getUuid(),"字軌與配號","請問空白字軌是我們自己上傳嗎？","若使用的加值服務中心有提供空白未使用發票號碼上傳服務，通常可由系統依服務設定協助處理。若字軌沒有匯入該加值服務中心，系統就無法代為處理該段字軌，以避免與其他電商平台或其他加值中心的字軌重複。需要確認時，可向誠創科技客服諮詢。",130,'Y',new Date()],
    [Utilities.getUuid(),"字軌與配號","空白未使用字軌要在什麼時候上傳？","空白未使用字軌須於次期開始 10 日內，也就是單月 10 日前完成上傳。\n\n    例如：\n\n    • 1–2 月期發票 → 須於 3 月 10 日前完成上傳。\n\n    • 3–4 月期發票 → 須於 5 月 10 日前完成上傳。\n\n    • 5–6 月期發票 → 須於 7 月 10 日前完成上傳。\n\n    以此類推，原則就是「次期開始 10 日內」完成空白未使用字軌上傳。",140,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","開立電子發票有時間限制嗎？","依你提供的內容整理：\n\n• B2C：需於規定時限內完成發票及載具識別資訊傳輸。\n\n• B2B：需於規定時限內完成發票開立、接收與傳輸。\n\n如遇不可抗力或不可歸責於營業人的情形，應依統一發票使用辦法及主管機關規定辦理。",150,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","發票開錯了怎麼辦？要怎麼處理？","依發票類型與實際交易狀況處理：\n\n1. B2B 發票：常見作法為作廢後重新開立，或依實際交易狀態辦理折讓。\n\n2. B2C 發票：若需作廢重開，應確認是否已列印紙本、是否使用載具及是否已交付消費者，再依系統與法規流程處理。\n\n若已跨期或涉及申報，建議先與會計或客服確認後再操作。",160,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","B2C 銷售金額已經含稅，開立時要選免稅嗎？","不是。是否選擇免稅是依商品／服務的稅別判斷，不是因為售價是否含稅。一般應稅商品仍選擇應稅，再於「單價（含稅）」欄輸入含稅售價，由系統依設定計算未稅金額與稅額。",170,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","開立發票後想列印，怎麼沒有顯示列印？","開立後系統需先完成上傳並取得成功狀態，之後才會開放列印、作廢等後續操作。\n\nB2B 通常會有下載／列印相關功能；B2C 若使用載具，代表採雲端發票方式，通常不會列印紙本。若交易流程需要紙本，需依系統設定與實際載具使用方式處理。",180,'Y',new Date()],
    [Utilities.getUuid(),"開立與時限","電子發票開立後，最晚多久要上傳？","電子發票開立後需在規定期限內完成上傳：\n\n    • B2C（消費者）：開立後 48 小時內完成上傳。\n\n    • B2B（營業人／有統編）：開立後 7 日內完成上傳。\n\n    建議開立後即由系統儘速傳送，不要等到期限最後一天才處理。",190,'Y',new Date()],
    [Utilities.getUuid(),"作廢與折讓","第一個月開的發票，客人第二個月退貨，應該作廢還是折讓？","同一期兩個月內，實務上可能依會計處理方式選擇作廢或折讓；常見分類為：\n\n• 同月：較常使用作廢。\n\n• 跨月：較常使用折讓。\n\n• 若已跨期並完成申報：通常應使用折讓處理。\n\n實際仍應依交易狀況與會計申報結果判斷。",200,'Y',new Date()],
    [Utilities.getUuid(),"服務與設定","我沒有電子發票，也可以申請加值中心嗎？","可以先註冊加值服務，再依申請流程完成憑證、電子發票整合服務平台與字軌相關設定。本站也會依步驟提供申請與操作說明。",210,'Y',new Date()],
    [Utilities.getUuid(),"服務與設定","我已經有電子發票，要怎麼申請加值中心？","可先完成加值服務註冊，再依實際系統需求完成「授權加值中心」、「接收方式設定」、「字軌授權」與「種子密碼」等設定，即可進行後續串接與開立作業。",220,'Y',new Date()],
    [Utilities.getUuid(),"其他","收到中獎發票通知，如何領獎？","可依財政部電子發票相關領獎方式辦理，例如使用官方服務設定領獎帳戶，或依中獎發票類型使用適用的領獎管道。若需要操作教學，可再由本站提供對應說明。",230,'Y',new Date()]
  ];
}

function listFaqs_(includeDisabled){
  const sh=getSheet_();
  const last=sh.getLastRow();
  if(last<2) return [];
  const rows=sh.getRange(2,1,last-1,HEADERS.length).getValues();
  return rows.map(r=>({
    id:String(r[0]||''),category:String(r[1]||''),question:String(r[2]||''),
    answer:String(r[3]||''),sort:Number(r[4]||9999),enabled:String(r[5]||'Y'),
    updatedAt:r[6] instanceof Date ? r[6].toISOString() : String(r[6]||'')
  })).filter(x=>includeDisabled||x.enabled.toUpperCase()!=='N')
     .sort((a,b)=>a.sort-b.sort);
}

function saveFaq_(d){
  const sh=getSheet_();
  const id=String(d.id||'').trim()||Utilities.getUuid();
  const category=String(d.category||'其他').trim();
  const question=String(d.question||'').trim();
  const answer=String(d.answer||'').trim();
  const sort=Number(d.sort||100);
  const enabled=String(d.enabled||'Y').toUpperCase()==='N'?'N':'Y';
  if(!question||!answer) throw new Error('問題與回答不可空白');

  const last=sh.getLastRow();
  let row=0;
  if(last>=2){
    const ids=sh.getRange(2,1,last-1,1).getValues().flat().map(String);
    const idx=ids.indexOf(id);
    if(idx>=0) row=idx+2;
  }
  const values=[[id,category,question,answer,sort,enabled,new Date()]];
  if(row) sh.getRange(row,1,1,HEADERS.length).setValues(values);
  else sh.appendRow(values[0]);
  return {ok:true,id};
}

function deleteFaq_(id){
  if(!id) throw new Error('缺少 ID');
  const sh=getSheet_();
  const last=sh.getLastRow();
  if(last<2) throw new Error('找不到資料');
  const ids=sh.getRange(2,1,last-1,1).getValues().flat().map(String);
  const idx=ids.indexOf(id);
  if(idx<0) throw new Error('找不到指定 QA');
  sh.deleteRow(idx+2);
  return {ok:true};
}

function getSheet_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sh=ss.getSheetByName(INVOICE_QA_SHEET);
  if(!sh) throw new Error('請先執行 setupInvoiceQaSheet()');
  return sh;
}

function requireKey_(key){
  const expected=PropertiesService.getScriptProperties().getProperty('INVOICE_ADMIN_KEY')||'';
  if(!expected) throw new Error('尚未設定 INVOICE_ADMIN_KEY');
  if(key!==expected) throw new Error('管理金鑰錯誤');
}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
