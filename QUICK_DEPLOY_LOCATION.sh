#!/bin/bash
# Quick one-command deploy for location fix
cd /home/klas/Kod/mooves-project/mooves-backend && \
scp -i PrivateKeyBahnhof.rsa \
  nodejs-backend/controllers/eventController.js \
  ubuntu@158.174.210.28:/home/ubuntu/mooves/ && \
ssh -i PrivateKeyBahnhof.rsa ubuntu@158.174.210.28 \
  "cd /home/ubuntu/mooves && pm2 restart mooves-backend && echo '' && echo '✅ Backend restarted!' && pm2 logs mooves-backend --lines 20 --nostream"

