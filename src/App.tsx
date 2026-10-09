/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  Copy, 
  Check, 
  Code2, 
  AlertCircle, 
  Calendar, 
  User, 
  Mail, 
  BookmarkCheck,
  Sparkles,
  Layers,
  Table,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Radio,
  FileSpreadsheet,
  Link2,
  Send
} from 'lucide-react';

interface BookItem {
  id: string;
  title: string;
  category: string;
}

interface LoanRecord {
  reservationId: string;
  bookId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  status: string;
}

const ALL_BOOKS: BookItem[] = [
  { id: 'B001', title: '클린 코드 (Clean Code)', category: 'IT/개발' },
  { id: 'B002', title: '이펙티브 자바 (Effective Java)', category: 'IT/개발' },
  { id: 'B003', title: '혼자 공부하는 파이썬', category: 'IT/개발' },
  { id: 'B004', title: '트렌드 코리아 2026', category: '경제/경영' },
  { id: 'B005', title: '돈의 속성', category: '경제/경영' },
  { id: 'B006', title: '세이노의 가르침', category: '자기계발' },
  { id: 'B007', title: '원씽 (The One Thing)', category: '자기계발' },
  { id: 'B008', title: '불편한 편의점', category: '소설' },
  { id: 'B009', title: '코스모스 (Cosmos)', category: '과학' },
  { id: 'B010', title: '사피엔스 (Sapiens)', category: '역사/인문' }
];

const INITIAL_LOANS: LoanRecord[] = [
  {
    reservationId: 'RES-1791528657',
    bookId: 'B002',
    userName: '김정혜',
    userEmail: 'coolfacejh@iceu.kr',
    timestamp: '2026. 10. 9 오후 3:12',
    status: 'CONFIRMED'
  },
  {
    reservationId: 'RES-1791528682',
    bookId: 'B001',
    userName: 'Jeju GE김정혜',
    userEmail: 'coolfacejh@iceu.kr',
    timestamp: '2026. 10. 9 오후 3:15',
    status: 'CONFIRMED'
  }
];

const INITIAL_GAS_URL = 'https://script.google.com/macros/s/AKfycbyZ4So0kL10xW8esXzO9N6l3IEHxGPRt40HvT05lFeJ4yA5gYeUpy020UuuvQ-JlsBNKQ/exec';

