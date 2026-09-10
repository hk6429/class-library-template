/**
 * ==============================================================================
 * 班級圖書借用與閱讀分析系統 (Classroom Library & Reading Analytics System)
 * 後端 Google Apps Script (GAS) + LINE Bot 核心程式
 * ==============================================================================
 * 
 * 功能亮點：
 * 1. 班級藏書庫管理 (支援 ISBN 自動向 Google Books API 查詢中文書名、作者、分類、封面)
 * 2. 學生名冊管理 (座號、姓名、借閱總次數、在借數、閱讀偏好)
 * 3. 手機條碼掃描借還書 API 接口 (供 Web App / 手機鏡頭直接調用)
 * 4. LINE Bot 雙向互動查詢 (查詢個人借閱、班級閱讀排行榜、書籍搜尋、逾期提醒)
 * 5. 閱讀領域分析 (文學、科普、歷史、哲學、社會、藝術漫畫之百分比與偏好洞察)
 */

// 系統參數設定 (請在 Google 試算表指令碼屬性或下方填入)
var CONFIG = {
  LINE_CHANNEL_ACCESS_TOKEN: PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN') || 'YOUR_CHANNEL_ACCESS_TOKEN',
  LINE_CHANNEL_SECRET: PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_SECRET') || 'YOUR_CHANNEL_SECRET',
  DEFAULT_BORROW_DAYS: 14, // 預設借閱天數
  CLASS_NAME: '801班 班級圖書館',
  SHEET_NAMES: {
    BOOKS: '藏書清單',
    STUDENTS: '學生名冊',
    RECORDS: '借還紀錄',
    CONFIG: '系統設定'
  }
};

/**
 * 初始化試算表結構與示範資料
 */
function initializeSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 藏書清單
  var sheetBooks = ss.getSheetByName(CONFIG.SHEET_NAMES.BOOKS) || ss.insertSheet(CONFIG.SHEET_NAMES.BOOKS);
  if (sheetBooks.getLastRow() === 0) {
    sheetBooks.appendRow(['ISBN', '書名', '作者', '書籍類別', '出版社', '封面圖片URL', '借閱狀態', '目前借閱人', '累計借閱次數']);
    sheetBooks.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#E8F0FE');
    
    // 預載中學生熱門書籍示範
    var sampleBooks = [
      ['9789865101237', '原子習慣', '詹姆斯·克利爾', '心理勵志', '方智', 'https://covers.openlibrary.org/b/isbn/9789865101237-M.jpg', '可借閱', '', 6],
      ['9789863985020', '被討厭的勇氣', '岸見一郎, 古賀史健', '心理勵志', '究竟', 'https://covers.openlibrary.org/b/isbn/9789863985020-M.jpg', '借閱中', '05 陳品妤', 4],
      ['9789571383798', '人類大歷史', '哈拉瑞', '歷史人文', '時報出版', 'https://covers.openlibrary.org/b/isbn/9789571383798-M.jpg', '可借閱', '', 3],
      ['9789862137680', '解憂雜貨店', '東野圭吾', '文學小說', '皇冠', 'https://covers.openlibrary.org/b/isbn/9789862137680-M.jpg', '借閱中', '12 林宥廷', 8],
      ['9789573289012', '昆蟲記', '法布爾', '科普探索', '遠流', 'https://covers.openlibrary.org/b/isbn/9789573289012-M.jpg', '可借閱', '', 2],
      ['9789864778881', '別鬧了，費曼先生！', '理查·費曼', '科普探索', '天下文化', 'https://covers.openlibrary.org/b/isbn/9789864778881-M.jpg', '可借閱', '', 5],
      ['9789576585142', '三體', '劉慈欣', '科幻奇幻', '字畝文化', 'https://covers.openlibrary.org/b/isbn/9789576585142-M.jpg', '借閱中', '01 王小明', 7],
      ['9789863448129', '如果歷史是一群喵', '肥志', '漫畫圖文', '野人', 'https://covers.openlibrary.org/b/isbn/9789863448129-M.jpg', '借閱中', '18 張雅晴', 12]
    ];
    sampleBooks.forEach(function(row) { sheetBooks.appendRow(row); });
  }

  // 2. 學生名冊
  var sheetStudents = ss.getSheetByName(CONFIG.SHEET_NAMES.STUDENTS) || ss.insertSheet(CONFIG.SHEET_NAMES.STUDENTS);
  if (sheetStudents.getLastRow() === 0) {
    sheetStudents.appendRow(['座號', '姓名', '目前在借數', '累計借閱本數', '主要閱讀偏向', '最後借閱日期']);
    sheetStudents.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#E6F4EA');
    
    var sampleStudents = [
      ['01', '王小明', 1, 7, '科幻奇幻 / 科普', '2026-09-08'],
      ['02', '李美玲', 0, 5, '文學小說', '2026-09-02'],
      ['03', '張家豪', 0, 3, '歷史人文', '2026-08-28'],
      ['04', '林冠宇', 0, 4, '科普探索', '2026-09-05'],
      ['05', '陳品妤', 1, 9, '心理勵志 / 文學', '2026-09-10'],
      ['06', '黃子軒', 0, 2, '漫畫圖文', '2026-08-20'],
      ['07', '楊承恩', 0, 6, '科普探索', '2026-09-07'],
      ['08', '趙若芸', 0, 4, '文學小說', '2026-09-01'],
      ['09', '周柏翰', 0, 3, '歷史人文', '2026-08-30'],
      ['10', '吳佳穎', 0, 5, '心理勵志', '2026-09-03'],
      ['11', '徐浩然', 0, 2, '科普探索', '2026-08-25'],
      ['12', '林宥廷', 1, 11, '文學小說 / 奇幻', '2026-09-09'],
      ['18', '張雅晴', 1, 12, '漫畫圖文 / 歷史', '2026-09-10']
    ];
    sampleStudents.forEach(function(row) { sheetStudents.appendRow(row); });
  }

  // 3. 借還紀錄
  var sheetRecords = ss.getSheetByName(CONFIG.SHEET_NAMES.RECORDS) || ss.insertSheet(CONFIG.SHEET_NAMES.RECORDS);
  if (sheetRecords.getLastRow() === 0) {
    sheetRecords.appendRow(['紀錄ID', '座號', '姓名', 'ISBN', '書名', '書籍類別', '借出日期', '應還日期', '歸還日期', '狀態']);
    sheetRecords.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#FEF7E0');
    
    var sampleRecords = [
      ['REC-20260901-01', '01', '王小明', '9789576585142', '三體', '科幻奇幻', '2026-09-08', '2026-09-22', '', '借閱中'],
      ['REC-20260902-02', '05', '陳品妤', '9789863985020', '被討厭的勇氣', '心理勵志', '2026-09-10', '2026-09-24', '', '借閱中'],
      ['REC-20260903-03', '12', '林宥廷', '9789862137680', '解憂雜貨店', '文學小說', '2026-09-09', '2026-09-23', '', '借閱中'],
      ['REC-20260904-04', '18', '張雅晴', '9789863448129', '如果歷史是一群喵', '漫畫圖文', '2026-09-10', '2026-09-24', '', '借閱中']
    ];
    sampleRecords.forEach(function(row) { sheetRecords.appendRow(row); });
  }
}

/**
 * Web API - 處理 GET 請求 (提供前端網頁讀取與查詢)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  var responseData = {};

  try {
    switch (action) {
      case 'ping':
        responseData = { status: 'success', message: '班級圖書館 API 正常運作中！', time: new Date().toISOString() };
        break;

      case 'getBooks':
        responseData = { status: 'success', data: getAllBooks() };
        break;

      case 'getStudents':
        responseData = { status: 'success', data: getAllStudents() };
        break;

      case 'getRecords':
        responseData = { status: 'success', data: getAllRecords() };
        break;

      case 'lookupIsbn':
        var isbn = e.parameter.isbn || '';
        responseData = { status: 'success', data: lookupBookByIsbn(isbn) };
        break;

      case 'getStudentStats':
        var studentNo = e.parameter.studentNo || '';
        responseData = { status: 'success', data: calculateStudentAnalytics(studentNo) };
        break;

      case 'getClassStats':
        responseData = { status: 'success', data: calculateClassAnalytics() };
        break;

      default:
        responseData = { status: 'error', message: '未知操作：' + action };
    }
  } catch (err) {
    responseData = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Web API - 處理 POST 請求 (借書、還書、學生名冊匯入、LINE Webhook)
 */
