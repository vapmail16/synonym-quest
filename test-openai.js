// Quick test script to verify OpenAI API key
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('🔑 Testing OpenAI API key...');
    console.log('API Key (first 10 chars):', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Say 'Hello, API is working!' if you can read this."
        }
      ],
      max_tokens: 20
    });

    console.log('✅ OpenAI API is working!');
    console.log('Response:', completion.choices[0].message.content);
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    console.error('Error code:', error.code);
  }
}

testOpenAI();
