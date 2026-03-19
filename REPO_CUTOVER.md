# Repo Cutover

Target topology:

1. `Cognary/AionisPro` = full/server repository with complete history
2. `Cognary/Aionis` = standalone Lite repository

## Recommended Order

1. Rename the current GitHub repository `Cognary/Aionis` to `Cognary/AionisPro`
2. Verify GitHub has created the renamed repository page and redirects
3. Push this Lite repository to the now-free `Cognary/Aionis`
4. Update local remotes after the GitHub rename is complete

## Current Local Repositories

1. Full/server repo: `/Users/lucio/Desktop/Aionis`
2. Lite repo: `/Volumes/ziel/Aionisgo`

## Commands After GitHub Rename

### Full/server repository

```bash
git -C /Users/lucio/Desktop/Aionis remote set-url origin https://github.com/Cognary/AionisPro.git
git -C /Users/lucio/Desktop/Aionis remote -v
git -C /Users/lucio/Desktop/Aionis push -u origin main
git -C /Users/lucio/Desktop/Aionis push --tags
```

### Lite repository

```bash
git -C /Volumes/ziel/Aionisgo remote remove origin 2>/dev/null || true
git -C /Volumes/ziel/Aionisgo remote add origin https://github.com/Cognary/Aionis.git
git -C /Volumes/ziel/Aionisgo remote -v
git -C /Volumes/ziel/Aionisgo push -u origin main
git -C /Volumes/ziel/Aionisgo push --tags
```

## Validation

After cutover:

1. `Cognary/AionisPro` should still contain the full repository history
2. `Cognary/Aionis` should show the Lite-first README and Lite workflows
3. Lite issue links and manifests should resolve to `Cognary/Aionis`
4. Local `origin` remotes should match the new repository ownership
