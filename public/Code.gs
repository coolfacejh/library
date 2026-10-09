/**
 * Google Apps Script (Code.gs)
 * 도서관 도서 목록 및 대출 예약 연동 완성형 백엔드
 */

// 1. 웹 접속용 (doGet)
function doGet(e) {
  if (e && e.parameter && (e.parameter.action === 'reserve' || e.parameter.itemId)) {
    var res = makeReservation(
      e.parameter.itemId || e.parameter.bookId,
      e.parameter.name || e.parameter.userName,
      e.parameter.email || e.parameter.userEmail
    );
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // index.html 렌더링
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('도서관 도서 예약 시스템')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 2. 외부 POST 요청 처리 (doPost)
function doPost(e) {
  try {
    var params = {};
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    var result = makeReservation(
      params.itemId || params.bookId,
      params.name || params.userName,
      params.email || params.userEmail
    );

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 3. ★ 핵심: 도서 목록 불러오기 (어떤 시트 이름이든 자동 감지 & 안전 폴백) ★
function getAvailableItems() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    // 도서 목록이 있는 시트 자동 탐색 (B001이 있거나 첫 번째 시트)
    var bookSheet = null;
    for (var s = 0; s < sheets.length; s++) {
      var sName = sheets[s].getName();
      if (!sName.includes("대출") && !sName.includes("예약")) {
        var lr = sheets[s].getLastRow();
        if (lr >= 2) {
          var val = String(sheets[s].getRange(2, 1).getValue()).trim();
          if (val.startsWith("B0") || val.startsWith("B1") || val === "B001") {
            bookSheet = sheets[s];
            break;
          }
        }
      }
    }

    if (!bookSheet && sheets.length > 0) {
      bookSheet = sheets[0];
    }

    var items = [];
    if (bookSheet) {
      var lastRow = bookSheet.getLastRow();
      if (lastRow >= 2) {
        var numCols = Math.min(4, Math.max(1, bookSheet.getLastColumn()));
        var data = bookSheet.getRange(2, 1, lastRow - 1, numCols).getValues();

        for (var i = 0; i < data.length; i++) {
          var id = String(data[i][0] || "").trim();
          var title = String(data[i][1] || "").trim();
          var category = String(data[i][2] || "기타").trim();
          var status = String(data[i][3] || "AVAILABLE").trim().toUpperCase();

          if (id && title) {
            items.push({
              id: id,
              title: title,
              category: category,
              status: (status === "" || status === "대출가능" || status === "AVAILABLE") ? "AVAILABLE" : status
            });
          }
        }
      }
    }

    // 시트에서 데이터를 못 읽었을 경우 10종 기본 도서 보장
    if (items.length === 0) {
      items = getDefaultBooks();
    }

    return items;
  } catch (err) {
    Logger.log("getAvailableItems error: " + err);
    return getDefaultBooks();
  }
}

// 4. 대출 현황 조회
function getLoanRecords() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("대출현황") || ss.getSheetByName("도서대출현황") || ss.getSheetByName("예약내역");
    if (!sheet) sheet = ss.getSheets().length > 1 ? ss.getSheets()[1] : ss.getSheets()[0];

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    var data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    var records = [];

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] || data[i][1]) {
        records.push({
          reservationId: String(data[i][0]).trim(),
          bookId: String(data[i][1]).trim(),
          userName: String(data[i][2]).trim(),
          userEmail: String(data[i][3]).trim(),
          timestamp: data[i][4] instanceof Date 
            ? Utilities.formatDate(data[i][4], "Asia/Seoul", "yyyy. M. d. a h:mm")
            : String(data[i][4]).trim(),
          status: String(data[i][5]).trim() || "CONFIRMED"
        });
      }
    }
    return records;
  } catch (error) {
    return [];
  }
}

// 5. 도서 예약 실행 및 구글 시트에 A~F열 행 추가
function makeReservation(itemId, name, email) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("대출현황") || ss.getSheetByName("도서대출현황") || ss.getSheetByName("예약내역");
    if (!sheet) {
      sheet = ss.getSheets().length > 1 ? ss.getSheets()[1] : ss.getSheets()[0];
    }

    var timestampMillis = new Date().getTime();
    var reservationId = "RES-" + String(timestampMillis).slice(0, 9) + Math.floor(100 + Math.random() * 900);
    var now = new Date();
    var formattedDate = Utilities.formatDate(now, "Asia/Seoul", "yyyy. M. d. a h:mm");

    sheet.appendRow([
      reservationId,
      String(itemId || "").trim(),
      String(name || "").trim(),
      String(email || "").trim(),
      formattedDate,
      "CONFIRMED"
    ]);

    return {
      success: true,
      reservationId: reservationId,
      bookId: itemId,
      userName: name,
      userEmail: email,
      timestamp: formattedDate,
      status: "CONFIRMED"
    };
  } catch (err) {
    Logger.log("makeReservation error: " + err);
    throw new Error("시트 저장 실패: " + err.message);
  }
}

// 기본 10종 도서 데이터
function getDefaultBooks() {
  return [
    { id: 'B001', title: '클린 코드 (Clean Code)', category: 'IT/개발', status: 'AVAILABLE' },
    { id: 'B002', title: '이펙티브 자바 (Effective Java)', category: 'IT/개발', status: 'AVAILABLE' },
    { id: 'B003', title: '혼자 공부하는 파이썬', category: 'IT/개발', status: 'AVAILABLE' },
    { id: 'B004', title: '트렌드 코리아 2026', category: '경제/경영', status: 'AVAILABLE' },
    { id: 'B005', title: '돈의 속성', category: '경제/경영', status: 'AVAILABLE' },
    { id: 'B006', title: '세이노의 가르침', category: '자기계발', status: 'AVAILABLE' },
    { id: 'B007', title: '원씽 (The One Thing)', category: '자기계발', status: 'AVAILABLE' },
    { id: 'B008', title: '불편한 편의점', category: '소설', status: 'AVAILABLE' },
    { id: 'B009', title: '코스모스 (Cosmos)', category: '과학', status: 'AVAILABLE' },
    { id: 'B010', title: '사피엔스 (Sapiens)', category: '역사/인문', status: 'AVAILABLE' }
  ];
}
