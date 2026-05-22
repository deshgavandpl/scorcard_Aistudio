import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Server-side Match Summary Generation API
  app.post('/api/match-summary', async (req, res) => {
    try {
      const { matchData } = req.body;
      if (!matchData) {
        return res.status(400).json({ error: 'matchData is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing.' });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `As a friendly and expert cricket commentator, provide a brief, engaging summary of this cricket match. 
Structure your response as follows:
1. A catchy headline for the match.
2. A brief summary of the 1st innings (key performers and total).
3. A brief summary of the 2nd innings (how the chase went or how the defense succeeded).
4. A final concluding sentence on the overall result.

Keep the total length under 180 words. Use a user-friendly, conversational tone.

Match Data: ${JSON.stringify(matchData, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      const summaryText = response.text || 'Could not generate summary.';
      return res.json({ summary: summaryText });
    } catch (error: any) {
      console.error('Match Summary generation failed:', error);
      return res.status(500).json({ error: error.message || 'Internal GenAI error' });
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
