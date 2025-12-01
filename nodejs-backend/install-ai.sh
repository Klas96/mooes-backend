#!/bin/bash

echo "Installing OpenAI dependency for Mooves KeyMaker..."
npm install openai@^4.20.1

echo ""
echo "✅ OpenAI dependency installed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Add your OpenAI API key to your .env file:"
echo "   OPENAI_API_KEY=your_openai_api_key_here"
echo ""
echo "2. Restart your server:"
echo "   npm run dev"
echo ""
echo "3. The key maker will now be available in the Mooves tab!"
echo ""
echo "🔗 Get your OpenAI API key from: https://platform.openai.com/api-keys" 