# Kill Process on Port 3000 (Windows)

Port 3000 är upptagen. Kör detta i PowerShell:

```powershell
# Find process on port 3000
netstat -ano | findstr :3000

# Kill the process (ersätt PID med process ID från ovan)
taskkill /PID <PID> /F

# Eller kill alla Node processer:
taskkill /IM node.exe /F

# Starta om dev server:
npm run dev
```

## Eller enklare:

```powershell
# Kill alla Node processer och starta om
taskkill /IM node.exe /F; npm run dev
```




















