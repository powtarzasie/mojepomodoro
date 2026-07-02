// preload.js — context bridge (bezpieczny kanał main ↔ renderer)
const { contextBridge, ipcRenderer } = require('electron')

// Rola okna z additionalArguments: 'tray' = okno zwiniętej listwy (renderuje tylko mini-pasek);
// brak = duże okno nakładki (widget + kurtyna). Decyduje o tym, co rysuje overlay.html.
const roleArg = process.argv.find(a => a.startsWith('--role='))
const ROLE = roleArg ? roleArg.split('=')[1] : 'overlay'

contextBridge.exposeInMainWorld('bridge', {
  role: ROLE,
  // Odbiór aktualizacji stanu timera od procesu głównego (stan „lean" — bez listy zadań)
  onState: (callback) => {
    ipcRenderer.on('state', (_, data) => callback(data))
  },

  // Lista zadań osobnym kanałem — wysyłana tylko przy zmianie (patrz broadcast/pushTasksIfChanged)
  onTasks: (callback) => {
    ipcRenderer.on('tasks', (_, data) => callback(data))
  },

  // Wysyłanie komend do procesu głównego
  cmd: (cmd, data) => {
    ipcRenderer.send('cmd', { cmd, data: data || null })
  },

  // Pobranie aktualnego stanu (asynchronicznie)
  getState: () => ipcRenderer.invoke('getState'),

  // Autostart z Windows
  getAutostart: () => ipcRenderer.invoke('getAutostart'),

  // Historia ukończonych zadań (odczyt logu CSV)
  getLog: () => ipcRenderer.invoke('getLog'),

  // Import zadań z pliku CSV (otwiera systemowy dialog wyboru pliku)
  importTasks: () => ipcRenderer.invoke('importTasks'),

  // Eksport bieżącej listy zadań do pliku CSV (dialog zapisu)
  exportTasks: (tasks) => ipcRenderer.invoke('exportTasks', tasks),

  // Ekran warunków korzystania (first-run)
  termsAccept:  () => ipcRenderer.send('terms-accepted'),
  termsDecline: () => ipcRenderer.send('terms-declined'),

  // Hover-toggle: informuj main process o pozycji kursora względem widgetu
  mouseEnter: () => ipcRenderer.send('mouse-enter'),
  mouseLeave: () => ipcRenderer.send('mouse-leave'),
})