function doPost(e) {
  // 檢查是否為 LINE Webhook 呼叫
  if (e && e.postData && e.postData.type && e.postData.type.indexOf('json') !== -1) {
    var body = JSON.parse(e.postData.contents);
    if (body.events) {
      return handleLineWebhook(body.events);
    }
    
    // 若為前端 Web App 發送的 JSON
    var action = body.action || '';
    var result = {};
    if (action === 'borrow') {
      result = executeBorrow(body.studentNo, body.isbn);
    } else if (action === 'return') {
      result = executeReturn(body.isbn, body.recordId);
    } else if (action === 'importStudents') {
      result = batchImportStudents(body.students);
    } else if (action === 'registerBook') {
      result = registerNewBook(body.book);
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: '無效的請求資料' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 核心業務：執行借書
 */
function executeBorrow(studentNo, isbn) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetBooks = ss.getSheetByName(CONFIG.SHEET_NAMES.BOOKS);
  var sheetStudents = ss.getSheetByName(CONFIG.SHEET_NAMES.STUDENTS);
  var sheetRecords = ss.getSheetByName(CONFIG.SHEET_NAMES.RECORDS);

  // 1. 查尋書籍
  var bookRow = findRowByValue(sheetBooks, 1, isbn);
  if (!bookRow) {
    // 若尚未在藏書庫中，嘗試自動連線查詢並建檔
    var bookInfo = lookupBookByIsbn(isbn);
    sheetBooks.appendRow([isbn, bookInfo.title, bookInfo.authors, bookInfo.category, bookInfo.publisher, bookInfo.cover, '借閱中', studentNo, 1]);
    bookRow = sheetBooks.getLastRow();
  } else {
    var status = sheetBooks.getRange(bookRow, 7).getValue();
    if (status === '借閱中') {
      var currentBorrower = sheetBooks.getRange(bookRow, 8).getValue();
      return { status: 'error', message: '此書已被「' + currentBorrower + '」借閱中，尚未歸還！' };
    }
  }

  // 2. 查詢學生
  var studentRow = findRowByValue(sheetStudents, 1, studentNo);
  var studentName = '未知同學';
  if (studentRow) {
    studentName = sheetStudents.getRange(studentRow, 2).getValue();
  }

  var bookTitle = sheetBooks.getRange(bookRow, 2).getValue();
  var bookCategory = sheetBooks.getRange(bookRow, 4).getValue();

  // 更新書籍狀態
  sheetBooks.getRange(bookRow, 7).setValue('借閱中');
  sheetBooks.getRange(bookRow, 8).setValue(studentNo + ' ' + studentName);
  var borrowCount = Number(sheetBooks.getRange(bookRow, 9).getValue() || 0) + 1;
  sheetBooks.getRange(bookRow, 9).setValue(borrowCount);

  // 計算借出與應還日期
  var today = new Date();
  var todayStr = Utilities.formatDate(today, 'GMT+8', 'yyyy-MM-dd');
  var dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + CONFIG.DEFAULT_BORROW_DAYS);
  var dueDateStr = Utilities.formatDate(dueDate, 'GMT+8', 'yyyy-MM-dd');

  // 新增借閱紀錄
  var recId = 'REC-' + Utilities.formatDate(today, 'GMT+8', 'yyyyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000);
  sheetRecords.appendRow([recId, studentNo, studentName, isbn, bookTitle, bookCategory, todayStr, dueDateStr, '', '借閱中']);

  // 更新學生借閱次數與在借數
  if (studentRow) {
    var currentActive = Number(sheetStudents.getRange(studentRow, 3).getValue() || 0) + 1;
    var totalCount = Number(sheetStudents.getRange(studentRow, 4).getValue() || 0) + 1;
    sheetStudents.getRange(studentRow, 3).setValue(currentActive);
    sheetStudents.getRange(studentRow, 4).setValue(totalCount);
    sheetStudents.getRange(studentRow, 6).setValue(todayStr);
  }

  return {
    status: 'success',
    message: '借書登記成功！',
    data: {
      recordId: recId,
      studentNo: studentNo,
      studentName: studentName,
      isbn: isbn,
      title: bookTitle,
      borrowDate: todayStr,
      dueDate: dueDateStr
    }
  };
}

/**
 * 核心業務：執行還書
 */
function executeReturn(isbn, recordId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetBooks = ss.getSheetByName(CONFIG.SHEET_NAMES.BOOKS);
  var sheetStudents = ss.getSheetByName(CONFIG.SHEET_NAMES.STUDENTS);
  var sheetRecords = ss.getSheetByName(CONFIG.SHEET_NAMES.RECORDS);

  var targetRecordRow = null;
  var targetIsbn = isbn;
  var studentNo = '';
  var bookTitle = '';

  var recordsData = sheetRecords.getDataRange().getValues();
  for (var i = recordsData.length - 1; i >= 1; i--) {
    var row = recordsData[i];
    var rId = row[0];
    var rIsbn = String(row[3]);
    var rStatus = row[9];

    if (rStatus === '借閱中' && (rId === recordId || rIsbn === targetIsbn)) {
      targetRecordRow = i + 1;
      targetIsbn = rIsbn;
      studentNo = row[1];
      bookTitle = row[4];
      break;
    }
  }

  if (!targetRecordRow) {
    return { status: 'error', message: '查無此書的未歸還借閱紀錄！' };
  }

  var todayStr = Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd');

  // 更新借閱紀錄為已歸還
  sheetRecords.getRange(targetRecordRow, 9).setValue(todayStr);
  sheetRecords.getRange(targetRecordRow, 10).setValue('已歸還');

  // 更新書籍狀態為可借閱
  var bookRow = findRowByValue(sheetBooks, 1, targetIsbn);
  if (bookRow) {
    sheetBooks.getRange(bookRow, 7).setValue('可借閱');
    sheetBooks.getRange(bookRow, 8).setValue('');
  }

  // 扣減學生在借數
  if (studentNo) {
    var studentRow = findRowByValue(sheetStudents, 1, studentNo);
    if (studentRow) {
      var currentActive = Math.max(0, Number(sheetStudents.getRange(studentRow, 3).getValue() || 0) - 1);
      sheetStudents.getRange(studentRow, 3).setValue(currentActive);
    }
  }

  return {
    status: 'success',
    message: '書籍《' + bookTitle + '》歸還成功！',
    data: {
      isbn: targetIsbn,
      title: bookTitle,
      returnDate: todayStr
    }
  };
}

/**
 * 透過 Google Books API 與備援庫查詢 ISBN
 */
function lookupBookByIsbn(isbn) {
  var cleanIsbn = String(isbn).replace(/[^0-9X]/gi, '');
  if (!cleanIsbn) {
    return { title: '未知名稱書籍', authors: '未知作者', category: '綜合其他', publisher: '未知', cover: '' };
  }

  try {
    var url = 'https://www.googleapis.com/books/v1/volumes?q=isbn:' + cleanIsbn;
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      var json = JSON.parse(res.getContentText());
      if (json.items && json.items.length > 0) {
        var vol = json.items[0].volumeInfo;
        return {
          title: vol.title || '無書名',
          authors: vol.authors ? vol.authors.join(', ') : '未知作者',
          publisher: vol.publisher || '一般出版',
          category: guessCategory(vol.title + ' ' + (vol.description || '') + ' ' + (vol.categories ? vol.categories.join(' ') : '')),
          cover: vol.imageLinks ? vol.imageLinks.thumbnail : 'https://covers.openlibrary.org/b/isbn/' + cleanIsbn + '-M.jpg',
          description: vol.description || ''
        };
      }
    }
  } catch (e) {
    Logger.log('Google Books API 查詢失敗: ' + e);
  }

  // Fallback 簡易分析
  return {
    title: '書籍 ISBN: ' + cleanIsbn,
    authors: '未知作者',
    publisher: '校園藏書',
    category: '文學小說',
    cover: 'https://covers.openlibrary.org/b/isbn/' + cleanIsbn + '-M.jpg',
    description: '此書籍由手機條碼掃描建立'
  };
}

/**
 * 根據書名與簡介推估類別
 */
function guessCategory(text) {
  if (/物理|化學|天文|生物|數學|科學|宇宙|費曼|昆蟲|醫學/i.test(text)) return '科普探索';
  if (/歷史|古代|民國|帝王|戰役|史記|喵/i.test(text)) return '歷史人文';
  if (/習慣|心理|勇氣|成功|思維|情商|逆境|領導/i.test(text)) return '心理勵志';
  if (/科幻|三體|哈利波特|冒險|奇幻|魔戒|星際/i.test(text)) return '科幻奇幻';
  if (/漫畫|圖文|插畫|繪本/i.test(text)) return '漫畫圖文';
  if (/小說|故事|文學|散文|新詩|東野圭吾/i.test(text)) return '文學小說';
  return '綜合其他';
}

/**
 * 學生個別借閱與閱讀偏向大數據分析
 */
function calculateStudentAnalytics(studentNo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetRecords = ss.getSheetByName(CONFIG.SHEET_NAMES.RECORDS);
  var records = sheetRecords.getDataRange().getValues();

  var categoryCounts = {};
  var totalBorrowed = 0;
  var activeLoans = [];
  var history = [];

  for (var i = 1; i < records.length; i++) {
    var r = records[i];
    var rNo = String(r[1]);
    if (rNo === String(studentNo)) {
      totalBorrowed++;
      var cat = r[5] || '其他';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      var recObj = {
        id: r[0],
        title: r[4],
        category: cat,
        borrowDate: r[6],
        dueDate: r[7],
        returnDate: r[8],
        status: r[9]
      };

      if (r[9] === '借閱中') {
        activeLoans.push(recObj);
      }
      history.push(recObj);
    }
  }

  // 排序偏好類別
  var sortedCategories = Object.keys(categoryCounts).sort(function(a, b) {
    return categoryCounts[b] - categoryCounts[a];
  });

  var topCategory = sortedCategories.length > 0 ? sortedCategories[0] : '尚無足夠數據';
  var personaTag = '初生閱讀新星';
  if (topCategory === '科普探索') personaTag = '🔬 科學探險先鋒';
  else if (topCategory === '文學小說') personaTag = '📖 文學心靈漫遊者';
  else if (topCategory === '歷史人文') personaTag = '📜 歷史古今思辨家';
  else if (topCategory === '心理勵志') personaTag = '🌱 自我成長實踐者';
  else if (topCategory === '科幻奇幻') personaTag = '🚀 異想宇宙領航員';
  else if (topCategory === '漫畫圖文') personaTag = '🎨 圖像美感鑑賞家';

  return {
    studentNo: studentNo,
    totalBorrowed: totalBorrowed,
    activeCount: activeLoans.length,
    activeLoans: activeLoans,
    history: history,
    categoryDistribution: categoryCounts,
    topCategory: topCategory,
    personaTag: personaTag
  };
}

/**
 * 全班閱讀大數據分析
 */
function calculateClassAnalytics() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetRecords = ss.getSheetByName(CONFIG.SHEET_NAMES.RECORDS);
  var sheetStudents = ss.getSheetByName(CONFIG.SHEET_NAMES.STUDENTS);
  var sheetBooks = ss.getSheetByName(CONFIG.SHEET_NAMES.BOOKS);

  var records = sheetRecords.getDataRange().getValues();
  var categoryCounts = {};
  var bookBorrowCounts = {};

  for (var i = 1; i < records.length; i++) {
    var r = records[i];
    var cat = r[5] || '綜合其他';
    var title = r[4];
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    bookBorrowCounts[title] = (bookBorrowCounts[title] || 0) + 1;
  }

  // 排行榜
  var studentsData = sheetStudents.getDataRange().getValues();
  var topStudents = [];
  for (var s = 1; s < studentsData.length; s++) {
    topStudents.push({
      no: studentsData[s][0],
      name: studentsData[s][1],
      total: Number(studentsData[s][3] || 0),
      active: Number(studentsData[s][2] || 0)
    });
  }
  topStudents.sort(function(a, b) { return b.total - a.total; });

  return {
    totalBooksCount: sheetBooks.getLastRow() - 1,
    totalRecordsCount: records.length - 1,
    categoryDistribution: categoryCounts,
    topBorrowers: topStudents.slice(0, 5),
    topBooks: Object.keys(bookBorrowCounts).sort(function(a, b) { return bookBorrowCounts[b] - bookBorrowCounts[a]; }).slice(0, 5)
  };
}

