const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');

const aiServices = [
  // Text & Writing
  { name: "ChatGPT", description: "Advanced language model for conversation, writing, coding, and analysis", category: "Text", url: "https://chat.openai.com", logo_url: "https://ui-avatars.com/api/?name=ChatGPT&background=10a37f&color=fff" },
  { name: "Claude", description: "Anthropic's helpful, harmless AI assistant for complex tasks", category: "Text", url: "https://claude.ai", logo_url: "https://ui-avatars.com/api/?name=Claude&background=d97757&color=fff" },
  { name: "Gemini", description: "Google's multimodal AI model for text, images, and code", category: "Text", url: "https://gemini.google.com", logo_url: "https://ui-avatars.com/api/?name=Gemini&background=4285f4&color=fff" },
  { name: "Perplexity AI", description: "AI-powered search engine with citations and real-time info", category: "Text", url: "https://perplexity.ai", logo_url: "https://ui-avatars.com/api/?name=Perplexity&background=1a1a1a&color=fff" },
  { name: "Jasper", description: "AI content creation platform for marketing and blogs", category: "Text", url: "https://jasper.ai", logo_url: "https://ui-avatars.com/api/?name=Jasper&background=6c47ff&color=fff" },
  { name: "Copy.ai", description: "Generate marketing copy, product descriptions, and social posts", category: "Text", url: "https://copy.ai", logo_url: "https://ui-avatars.com/api/?name=Copy&background=30b57b&color=fff" },
  { name: "Wordtune", description: "AI writing companion for rewriting and paraphrasing", category: "Text", url: "https://wordtune.com", logo_url: "https://ui-avatars.com/api/?name=Wordtune&background=0099cc&color=fff" },
  { name: "Quillbot", description: "Paraphrasing tool and grammar checker", category: "Text", url: "https://quillbot.com", logo_url: "https://ui-avatars.com/api/?name=Quillbot&background=1a73e8&color=fff" },
  { name: "Grammarly", description: "AI writing assistant for grammar and style improvement", category: "Text", url: "https://grammarly.com", logo_url: "https://ui-avatars.com/api/?name=Grammarly&background=15c39a&color=fff" },
  { name: "Notion AI", description: "AI-powered workspace for notes, docs, and knowledge management", category: "Productivity", url: "https://notion.so", logo_url: "https://ui-avatars.com/api/?name=Notion&background=000000&color=fff" },
  
  // Image Generation
  { name: "Midjourney", description: "AI art generator with unique artistic styles", category: "Image", url: "https://midjourney.com", logo_url: "https://ui-avatars.com/api/?name=Midjourney&background=000000&color=fff" },
  { name: "DALL-E 3", description: "OpenAI's image generation model with high accuracy", category: "Image", url: "https://openai.com/dall-e-3", logo_url: "https://ui-avatars.com/api/?name=DALL-E&background=10a37f&color=fff" },
  { name: "Stable Diffusion", description: "Open-source text-to-image generation model", category: "Image", url: "https://stability.ai", logo_url: "https://ui-avatars.com/api/?name=Stable&background=4d25a1&color=fff" },
  { name: "Leonardo.ai", description: "AI image and video generation platform for creators", category: "Image", url: "https://leonardo.ai", logo_url: "https://ui-avatars.com/api/?name=Leonardo&background=2b3b5a&color=fff" },
  { name: "Adobe Firefly", description: "Creative generative AI in Adobe apps", category: "Image", url: "https://firefly.adobe.com", logo_url: "https://ui-avatars.com/api/?name=Firefly&background=ff0000&color=fff" },
  { name: "Pixlr AI", description: "AI-powered image editing and generation", category: "Image", url: "https://pixlr.com", logo_url: "https://ui-avatars.com/api/?name=Pixlr&background=1d7e6c&color=fff" },
  { name: "Canva AI", description: "AI design tools in Canva platform", category: "Image", url: "https://canva.com", logo_url: "https://ui-avatars.com/api/?name=Canva&background=00c4cc&color=fff" },
  { name: "Lensa", description: "AI photo editing and avatar creation", category: "Image", url: "https://lensa.ai", logo_url: "https://ui-avatars.com/api/?name=Lensa&background=fe5ba3&color=fff" },
  
  // Video
  { name: "Runway ML", description: "AI video editing and generation tools", category: "Video", url: "https://runwayml.com", logo_url: "https://ui-avatars.com/api/?name=Runway&background=000000&color=fff" },
  { name: "Synthesia", description: "AI video generation with digital avatars", category: "Video", url: "https://synthesia.io", logo_url: "https://ui-avatars.com/api/?name=Synthesia&background=1a237e&color=fff" },
  { name: "Tome.app", description: "AI-powered storytelling and presentation tool", category: "Video", url: "https://tome.app", logo_url: "https://ui-avatars.com/api/?name=Tome&background=6200ea&color=fff" },
  { name: "Gamma", description: "AI presentation generator", category: "Video", url: "https://gamma.app", logo_url: "https://ui-avatars.com/api/?name=Gamma&background=ff4d4d&color=fff" },
  
  // Audio
  { name: "ElevenLabs", description: "AI voice synthesis and text-to-speech", category: "Audio", url: "https://elevenlabs.io", logo_url: "https://ui-avatars.com/api/?name=Eleven&background=0a0a0a&color=fff" },
  { name: "Murf", description: "AI voice generator for podcasts and videos", category: "Audio", url: "https://murf.ai", logo_url: "https://ui-avatars.com/api/?name=Murf&background=662d91&color=fff" },
  { name: "Descript", description: "AI-powered audio/video editing with transcription", category: "Audio", url: "https://descript.com", logo_url: "https://ui-avatars.com/api/?name=Descript&background=2c2c2c&color=fff" },
  { name: "Otter.ai", description: "AI meeting transcription and notes", category: "Audio", url: "https://otter.ai", logo_url: "https://ui-avatars.com/api/?name=Otter&background=36a9e0&color=fff" },
  { name: "Fireflies.ai", description: "Automated meeting recording and transcription", category: "Audio", url: "https://fireflies.ai", logo_url: "https://ui-avatars.com/api/?name=Fireflies&background=ff7e1e&color=fff" },
  { name: "Krisp", description: "AI noise cancellation for calls", category: "Audio", url: "https://krisp.ai", logo_url: "https://ui-avatars.com/api/?name=Krisp&background=1c1c1c&color=fff" },
  
  // Code & Development
  { name: "GitHub Copilot", description: "AI pair programmer for code suggestions", category: "Code", url: "https://github.com/features/copilot", logo_url: "https://ui-avatars.com/api/?name=Copilot&background=000000&color=fff" },
  { name: "Tabnine", description: "AI code completion for multiple IDEs", category: "Code", url: "https://tabnine.com", logo_url: "https://ui-avatars.com/api/?name=Tabnine&background=00b09b&color=fff" },
  { name: "Mutable.ai", description: "AI-powered code generation and refactoring", category: "Code", url: "https://mutable.ai", logo_url: "https://ui-avatars.com/api/?name=Mutable&background=009688&color=fff" },
  { name: "v0.dev", description: "Generative UI component builder", category: "Code", url: "https://v0.dev", logo_url: "https://ui-avatars.com/api/?name=v0&background=000000&color=fff" },
  { name: "Replit AI", description: "AI coding assistant in the browser", category: "Code", url: "https://replit.com", logo_url: "https://ui-avatars.com/api/?name=Replit&background=f26207&color=fff" },
  
  // Productivity & Automation
  { name: "Zapier AI", description: "Automate workflows with AI", category: "Productivity", url: "https://zapier.com", logo_url: "https://ui-avatars.com/api/?name=Zapier&background=ff4a00&color=fff" },
  { name: "Mem", description: "AI-powered note-taking and knowledge management", category: "Productivity", url: "https://mem.ai", logo_url: "https://ui-avatars.com/api/?name=Mem&background=4a4a4a&color=fff" },
  { name: "Framer AI", description: "AI website builder and design tool", category: "Productivity", url: "https://framer.com", logo_url: "https://ui-avatars.com/api/?name=Framer&background=0055ff&color=fff" },
  { name: "Galileo AI", description: "AI UI design generation", category: "Productivity", url: "https://galileo.ai", logo_url: "https://ui-avatars.com/api/?name=Galileo&background=2d3748&color=fff" },
  { name: "Uizard", description: "Convert sketches to digital designs with AI", category: "Productivity", url: "https://uizard.io", logo_url: "https://ui-avatars.com/api/?name=Uizard&background=8b5cf6&color=fff" },
  
  // Research & Data
  { name: "Hugging Face", description: "AI models and datasets hub", category: "Text", url: "https://huggingface.co", logo_url: "https://ui-avatars.com/api/?name=Hugging&background=fcd34d&color=000" },
  { name: "Replicate", description: "Run and deploy AI models in the cloud", category: "Code", url: "https://replicate.com", logo_url: "https://ui-avatars.com/api/?name=Replicate&background=000000&color=fff" },
  { name: "Cohere", description: "NLP models for text generation and embedding", category: "Text", url: "https://cohere.com", logo_url: "https://ui-avatars.com/api/?name=Cohere&background=1e40af&color=fff" },
  { name: "LangChain", description: "Framework for LLM application development", category: "Code", url: "https://langchain.com", logo_url: "https://ui-avatars.com/api/?name=LangChain&background=0ea5e9&color=fff" },
  { name: "Airtable AI", description: "AI-powered database and spreadsheet tool", category: "Productivity", url: "https://airtable.com", logo_url: "https://ui-avatars.com/api/?name=Airtable&background=18befe&color=fff" },
  { name: "Tableau GPT", description: "AI-powered data analytics and visualization", category: "Data", url: "https://tableau.com", logo_url: "https://ui-avatars.com/api/?name=Tableau&background=e8533c&color=fff" },
  { name: "Browse AI", description: "Extract and monitor web data with AI", category: "Productivity", url: "https://browse.ai", logo_url: "https://ui-avatars.com/api/?name=Browse&background=0052cc&color=fff" }
];

