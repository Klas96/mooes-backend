#!/bin/bash
# Restart backend to apply email verification changes

echo "🔄 Restarting backend server..."
cd ~/mooves
pm2 restart mooves-backend

echo ""
echo "✅ Backend restarted!"
echo ""
echo "Changes applied:"
echo "- Unverified users can now login"
echo "- They will be redirected to email verification screen"
echo ""
echo "Test it:"
echo "1. Try logging in with an unverified account"
echo "2. You should see the verification screen"
echo "3. Enter verification code or resend email"