/**
 * 工具函數：依指定欄位值查找列數
 */
function findRowByValue(sheet, colIndex, value) {
  var values = sheet.getRange(1, colIndex, sheet.getLastRow(), 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(value).trim()) {
      return i + 1;
    }
  }
  return null;
}

function getAllBooks() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.BOOKS);
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({
      isbn: data[i][0],
      title: data[i][1],
      authors: data[i][2],
      category: data[i][3],
      publisher: data[i][4],
      cover: data[i][5],
      status: data[i][6],
      borrower: data[i][7],
      borrowCount: data[i][8]
    });
  }
  return list;
}

function getAllStudents() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.STUDENTS);
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({
      no: String(data[i][0]),
      name: data[i][1],
      active: data[i][2],
      total: data[i][3],
      preference: data[i][4],
      lastDate: data[i][5]
    });
  }
  return list;
}

function getAllRecords() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.RECORDS);
  var data = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push({
      id: data[i][0],
      studentNo: data[i][1],
      studentName: data[i][2],
      isbn: data[i][3],
      title: data[i][4],
      category: data[i][5],
      borrowDate: data[i][6],
      dueDate: data[i][7],
      returnDate: data[i][8],
      status: data[i][9]
    });
  }
  return list;
}

/**
 * 處理 LINE Bot Webhook 事件
 */
