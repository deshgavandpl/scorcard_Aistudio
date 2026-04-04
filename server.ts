import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy for CricketData.org
  app.get('/api/external/matches', async (req, res) => {
    const apiKey = process.env.CRICKET_API_KEY;
    
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      return res.status(400).json({ 
        error: 'CRICKET_API_KEY is missing. Please add it to your Secrets in AI Studio.' 
      });
    }

    try {
      const response = await fetch(`https://api.cricketdata.org/v1/currentMatches?apikey=${apiKey}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('External API Error:', errorText);
        return res.status(response.status).json({ 
          error: `External API returned ${response.status}: ${errorText}` 
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching external matches:', error);
      res.status(500).json({ error: 'Failed to connect to the Cricket API. Check your internet connection.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
