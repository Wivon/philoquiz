# 🧠 PhiloQuiz

Quiz multijoueur type **Kahoot!** pour réviser le **bac de philosophie** (Terminale Générale).
Construit avec **Next.js** (App Router) + **Socket.IO** pour le temps réel sur réseau local.

- 17 notions du programme · **255 questions** (15 par notion) avec explications « À retenir »
- Mode **multijoueur** sur le même Wi-Fi : un hôte crée la partie, partage un **code PIN**
- Chaque joueur choisit son **prénom** et un **avatar emoji**
- L'hôte choisit les **notions** à travailler et le nombre de questions
- Questions en **QCM** chronométrées, **classement** affiché entre chaque question, **podium** final
- Mode **solo** entièrement jouable hors-ligne

## 🚀 Lancer l'application

```bash
npm install
npm run dev          # serveur de développement (http://localhost:3000)
```

Pour jouer **à plusieurs** : lancez l'app sur l'ordinateur « hôte », puis demandez aux
autres joueurs (téléphones/ordinateurs sur le **même réseau Wi-Fi**) d'ouvrir l'adresse
réseau affichée dans le terminal et sur l'écran du lobby, par exemple :

```
  ▸ Réseau :  http://192.168.1.42:3000
```

Choisissez « Rejoindre avec un PIN », saisissez le code à 6 chiffres, et c'est parti !

### Build de production

```bash
npm run build
npm run start        # NODE_ENV=production, sert le build optimisé
```

Le port se change avec `PORT=4000 npm run dev`.

## ☁️ Vercel & multijoueur : à lire

Le **multijoueur est uniquement local (LAN)**. C'est l'ordinateur **hôte** qui exécute
l'app (`npm run dev` ou `npm run start`) et qui **détient l'état de la partie** ; les autres
joueurs s'y connectent via l'adresse réseau + le code PIN. Tout passe par un serveur
**Socket.IO** persistant lancé sur la machine hôte (`server.ts`).

➡️ **Vercel ne peut pas héberger le multijoueur.** Vercel exécute des fonctions
_serverless_ sans processus persistant : il n'y a donc aucun serveur Socket.IO, et la
connexion temps réel échoue. Si vous ouvrez l'app déployée sur Vercel et cliquez sur
« Créer une partie », un message vous le rappelle. **Sur Vercel, seul le mode solo
fonctionne.**

Pour jouer à plusieurs : lancez l'app **en local** sur la machine hôte et partagez
l'adresse réseau (ex. `http://192.168.1.42:3000`). Si vous voulez un déploiement en ligne
pour le multijoueur, il faut une plateforme qui supporte les serveurs Node persistants
(Render, Railway, Fly.io, un VPS…), pas Vercel.

## 🎮 Comment jouer

1. **Créer une partie** → entrez prénom + avatar → un **code PIN** est généré.
2. Les autres joueurs ouvrent l'adresse réseau et **rejoignent avec le PIN**.
3. L'hôte sélectionne les **notions** et le **nombre de questions**, puis **démarre**.
4. À chaque question, tout le monde répond le plus vite possible (plus on est rapide, plus
   on gagne de points). Le **classement** s'affiche entre chaque question.
5. **Podium** final, puis possibilité de **rejouer**.

> Le mode **solo** suit le même principe, sans connexion : idéal pour réviser seul.

## 🗂️ Architecture

| Chemin | Rôle |
| --- | --- |
| `server.ts` | Serveur HTTP custom (Next.js) + moteur de jeu **Socket.IO** (état des salles en mémoire) |
| `lib/questions/*.ts` | Les questions, **un fichier par notion** (15 chacune) |
| `lib/questions/index.ts` | Agrégation, tirage aléatoire et mélange des réponses |
| `lib/socket-events.ts` | Contrat d'événements partagé client/serveur (typé) |
| `lib/scoring.ts` | Calcul du score à la Kahoot (rapidité) |
| `hooks/useGame.ts` | Connexion Socket.IO côté client + état de la partie |
| `components/*` | Écrans : accueil, lobby, question, révélation/classement, podium, solo |
| `app/page.tsx` | Aiguillage entre accueil / hôte / rejoindre / solo |

## ➕ Ajouter ou modifier des questions

Chaque notion a son fichier dans `lib/questions/` (ex. `liberte.ts`). Une question :

```ts
{
  question: "…",
  answers: ["A", "B", "C", "D"], // exactement 4 réponses
  correct: 0,                     // index de la bonne réponse (0-3)
  explanation: "…",              // affichée après la question
}
```

Les réponses sont **mélangées automatiquement** à chaque partie : l'ordre dans le fichier
n'a pas d'importance.

## 📚 Notions couvertes

L'art · Le bonheur · La conscience · Le devoir · L'État · L'inconscient · La justice ·
Le langage · La liberté · La nature · La raison · La religion · La science · La technique ·
Le temps · Le travail · La vérité
