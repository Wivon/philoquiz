# 🧠 PhiloQuiz

Quiz multijoueur type **Kahoot!** pour réviser le **bac de philosophie** (Terminale Générale).
Construit avec **Next.js** (App Router) + **WebRTC / PeerJS** : le multijoueur fonctionne en
**pair-à-pair**, sans serveur — le site est entièrement statique et **hébergeable partout**
(Vercel, GitHub Pages…).

- 17 notions du programme · **255 questions** (15 par notion) avec explications « À retenir »
- Réponses **équilibrées en longueur** : la bonne réponse ne se trahit pas, et l'ordre est
  mélangé à chaque partie
- 4 modes : **Créer une partie**, **Rejoindre avec un PIN**, **Jouer en solo**,
  **Héberger sans jouer** (mode tableau / vidéoprojecteur)
- Chaque joueur choisit son **prénom** et un **avatar emoji**
- QCM **chronométrés** (score à la rapidité), **classement** entre chaque question, **podium** final
- Transitions et **animations** fluides entre les écrans

## 🚀 Lancer l'application

```bash
npm install
npm run dev          # http://localhost:3000
```

Build de production :

```bash
npm run build
npm run start
```

> Pour un export 100 % statique (ex. **GitHub Pages**), ajoute `output: "export"` dans
> [`next.config.ts`](next.config.ts), puis `npm run build` génère le dossier `out/`.

## ☁️ Déploiement & multijoueur

Le jeu est **entièrement côté client** : Vercel (ou GitHub Pages) ne sert que des fichiers
statiques. Le temps réel passe **directement de navigateur à navigateur** via WebRTC (PeerJS),
**sans transiter par le serveur**. On peut donc déployer l'app telle quelle et jouer à
plusieurs depuis l'URL publique.

**Comment ça marche :**

- Le **navigateur de l'hôte est l'autorité** : il détient l'état de la partie (joueurs,
  quiz, minuteurs, scores) et rediffuse tout aux joueurs.
- Le **code PIN encode l'identifiant PeerJS de l'hôte** : taper le PIN suffit à se connecter
  en P2P.
- Le **handshake** initial (signaling) utilise le **broker public PeerJS** — aucune donnée
  de jeu n'y transite, mais une **connexion Internet** est nécessaire pour l'établir.

**À savoir :**

- Connectez de préférence les appareils au **même Wi-Fi** (les liaisons P2P s'établissent
  plus facilement). Certains réseaux « invités » avec **isolation des clients** bloquent le
  P2P.
- L'**hôte** pilote la partie : s'il ferme l'onglet, la partie se termine (comme sur Kahoot).
- Si la liaison temps réel échoue (pas d'Internet, réseau bloquant), un message l'indique ;
  le **mode solo** reste toujours disponible.

## 🎮 Les modes

1. **Créer une partie** — entre ton prénom + avatar, obtiens un **code PIN**. Tu joues *et*
   tu pilotes la partie.
2. **Rejoindre avec un PIN** — entre le PIN + prénom + avatar pour rejoindre l'hôte.
3. **Héberger sans jouer** 📽️ — tu héberges sans participer : idéal pour **projeter** les
   questions et le classement au tableau pendant que les élèves répondent sur leur appareil.
4. **Jouer en solo** — révise seul, entièrement hors-ligne.

Déroulé d'une partie : l'hôte choisit les **notions** et le **nombre de questions** (5/10/15/20),
puis **démarre**. À chaque question, plus on répond vite, plus on marque de points. Le
**classement** s'affiche entre les questions, et un **podium** clôt la partie.

## 🗂️ Architecture

| Chemin | Rôle |
| --- | --- |
| `hooks/useGame.ts` | Couche temps réel **PeerJS** (hôte = autorité, joueurs = clients) + état React |
| `lib/host-engine.ts` | Moteur de jeu autoritaire (joueurs, quiz, minuteurs, scoring) tournant chez l'hôte |
| `lib/realtime.ts` | Contrat des messages P2P (hôte ↔ joueurs) + identifiant PeerJS du PIN |
| `lib/questions/*.ts` | Les questions, **un fichier par notion** (15 chacune) |
| `lib/questions/index.ts` | Agrégation, tirage aléatoire et **mélange des réponses** |
| `lib/scoring.ts` | Calcul du score à la Kahoot (rapidité) |
| `components/*` | Écrans : accueil, identité, lobby, question, présentation, révélation/classement, podium, solo |
| `app/page.tsx` | Aiguillage entre accueil / créer / rejoindre / présenter / solo |
| `app/globals.css` | Thème + **animations** (entrées d'écran, apparition échelonnée, `prefers-reduced-motion`) |

## ➕ Ajouter ou modifier des questions

Chaque notion a son fichier dans `lib/questions/` (ex. `liberte.ts`). Une question :

```ts
{
  question: "…",
  answers: ["A", "B", "C", "D"], // exactement 4 réponses, de longueur comparable
  correct: 0,                     // index de la bonne réponse (0-3)
  explanation: "…",              // affichée après la question
}
```

Les réponses sont **mélangées automatiquement** à chaque partie : l'ordre dans le fichier
n'a pas d'importance. Garde les 4 réponses de **longueur proche** pour que la bonne ne se
repère pas à l'œil.

## 📚 Notions couvertes

L'art · Le bonheur · La conscience · Le devoir · L'État · L'inconscient · La justice ·
Le langage · La liberté · La nature · La raison · La religion · La science · La technique ·
Le temps · Le travail · La vérité
