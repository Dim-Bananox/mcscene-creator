#!/bin/bash

if ! command -v npm &> /dev/null
then
    echo "❌ Erreur : Node.js/NPM n'est pas installé."
    exit 1
fi

echo "🎨 Démarrage du formatage..."

npx prettier --write "*.html" "src/**/*.{html,css,js,jsx}" --ignore-path .gitignore

echo "✅ Terminé ! Tous les fichiers HTML, CSS et JS sont formatés."
