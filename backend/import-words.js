const XLSX = require('xlsx');
const OpenAI = require('openai');
require('dotenv').config();

// Database connection
const { Sequelize, DataTypes } = require('sequelize');

// Create Sequelize instance
const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'synonym_quest',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  dialect: 'postgres',
  logging: false,
});

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Word model
const WordModel = sequelize.define('Word', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  word: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  synonyms: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    allowNull: false,
    defaultValue: 'easy',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  lastReviewed: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  correctCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  incorrectCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
}, {
  tableName: 'words',
  timestamps: true,
  updatedAt: false,
});

async function clearDatabase() {
  console.log('🗑️  Clearing existing words from database...');
  await WordModel.destroy({ where: {} });
  console.log('✅ Database cleared successfully');
}

async function readExcelFile() {
  console.log('📖 Reading words from Excel file...');
  const workbook = XLSX.readFile('../words.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Found ${data.length} rows in Excel file`);
  
  // Extract words (assuming first column contains words)
  const words = data.map(row => {
    const keys = Object.keys(row);
    const firstKey = keys[0];
    return row[firstKey]?.toString().trim();
  }).filter(word => word && word.length > 0);
  
  console.log(`📝 Extracted ${words.length} unique words`);
  return [...new Set(words)]; // Remove duplicates
}

async function generateSynonymsWithTypes(word) {
  console.log(`🤖 Generating synonyms for: "${word}"`);
  
  try {
    const prompt = `Generate 4-5 synonyms for the word "${word}". For each synonym, classify it as either:
- "exact": words that mean exactly the same thing
- "near": words that have similar meaning but are not exactly the same

Return your response in this JSON format:
{
  "synonyms": [
    {"word": "synonym1", "type": "exact"},
    {"word": "synonym2", "type": "near"},
    {"word": "synonym3", "type": "exact"},
    {"word": "synonym4", "type": "near"},
    {"word": "synonym5", "type": "exact"}
  ]
}

Make sure to provide a good mix of exact and near synonyms. Only return valid JSON, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const responseText = completion.choices[0].message.content.trim();
    console.log(`📝 Raw AI response for "${word}":`, responseText);

    // Parse JSON response
    let synonymsData;
    try {
      synonymsData = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON for "${word}":`, responseText);
      // Fallback: create basic synonyms
      return [
        { word: `${word}-like`, type: "near" },
        { word: `${word}-ish`, type: "near" },
        { word: `${word}-esque`, type: "near" },
        { word: `similar to ${word}`, type: "near" }
      ];
    }

    if (!synonymsData.synonyms || !Array.isArray(synonymsData.synonyms)) {
      console.error(`❌ Invalid response structure for "${word}"`);
      return [
        { word: `${word}-like`, type: "near" },
        { word: `${word}-ish`, type: "near" },
        { word: `${word}-esque`, type: "near" }
      ];
    }

    // Validate and clean synonyms
    const validSynonyms = synonymsData.synonyms
      .filter(s => s.word && s.type && (s.type === 'exact' || s.type === 'near'))
      .map(s => ({
        word: s.word.trim().toLowerCase(),
        type: s.type
      }))
      .filter(s => s.word !== word.toLowerCase()) // Remove the word itself
      .slice(0, 5); // Limit to 5 synonyms

    console.log(`✅ Generated ${validSynonyms.length} synonyms for "${word}":`, validSynonyms);
    return validSynonyms;

  } catch (error) {
    console.error(`❌ Error generating synonyms for "${word}":`, error.message);
    // Fallback synonyms
    return [
      { word: `${word}-like`, type: "near" },
      { word: `${word}-ish`, type: "near" },
      { word: `${word}-esque`, type: "near" }
    ];
  }
}

async function determineDifficulty(word, synonyms) {
  // Simple difficulty determination based on word length and synonym count
  if (word.length <= 4 && synonyms.length >= 4) {
    return 'easy';
  } else if (word.length <= 8 && synonyms.length >= 3) {
    return 'medium';
  } else {
    return 'hard';
  }
}

async function importWords() {
  try {
    console.log('🚀 Starting word import process...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Clear existing data
    await clearDatabase();
    
    // Read words from Excel
    const words = await readExcelFile();
    
    console.log(`\n📚 Processing ${words.length} words...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      console.log(`\n[${i + 1}/${words.length}] Processing: "${word}"`);
      
      try {
        // Generate synonyms with types
        const synonyms = await generateSynonymsWithTypes(word);
        
        // Determine difficulty
        const difficulty = await determineDifficulty(word, synonyms);
        
        // Create word record
        await WordModel.create({
          word: word.toLowerCase(),
          synonyms: synonyms,
          category: 'general', // Default category
          difficulty: difficulty,
          tags: ['imported', 'ai-generated']
        });
        
        successCount++;
        console.log(`✅ Successfully imported: "${word}" with ${synonyms.length} synonyms`);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to import "${word}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Import completed!`);
    console.log(`✅ Successfully imported: ${successCount} words`);
    console.log(`❌ Failed to import: ${errorCount} words`);
    console.log(`📊 Total words in database: ${successCount}`);
    
  } catch (error) {
    console.error('❌ Import process failed:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the import
importWords().catch(console.error);