async function initDatabase() {
  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory');
  }

  const dbPath = path.join(dataDir, 'ai-services.db');
  console.log('Database path:', dbPath);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      logo_url TEXT,
      status TEXT DEFAULT 'approved',
      submitted_by INTEGER,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_by INTEGER,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submitted_by) REFERENCES users(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER,
      service_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, service_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pending_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL,
      logo_url TEXT,
      submitted_by INTEGER NOT NULL,
      submitter_email TEXT,
      status TEXT DEFAULT 'pending',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      rejection_reason TEXT,
      FOREIGN KEY (submitted_by) REFERENCES users(id)
    );
  `);
  
  // Hash password for admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  // Insert admin user (only if not exists)
  await db.run(`
    INSERT OR IGNORE INTO users (email, password_hash, role, is_active) 
    VALUES ('admin@example.com', ?, 'admin', 1)
  `, [hashedPassword]);
  
  // Insert test regular user
  const testUserHash = await bcrypt.hash('user123', 10);
  await db.run(`
    INSERT OR IGNORE INTO users (email, password_hash, role, is_active) 
    VALUES ('user@example.com', ?, 'user', 1)
  `, [testUserHash]);
  
  // Insert AI services
  let insertedCount = 0;
  for (const service of aiServices) {
    const result = await db.run(`
      INSERT OR IGNORE INTO services (name, description, url, category, logo_url, status) 
      VALUES (?, ?, ?, ?, ?, 'approved')
    `, [service.name, service.description, service.url, service.category, service.logo_url]);
    
    if (result.changes > 0) {
      insertedCount++;
    }
  }
  
  console.log(`Database initialized successfully!`);
  console.log(`Total services in database: ${aiServices.length}`);
  console.log(`New services added: ${insertedCount}`);
  console.log(`\n✅ Admin login: admin@example.com / admin123`);
  console.log(`✅ Test User login: user@example.com / user123`);
  console.log(`\n🚀 Run 'npm start' to launch the server`);
  console.log(`\n📝 New Feature: Users can submit AI services for admin approval!`);
}

initDatabase().catch(err => {
  console.error('Error initializing database:', err);
});