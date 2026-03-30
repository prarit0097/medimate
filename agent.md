# Agent Instructions For Medimate

## Project Identity

- Project name: `Medimate`
- Primary repository: `https://github.com/prarit0097/medimate.git`
- Current architecture: API-first Django backend for web now and Flutter later

## Mandatory Rules

1. Har meaningful code ya file change ke baad `Medimate.md` update karna mandatory hai.
2. Har completed change ke baad project ko GitHub repo par push karna expected workflow hai.
3. Koi bhi feature ya refactor document kiye bina complete nahi maana jayega.
4. Commands, APIs, folder structure, file map aur change log ko latest state ke saath sync rakhna hoga.
5. Agar koi file add, rename, delete ya modify ho, to `Medimate.md` mein uska impact likhna hoga.

## Documentation Rules

- `Medimate.md` ko project ka single source of truth treat karo.
- Har update mein at least ye sections verify karo:
  - current build status
  - run commands
  - file-by-file map
  - current limitations
  - change log
- Agar naya endpoint, model, serializer, service, migration ya command add ho, to `Medimate.md` mein clearly mention karo.

## Git Workflow Rules

Har completed change ke baad ideal workflow:

```powershell
git status
git add .
git commit -m "clear message about the change"
git push
```

## First-Time Git Setup

Agar local folder abhi Git repo ke saath connected nahi hai, to initial setup:

```powershell
git init
git branch -M main
git remote add origin https://github.com/prarit0097/medimate.git
git add .
git commit -m "Initial project setup"
git push -u origin main
```

## Change Completion Checklist

Koi change complete tab maana jayega jab:

1. Code update ho gaya ho.
2. Relevant tests ya checks run ho gaye hon.
3. `Medimate.md` update ho gayi ho.
4. Git commit ban gaya ho.
5. GitHub repo par push ho gaya ho.

## Coding Rules

- Architecture API-first rehni chahiye.
- Backend changes web aur future Flutter client dono ko dhyan mein rakh kar hon.
- Sensitive medical logic ko diagnosis tool mein convert nahi karna.
- New code ke sath minimal but useful tests add karne chahiye.
- Environment config changes ko `.env.example` aur `Medimate.md` dono mein sync karna chahiye.

## Documentation Rules For Future Contributors

- `README.md` short overview ke liye hai.
- `Medimate.md` detailed live project memory ke liye hai.
- `agent.md` workflow discipline ke liye hai.
- Agar in teenon mein conflict ho, to:
  - implementation reality first
  - phir `Medimate.md` update
  - phir baaki docs sync

## Branch And Commit Guidance

- Commit message short aur descriptive ho.
- Example:
  - `add medication dashboard summary`
  - `wire jwt auth endpoints`
  - `document patient reminder flow`

## Do Not Skip

- `Medimate.md` update
- relevant verification
- git commit
- git push

## Change Log

### 2026-03-30

- `agent.md` create ki gayi
- documentation update aur git push workflow define kiya gaya

