#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "  Starting Pendingly..."
echo "  When it says 'Ready', open http://localhost:3000 in your browser."
echo "  To stop: close this window or press Ctrl+C."
echo ""
npm run dev