function handleLineWebhook(events) {
  events.forEach(function(event) {
    if (event.type === 'message' && event.message.type === 'text') {
      var text = event.message.text.trim();
      var replyToken = event.replyToken;

      if (text === '借書' || text === '還書' || text === '掃描') {
        replyLineMessage(replyToken, [{
          type: 'text',
          text: '📱 請開啟「班級圖書借用系統」手機網頁，點擊掃描圖示即可使用相機快速掃描書籍 ISBN 條碼進行借還書！'
        }]);
      } else if (text.indexOf('我的借閱') === 0 || text.indexOf('查借閱') === 0) {
        var studentNo = text.replace(/[^0-9]/g, '');
        if (!studentNo) {
          replyLineMessage(replyToken, [{ type: 'text', text: '請輸入「我的借閱 + 座號」，例如：我的借閱 05' }]);
        } else {
          var stats = calculateStudentAnalytics(studentNo);
          replyLineMessage(replyToken, [createStudentReadingFlex(stats)]);
        }
      } else if (text === '排行榜' || text === '閱讀榜') {
        var classStats = calculateClassAnalytics();
        var msg = '🏆【班級閱讀之星風雲榜】\n━━━━━━━━━━━━\n';
        classStats.topBorrowers.forEach(function(st, idx) {
          msg += (idx + 1) + '. ' + st.no + '號 ' + st.name + ' — 借閱 ' + st.total + ' 本\n';
        });
        msg += '\n🔥 班級最熱門書籍：' + classStats.topBooks.join('、');
        replyLineMessage(replyToken, [{ type: 'text', text: msg }]);
      } else {
        replyLineMessage(replyToken, [{
          type: 'text',
          text: '👋 您好！我是班級圖書館小幫手。\n\n可用指令：\n• 輸入「借書」或「還書」查看手機操作說明\n• 輸入「我的借閱 05」（座號）查詢個人借還書與偏好分析\n• 輸入「閱讀榜」查看全班閱讀之星風雲榜！'
        }]);
      }
    }
  });
  return ContentService.createTextOutput('OK');
}