export default function App() {
  const [activeTab, setActiveTab] = useState<'books' | 'loans'>('books');
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [books] = useState<BookItem[]>(ALL_BOOKS);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Gas URL State
  const [gasUrl, setGasUrl] = useState<string>(INITIAL_GAS_URL);
  const [testingUrl, setTestingUrl] = useState<boolean>(false);
  const [urlStatusMsg, setUrlStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Search & filter
  const [loanSearch, setLoanSearch] = useState<string>('');
  const [bookSearch, setBookSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('coolfacejh@iceu.kr');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successRecord, setSuccessRecord] = useState<LoanRecord | null>(null);
  const [sheetNotice, setSheetNotice] = useState<string>('');

  // Code inspection modal
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'gs' | 'html'>('gs');
  const [htmlCode, setHtmlCode] = useState<string>('');
  const [gsCode, setGsCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch('/gas_index.html')
      .then(res => res.text())
      .then(data => setHtmlCode(data))
      .catch(() => {});

    fetch('/Code.gs')
      .then(res => res.text())
      .then(data => setGsCode(data))
      .catch(() => {});

    const savedUrl = localStorage.getItem('user_gas_url');
    if (savedUrl) setGasUrl(savedUrl);

    loadData();
  }, []);

  const loadData = () => {
    setRefreshing(true);
    setTimeout(() => {
      const stored = localStorage.getItem('lib_loans_v2');
      if (stored) {
        try { setLoans(JSON.parse(stored)); } catch { setLoans(INITIAL_LOANS); }
      } else {
        setLoans(INITIAL_LOANS);
      }
      setRefreshing(false);
    }, 250);
  };

  const handleTestAndSaveUrl = async () => {
    setTestingUrl(true);
    setUrlStatusMsg(null);
    try {
      const res = await fetch('/api/test-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl: gasUrl.trim() })
      });
      const data = await res.json();
      setTestingUrl(false);

      if (data.isConnected) {
        localStorage.setItem('user_gas_url', gasUrl.trim());
        setUrlStatusMsg({
          success: true,
          text: '✅ 정상 연결 확인됨! [도서관 예약 백엔드가 구글 시트에 연결되었습니다] 응답을 수신했습니다.'
        });
      } else if (data.isOldIndexError) {
        setUrlStatusMsg({
          success: false,
          text: '⚠️ 이전 배포 URL입니다. 구글 시트에서 [새 배포] 시 생성된 최신 URL을 붙여넣어 주세요.'
        });
      } else {
        setUrlStatusMsg({
          success: false,
          text: `응답 수신됨: "${data.snippet || '알 수 없는 응답'}"`
        });
      }
    } catch (err: any) {
      setTestingUrl(false);
      setUrlStatusMsg({ success: false, text: '연결 실패: ' + err.message });
    }
  };

  const bookMap = useMemo(() => {
    const map = new Map<string, BookItem>();
    books.forEach(b => map.set(b.id, b));
    return map;
  }, [books]);

  const activeLoanedBookIds = useMemo(() => {
    return new Set(
      loans
        .filter(l => l.status === 'CONFIRMED' || l.status === '대출중')
        .map(l => l.bookId)
    );
  }, [loans]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    books.forEach(b => set.add(b.category));
    return ['ALL', ...Array.from(set)];
  }, [books]);

  const filteredLoans = useMemo(() => {
    const q = loanSearch.trim().toLowerCase();
    if (!q) return loans;
    return loans.filter(l => {
      const title = bookMap.get(l.bookId)?.title || '';
      return (
        l.reservationId.toLowerCase().includes(q) ||
        l.bookId.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.userEmail.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q)
      );
    });
  }, [loans, loanSearch, bookMap]);

  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    return books.filter(b => {
      const matchCat = selectedCategory === 'ALL' || b.category === selectedCategory;
      const matchQ = !q || b.title.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [books, selectedCategory, bookSearch]);

  // Submit Reservation
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !userName.trim() || !userEmail.trim()) return;

    setSubmitting(true);
    const book = selectedBook;
    const name = userName.trim();
    const email = userEmail.trim();

    try {
      const response = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: book.id,
          name: name,
          email: email,
          gasUrl: gasUrl.trim()
        })
      });

      const resData = await response.json();

      const timestampMillis = new Date().getTime();
      const resId = 'RES-' + String(timestampMillis).slice(0, 9) + Math.floor(100 + Math.random() * 900);
      const now = new Date();
      const formattedDate = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. 오후 ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newRecord: LoanRecord = {
        reservationId: resId,
        bookId: book.id,
        userName: name,
        userEmail: email,
        timestamp: formattedDate,
        status: 'CONFIRMED'
      };

      const updated = [newRecord, ...loans];
      setLoans(updated);
      localStorage.setItem('lib_loans_v2', JSON.stringify(updated));

      setSubmitting(false);
      setSelectedBook(null);
      setUserName('');
      setSuccessRecord(newRecord);

      if (resData.success) {
        setSheetNotice('🎉 구글 스프레드시트에 즉시 전송되었습니다! 지금 구글 시트 화면을 확인해 보세요.');
      } else {
        setSheetNotice('구글 시트 전송 결과: 아래 연결 URL 상태를 확인해 주세요.');
      }
    } catch (err: any) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Real-time Google Sheet Sync Endpoint Bar */}
      <div className="bg-slate-900 text-white text-xs px-4 py-3 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col gap-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-emerald-400">
                연동할 구글 시트 웹앱 주소:
              </span>
              <span className="text-slate-300 hidden sm:inline">
                (AI Studio에서 예약하기를 누르면 이 주소를 통해 구글 시트에 즉시 행이 추가됩니다)
              </span>
            </div>

            <button
              onClick={() => { setActiveCodeTab('gs'); setShowCodeModal(true); }}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2.5 py-1 rounded text-xs transition border border-slate-700 self-start md:self-auto"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>백엔드 Code.gs 확인</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={handleTestAndSaveUrl}
              disabled={testingUrl}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              {testingUrl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>연결 테스트 & 적용</span>
            </button>
          </div>

          {urlStatusMsg && (
            <div className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
              urlStatusMsg.success ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-amber-950/80 text-amber-300 border border-amber-800'
            }`}>
              <span>{urlStatusMsg.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                  도서관 도서 대출 예약 시스템
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  구글 시트 연동 활성화
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                여기서 예약 신청 시 사용자님의 구글 시트 화면에 새 행이 실시간으로 추가됩니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('books')}
                className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'books'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>도서 목록 ({books.length - activeLoanedBookIds.size})</span>
              </button>
              <button
                onClick={() => setActiveTab('loans')}
                className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'loans'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>대출 현황 ({loans.length})</span>
              </button>
            </div>

            <button
              onClick={loadData}
              disabled={refreshing}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50/70 via-slate-50/40 to-transparent border-b border-slate-200/80 py-7 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 mb-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>구글 스프레드시트 실시간 연동 시스템</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                AI Studio에서 도서를 선택하고 즉시 예약하세요
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                도서 카드에서 <span className="font-bold text-blue-600">[예약하기]</span>를 누르면, 
                사용자님의 구글 시트 
                <span className="font-semibold text-slate-800"> [A열: 예약번호] [B열: 도서코드] [C열: 성함] [D열: 이메일] [E열: 일시] [F열: CONFIRMED]</span>에
                새 행이 1초 만에 바로 들어갑니다!
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200/90 self-start lg:self-auto">
              <div className="text-center px-4 border-r border-slate-100">
                <p className="text-xs text-slate-500 font-medium">대출 가능</p>
                <p className="text-xl font-black text-emerald-600">{Math.max(0, books.length - activeLoanedBookIds.size)}</p>
              </div>
              <div className="text-center px-4 border-r border-slate-100">
                <p className="text-xs text-slate-500 font-medium">대출중(CONFIRMED)</p>
                <p className="text-xl font-black text-blue-600">{activeLoanedBookIds.size}</p>
              </div>
              <div className="text-center px-4">
                <p className="text-xs text-slate-500 font-medium">총 도서수</p>
                <p className="text-xl font-black text-slate-800">{books.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">

        {/* TAB 1: 도서 목록 및 예약 (Books View) */}
        {activeTab === 'books' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="도서명 또는 도서 코드(예: B001, 클린 코드...) 검색"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'ALL' ? '전체 카테고리' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBooks.map((book) => {
                const loanInfo = loans.find(l => l.bookId === book.id && (l.status === 'CONFIRMED' || l.status === '대출중'));
                const isLoaned = !!loanInfo;

                return (
                  <div 
                    key={book.id}
                    className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition flex flex-col justify-between ${
                      isLoaned ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {book.id}
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                          {book.category}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-2">
                        {book.title}
                      </h4>

                      {isLoaned ? (
                        <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-blue-900">대출자: {loanInfo.userName}</span>
                            <span className="font-mono text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.5 rounded">
                              CONFIRMED
                            </span>
                          </div>
                          <p className="text-blue-700 text-[11px] truncate flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            {loanInfo.timestamp}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-3">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          대출 가능 (AVAILABLE)
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">단일권 보관중</span>
                      {isLoaned ? (
                        <button 
                          disabled 
                          className="px-3.5 py-2 text-xs font-semibold text-slate-400 bg-slate-200/80 rounded-xl cursor-not-allowed"
                        >
                          대출중 (예약 마감)
                        </button>
                      ) : (
                        <button 
                          onClick={() => setSelectedBook(book)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs shadow-blue-500/20 transition"
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>예약하기</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: 대출 현황 테이블 (Loans View) */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Table className="w-4 h-4 text-blue-600" />
                  <span>스프레드시트 도서 대출 현황 (A열 ~ F열)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  구글 시트의 행(Row)과 100% 동일한 컬럼 구조입니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    value={loanSearch}
                    onChange={(e) => setLoanSearch(e.target.value)}
                    placeholder="예약번호, 코드, 이름, 이메일 검색..."
                    className="w-56 sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  />
                </div>

                <button
                  onClick={() => setActiveTab('books')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
                >
                  <span>+ 새 대출 예약</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">A열 (예약 번호)</th>
                      <th className="py-3 px-4">B열 (도서 코드)</th>
                      <th className="py-3 px-4">도서명</th>
                      <th className="py-3 px-4">C열 (신청자 성함)</th>
                      <th className="py-3 px-4">D열 (이메일)</th>
                      <th className="py-3 px-4">E열 (대출 일시)</th>
                      <th className="py-3 px-4 text-center">F열 (상태)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredLoans.map((row) => {
                      const book = bookMap.get(row.bookId);
                      return (
                        <tr key={row.reservationId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                            {row.reservationId}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                            {row.bookId}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs truncate">
                            {book?.title || '기타 도서'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800">
                            {row.userName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                            {row.userEmail}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                            {row.timestamp}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {row.status || 'CONFIRMED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Reservation Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => !submitting && setSelectedBook(null)}
          />

          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                구글 시트 연동 도서 대출 신청
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2 leading-snug">
                {selectedBook.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                도서 코드: <span className="font-mono font-bold text-slate-800">{selectedBook.id}</span>
                <span className="mx-2">•</span>
                카테고리: <span className="font-medium text-slate-700">{selectedBook.category}</span>
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  신청자 성함 (시트 C열 기입) <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="예: 김정혜"
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  이메일 주소 (시트 D열 기입) <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="예: coolfacejh@iceu.kr"
                  disabled={submitting}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 text-xs">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  구글 스프레드시트 실시간 쓰기
                </p>
                <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
                  [예약하기] 클릭 시 연동된 구글 웹앱을 통해 스프레드시트에 새 행이 실시간으로 추가됩니다.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBook(null)}
                  disabled={submitting}
                  className="w-1/3 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>시트 전송 중...</span>
                    </>
                  ) : (
                    <>
                      <BookmarkCheck className="w-4 h-4" />
                      <span>대출 예약하기</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => { setSuccessRecord(null); setActiveTab('loans'); }}
          />

          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 text-center shadow-2xl border border-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <CheckCircle className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">도서 대출 예약 완료!</h3>
            <p className="text-xs text-emerald-700 font-semibold mt-1">
              {sheetNotice}
            </p>

            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">A열 예약번호</span>
                <span className="font-mono font-bold text-blue-600 text-sm">{successRecord.reservationId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">B열 도서코드</span>
                <span className="font-mono font-bold text-slate-800">{successRecord.bookId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">C열 신청자</span>
                <span className="font-bold text-slate-800">{successRecord.userName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">D열 이메일</span>
                <span className="text-slate-600">{successRecord.userEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">E열 일시</span>
                <span className="text-slate-600">{successRecord.timestamp}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500">F열 상태</span>
                <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                  CONFIRMED
                </span>
              </div>
            </div>

            <button
              onClick={() => { setSuccessRecord(null); setActiveTab('loans'); }}
              className="mt-5 w-full py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition"
            >
              대출 현황 확인하기
            </button>
          </div>
        </div>
      )}

      {/* Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
          <div 
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity"
            onClick={() => setShowCodeModal(false)}
          />

          <div className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    구글 시트 연동 백엔드 코드
                  </h3>
                  <p className="text-xs text-slate-500">
                    구글 시트에 행을 직접 기록하는 Apps Script 코드입니다.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCodeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pt-4 flex items-center justify-between border-b border-slate-200 bg-white">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveCodeTab('gs')}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
                    activeCodeTab === 'gs'
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ⚙️ Code.gs (구글 시트 직접 기록 코드)
                </button>
              </div>

              <button
                onClick={() => copyToClipboard(gsCode)}
                className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '복사 완료!' : 'Code.gs 전체 복사'}</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-900 text-slate-200 text-xs font-mono">
              <pre className="whitespace-pre-wrap leading-relaxed select-all">
                {gsCode}
              </pre>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>구글 스프레드시트의 Apps Script에 붙여넣고 배포하세요.</span>
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 도서관 도서 대출 관리 시스템. Google Sheets Direct Sync.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>AI Studio와 구글 시트 실시간 연동 중</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
