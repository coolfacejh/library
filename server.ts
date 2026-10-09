import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyZ4So0kL10xW8esXzO9N6l3IEHxGPRt40HvT05lFeJ4yA5gYeUpy020UuuvQ-JlsBNKQ/exec';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // API 1: Google Apps Script 예약 요청 프록시 (동적 URL 지원)
  app.post('/api/reserve', async (req, res) => {
    const { itemId, name, email, gasUrl } = req.body;
    const targetUrl = gasUrl ? gasUrl.trim() : DEFAULT_GAS_URL;

    if (!itemId || !name || !email) {
      return res.status(400).json({ error: 'itemId, name, email are required' });
    }

    try {
      // 1. POST 시도
      let gasResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, name, email, action: 'reserve' })
      });

      let responseText = await gasResponse.text();

      // 2. GET 쿼리스트링 2차 시도 (GET으로도 예약 처리)
      if (responseText.includes('doPost') || responseText.includes('找不到名為「index」') || !responseText.includes('success')) {
        const queryUrl = `${targetUrl}?action=reserve&itemId=${encodeURIComponent(itemId)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
        const getRes = await fetch(queryUrl);
        const getText = await getRes.text();
        if (!getText.includes('找不到名為「index」')) {
          responseText = getText;
        }
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      const isError = responseText.includes('找不到名為「index」') || responseText.includes('doPost');

      return res.json({
        success: !isError,
        isError,
        data,
        targetUrl,
        responseText: responseText.slice(0, 300)
      });
    } catch (err: any) {
      console.error('GAS Relay Error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API 2: URL 연결 테스트
  app.post('/api/test-url', async (req, res) => {
    const { gasUrl } = req.body;
    const testUrl = gasUrl ? gasUrl.trim() : DEFAULT_GAS_URL;

    try {
      const getRes = await fetch(testUrl);
      const getText = await getRes.text();

      const isConnected = getText.includes('도서관 예약 백엔드가 구글 시트에 연결되었습니다') || 
                          getText.includes('정상 작동') || 
                          getText.includes('도서관');

      return res.json({
        success: true,
        testUrl,
        isConnected,
        isOldIndexError: getText.includes('找不到名為「index」'),
        snippet: getText.slice(0, 200)
      });
    } catch (err: any) {
      return res.json({ success: false, error: err.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