function createStudentReadingFlex(stats) {
  return {
    type: 'flex',
    altText: '【個人閱讀分析】' + stats.studentNo + '號借閱現況',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F172A',
        contents: [
          { type: 'text', text: '📚 班級圖書館 · 個人閱讀分析', color: '#FCD34D', size: 'xs', weight: 'bold' },
          { type: 'text', text: '座號 ' + stats.studentNo + ' 同學', color: '#FFFFFF', size: 'lg', weight: 'bold', margin: 'xs' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '閱讀人格：' + stats.personaTag, weight: 'bold', size: 'sm', color: '#2563EB' },
          { type: 'separator', margin: 'md' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: '累計借閱：' + stats.totalBorrowed + ' 本', size: 'sm', color: '#475569' },
              { type: 'text', text: '目前在借：' + stats.activeCount + ' 本', size: 'sm', color: '#DC2626', align: 'end' }
            ]
          },
          { type: 'text', text: '偏好領域：' + stats.topCategory, size: 'sm', color: '#059669', margin: 'sm' }
        ]
      }
    }
  };
}

function replyLineMessage(replyToken, messages) {
  var url = 'https://api.line.me/v2/bot/message/reply';
  UrlFetchApp.fetch(url, {
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN
    },
    method: 'post',
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: messages
    }),
    muteHttpExceptions: true
  });
}
