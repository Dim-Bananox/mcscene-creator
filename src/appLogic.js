import html2canvas from 'html2canvas'
import { SkinViewer } from 'skinview3d'

export function initApp() {
	if (window.__mcsceneInitialized) return () => {}
	window.__mcsceneInitialized = true

	// --- CONSTANTS ---
	const STEVE_SKIN = '/skins/steve.png'
	const ALEX_SKIN = '/skins/alex.png'

	// --- DOM ELEMENTS ---
	const renderArea = document.getElementById('renderArea')
	const skinUpload = document.getElementById('skinUpload')
	const uploadedSkinsContainer = document.getElementById('uploadedSkins')
	const loadSteveBtn = document.getElementById('loadSteve')
	const loadAlexBtn = document.getElementById('loadAlex')
	const playerUsername = document.getElementById('playerUsername')
	const fetchSkinBtn = document.getElementById('fetchSkinBtn')
	const themeToggle = document.getElementById('themeToggle')
	const languageSelect = document.getElementById('languageSelect')

	const savePoseBtn = document.getElementById('savePose')
	const loadPoseBtn = document.getElementById('loadPose')
	const poseGalleryModal = document.getElementById('poseGalleryModal')
	const poseGalleryContent = document.getElementById('poseGalleryContent')

	const exportBtn = document.getElementById('exportBtn')

	const bgUpload = document.getElementById('bgUpload')
	const uploadBgBtn = document.getElementById('uploadBgBtn')
	const bgColorPicker = document.getElementById('bgColorPicker')
	const bgTransparent = document.getElementById('bgTransparent')
	if (bgTransparent) bgTransparent.classList.toggle('active', true)
	const removeBgBtn = document.getElementById('removeBgBtn')

	const selectBtn = document.getElementById('selectBtn')
	const penBtn = document.getElementById('penBtn')
	const lineBtn = document.getElementById('lineBtn')
	const eraserBtn = document.getElementById('eraserBtn')
	const textBtn = document.getElementById('textBtn')
	const shapeBtn = document.getElementById('shapeBtn')
	const shapeSelect = document.getElementById('shapeSelect')
	const colorPicker = document.getElementById('colorPicker')
	const brushSize = document.getElementById('brushSize')
	const textSize = document.getElementById('textSize')
	const clearCanvasBtn = document.getElementById('clearCanvasBtn')

	const drawCanvas = document.getElementById('drawCanvas')

	if (!renderArea || !drawCanvas) {
		window.__mcsceneInitialized = false
		return () => {}
	}

	const brushCursor = document.createElement('div')
	brushCursor.id = 'brushCursor'
	brushCursor.style.display = 'none'
	renderArea.appendChild(brushCursor)

	let lastCursor = null

	// --- STATE ---
	let characters = []
	let selectedCharacterId = null
	let uploadedSkins = []
	let currentSkin = STEVE_SKIN // Track current skin for pose saving
	let poseDB = JSON.parse(localStorage.getItem('poses') || '{}')
	let bgColor = bgColorPicker?.value || '#000000'
	let bgImage = null
	let transparentMode = false
	let layerOrder = [] // Unified layer order [{type:"character"|"object", id}] bottom→top

	// Resize state
	let resizingChar = null
	let resizeData = null

	// Drawing state
	let isDrawing = false
	let drawMode = '' // 'pen' or 'eraser'
	let currentColor = '#000000'
	let textMode = false
	let activeTextEditor = null
	let isCommittingText = false
	let selectMode = false
	let isExporting = false

	// Object drawing state
	let drawObjects = []
	let selectedObjectId = null
	let activeDrawObject = null
	let isTransforming = false
	let transformData = null

	// Shape state
	let shapeMode = false
	let shapeType = 'line' // 'line', 'rect', 'circle'
	let shapeStart = null

	let sceneClipboard = null
	let lastContextMenuPosition = null
	let layerOrderCounter = 1
	let clickThroughHandled = false

	// --- UNDO/REDO HISTORY ---
	const undoHistory = { states: [], index: -1, maxSize: 50, capturing: true }

	function captureState() {
		if (!undoHistory.capturing) return
		const snapshot = JSON.parse(JSON.stringify(drawObjects))
		undoHistory.states = undoHistory.states.slice(0, undoHistory.index + 1)
		undoHistory.states.push(snapshot)
		if (undoHistory.states.length > undoHistory.maxSize) undoHistory.states.shift()
		undoHistory.index = undoHistory.states.length - 1
	}

	function undo() {
		if (undoHistory.index <= 0) return
		undoHistory.index--
		undoHistory.capturing = false
		drawObjects = JSON.parse(JSON.stringify(undoHistory.states[undoHistory.index]))
		selectedObjectId = null
		renderObjects()
		renderLayersList()
		localStorage.setItem('sceneObjects', JSON.stringify(drawObjects))
		undoHistory.capturing = true
	}

	function redo() {
		if (undoHistory.index >= undoHistory.states.length - 1) return
		undoHistory.index++
		undoHistory.capturing = false
		drawObjects = JSON.parse(JSON.stringify(undoHistory.states[undoHistory.index]))
		selectedObjectId = null
		renderObjects()
		renderLayersList()
		localStorage.setItem('sceneObjects', JSON.stringify(drawObjects))
		undoHistory.capturing = true
	}

	const ensureLayerOrder = obj => {
		if (!obj) return
		if (typeof obj._layerOrderIndex !== 'number') {
			obj._layerOrderIndex = layerOrderCounter++
		}
	}

	// Initialize pen as active
	let penInitialized = false

	// --- UTILS ---
	const deg = v => (v * Math.PI) / 180

	const translations = {
		en: {
			appTitle: 'Scene Creator',
			languageLabel: 'Language',
			toggleTheme: 'Toggle theme',
			lightMode: 'Light Mode',
			darkMode: 'Dark Mode',
			toolPen: 'Pen',
			toolSelect: 'Select',
			toolLine: 'Line',
			toolEraser: 'Eraser',
			toolText: 'Text',
			toolShape: 'Shape',
			brushSize: 'Brush Size',
			textSize: 'Text Size',
			clearCanvas: 'Clear Canvas',
			exportScene: 'Export Scene',
			mySkins: 'My Skins',
			enterMinecraftName: 'Enter a Minecraft name',
			importSkin: 'Import Skin',
			myPoses: 'My Poses',
			savePose: 'Save Pose',
			loadPose: 'Load Pose',
			myCharacter: 'My Character',
			layers: 'Layers',
			addCharacter: 'Add Character',
			clearLayers: 'Clear Layers',
			background: 'Background',
			transparent: 'Transparent',
			uploadImage: 'Upload Image',
			removeImage: 'Remove Image',
			head: 'Head',
			arms: 'Arms',
			legs: 'Legs',
			resetUpDown: 'Reset Up/Down',
			resetLeftRight: 'Reset Left/Right',
			resetRightArm: 'Reset Right Arm',
			resetLeftArm: 'Reset Left Arm',
			resetLegs: 'Reset Legs',
			resetAll: 'Reset All',
			ok: 'OK',
			cancel: 'Cancel',
			nameCharacter: 'Name your character',
			characterNameUsed: 'Character name already used.',
			namePose: 'Name your pose',
			posePlaceholder: 'My pose',
			poseExists: 'Pose already exists.',
			poseSaved: 'Pose saved successfully.',
			noPoses: 'No poses saved yet.',
			skinImported: 'Skin imported successfully',
			enterMinecraftNameMessage: 'Please enter a Minecraft name.',
			playerNotFound: 'Player not found',
			failedFetchSkin: 'Failed to fetch skin',
			noSkinFound: 'No skin found',
			selectCharacterFirst: 'Select a character first',
			apply: 'Apply',
			delete: 'Delete',
			hide: 'Hide',
			show: 'Show',
			copy: 'Copy',
			paste: 'Paste',
			move: 'Move',
			resize: 'Resize',
			shapeRectangle: 'Rectangle',
			shapeCircle: 'Circle',
			shapeTriangle: 'Triangle',
			textPlaceholder: 'Your text',
			objectBringForward: 'Bring Forward',
			objectSendBackward: 'Send Backward',
			objectDelete: 'Delete Object',
			myScenes: 'My Scenes',
			saveScene: 'Save Scene',
			loadScene: 'Load Scene',
			nameScene: 'Name your scene',
			scenePlaceholder: 'My scene',
			sceneExists: 'A scene with this name already exists. Overwrite?',
			sceneSaved: 'Scene saved successfully.',
			noScenes: 'No scenes saved yet.',
			sceneLoaded: 'Scene loaded.',
			overwrite: 'Overwrite',
			undo: 'Undo',
			redo: 'Redo',
			position: 'Position',
			resetPosition: 'Reset Position'
		},
		fr: {
			appTitle: 'Createur de Scene',
			languageLabel: 'Langue',
			toggleTheme: 'Changer le theme',
			lightMode: 'Mode Clair',
			darkMode: 'Mode Sombre',
			toolPen: 'Stylo',
			toolSelect: 'Selection',
			toolLine: 'Ligne',
			toolEraser: 'Gomme',
			toolText: 'Texte',
			toolShape: 'Forme',
			brushSize: 'Taille du pinceau',
			textSize: 'Taille du texte',
			clearCanvas: 'Effacer le canevas',
			exportScene: 'Exporter la scene',
			mySkins: 'Mes skins',
			enterMinecraftName: 'Entrer un nom Minecraft',
			importSkin: 'Importer un skin',
			myPoses: 'Mes poses',
			savePose: 'Sauver la pose',
			loadPose: 'Charger la pose',
			myCharacter: 'Mon personnage',
			layers: 'Calques',
			addCharacter: 'Ajouter un personnage',
			clearLayers: 'Effacer les calques',
			background: 'Arriere-plan',
			transparent: 'Transparent',
			uploadImage: 'Importer une image',
			removeImage: "Retirer l'image",
			head: 'Tete',
			arms: 'Bras',
			legs: 'Jambes',
			resetUpDown: 'Reinitialiser haut/bas',
			resetLeftRight: 'Reinitialiser gauche/droite',
			resetRightArm: 'Reinitialiser bras droit',
			resetLeftArm: 'Reinitialiser bras gauche',
			resetLegs: 'Reinitialiser jambes',
			resetAll: 'Tout reinitialiser',
			ok: 'OK',
			cancel: 'Annuler',
			nameCharacter: 'Nommer votre personnage',
			characterNameUsed: 'Nom de personnage deja utilise.',
			namePose: 'Nommer votre pose',
			posePlaceholder: 'Ma pose',
			poseExists: 'La pose existe deja.',
			poseSaved: 'Pose enregistree.',
			noPoses: 'Aucune pose enregistree.',
			skinImported: 'Skin importe avec succes',
			enterMinecraftNameMessage: 'Veuillez entrer un nom Minecraft.',
			playerNotFound: 'Joueur introuvable',
			failedFetchSkin: 'Echec du telechargement du skin',
			noSkinFound: 'Aucun skin trouve',
			selectCharacterFirst: "Selectionnez un personnage d'abord",
			apply: 'Appliquer',
			delete: 'Supprimer',
			hide: 'Cacher',
			show: 'Afficher',
			copy: 'Copier',
			paste: 'Coller',
			move: 'Deplacer',
			resize: 'Redimensionner',
			shapeRectangle: 'Rectangle',
			shapeCircle: 'Cercle',
			shapeTriangle: 'Triangle',
			textPlaceholder: 'Votre texte',
			objectBringForward: 'Mettre devant',
			objectSendBackward: 'Mettre derriere',
			objectDelete: "Supprimer l'objet",
			myScenes: 'Mes Scenes',
			saveScene: 'Sauver la scene',
			loadScene: 'Charger une scene',
			nameScene: 'Nommer votre scene',
			scenePlaceholder: 'Ma scene',
			sceneExists: 'Une scene avec ce nom existe deja. Ecraser ?',
			sceneSaved: 'Scene sauvegardee.',
			noScenes: 'Aucune scene sauvegardee.',
			sceneLoaded: 'Scene chargee.',
			overwrite: 'Ecraser',
			undo: 'Annuler',
			redo: 'Retablir',
			position: 'Position',
			resetPosition: 'Reinitialiser la position'
		},
		es: {
			appTitle: 'Creador de Escenas',
			languageLabel: 'Idioma',
			toggleTheme: 'Cambiar tema',
			lightMode: 'Modo Claro',
			darkMode: 'Modo Oscuro',
			toolPen: 'Lapiz',
			toolSelect: 'Seleccionar',
			toolLine: 'Linea',
			toolEraser: 'Borrador',
			toolText: 'Texto',
			toolShape: 'Forma',
			brushSize: 'Tamano del pincel',
			textSize: 'Tamano del texto',
			clearCanvas: 'Borrar lienzo',
			exportScene: 'Exportar escena',
			mySkins: 'Mis skins',
			enterMinecraftName: 'Introduce un nombre de Minecraft',
			importSkin: 'Importar skin',
			myPoses: 'Mis poses',
			savePose: 'Guardar pose',
			loadPose: 'Cargar pose',
			myCharacter: 'Mi personaje',
			layers: 'Capas',
			addCharacter: 'Agregar personaje',
			clearLayers: 'Borrar capas',
			background: 'Fondo',
			transparent: 'Transparente',
			uploadImage: 'Subir imagen',
			removeImage: 'Quitar imagen',
			head: 'Cabeza',
			arms: 'Brazos',
			legs: 'Piernas',
			resetUpDown: 'Reiniciar arriba/abajo',
			resetLeftRight: 'Reiniciar izquierda/derecha',
			resetRightArm: 'Reiniciar brazo derecho',
			resetLeftArm: 'Reiniciar brazo izquierdo',
			resetLegs: 'Reiniciar piernas',
			resetAll: 'Reiniciar todo',
			ok: 'OK',
			cancel: 'Cancelar',
			nameCharacter: 'Nombra tu personaje',
			characterNameUsed: 'El nombre ya esta en uso.',
			namePose: 'Nombra tu pose',
			posePlaceholder: 'Mi pose',
			poseExists: 'La pose ya existe.',
			poseSaved: 'Pose guardada.',
			noPoses: 'No hay poses guardadas.',
			skinImported: 'Skin importado correctamente',
			enterMinecraftNameMessage: 'Introduce un nombre de Minecraft.',
			playerNotFound: 'Jugador no encontrado',
			failedFetchSkin: 'Error al obtener el skin',
			noSkinFound: 'No se encontro skin',
			selectCharacterFirst: 'Selecciona un personaje primero',
			apply: 'Aplicar',
			delete: 'Eliminar',
			hide: 'Ocultar',
			show: 'Mostrar',
			copy: 'Copiar',
			paste: 'Pegar',
			move: 'Mover',
			resize: 'Redimensionar',
			shapeRectangle: 'Rectangulo',
			shapeCircle: 'Circulo',
			shapeTriangle: 'Triangulo',
			textPlaceholder: 'Tu texto',
			objectBringForward: 'Traer al frente',
			objectSendBackward: 'Enviar atras',
			objectDelete: 'Eliminar objeto',
			myScenes: 'Mis Escenas',
			saveScene: 'Guardar escena',
			loadScene: 'Cargar escena',
			nameScene: 'Nombra tu escena',
			scenePlaceholder: 'Mi escena',
			sceneExists: 'Ya existe una escena con este nombre. Sobrescribir?',
			sceneSaved: 'Escena guardada.',
			noScenes: 'No hay escenas guardadas.',
			sceneLoaded: 'Escena cargada.',
			overwrite: 'Sobrescribir',
			undo: 'Deshacer',
			redo: 'Rehacer',
			position: 'Posicion',
			resetPosition: 'Reiniciar posicion'
		},
		de: {
			appTitle: 'Szenenersteller',
			languageLabel: 'Sprache',
			toggleTheme: 'Thema wechseln',
			lightMode: 'Heller Modus',
			darkMode: 'Dunkler Modus',
			toolPen: 'Stift',
			toolSelect: 'Auswaehlen',
			toolLine: 'Linie',
			toolEraser: 'Radierer',
			toolText: 'Text',
			toolShape: 'Form',
			brushSize: 'Pinselgroesse',
			textSize: 'Textgroesse',
			clearCanvas: 'Leinwand leeren',
			exportScene: 'Szene exportieren',
			mySkins: 'Meine Skins',
			enterMinecraftName: 'Minecraft Namen eingeben',
			importSkin: 'Skin importieren',
			myPoses: 'Meine Posen',
			savePose: 'Pose speichern',
			loadPose: 'Pose laden',
			myCharacter: 'Mein Charakter',
			layers: 'Ebenen',
			addCharacter: 'Charakter hinzufuegen',
			clearLayers: 'Ebenen loeschen',
			background: 'Hintergrund',
			transparent: 'Transparent',
			uploadImage: 'Bild hochladen',
			removeImage: 'Bild entfernen',
			head: 'Kopf',
			arms: 'Arme',
			legs: 'Beine',
			resetUpDown: 'Oben/Unten zuruecksetzen',
			resetLeftRight: 'Links/Rechts zuruecksetzen',
			resetRightArm: 'Rechter Arm zuruecksetzen',
			resetLeftArm: 'Linker Arm zuruecksetzen',
			resetLegs: 'Beine zuruecksetzen',
			resetAll: 'Alles zuruecksetzen',
			ok: 'OK',
			cancel: 'Abbrechen',
			nameCharacter: 'Charakter benennen',
			characterNameUsed: 'Name bereits verwendet.',
			namePose: 'Pose benennen',
			posePlaceholder: 'Meine Pose',
			poseExists: 'Pose existiert bereits.',
			poseSaved: 'Pose gespeichert.',
			noPoses: 'Noch keine Posen gespeichert.',
			skinImported: 'Skin erfolgreich importiert',
			enterMinecraftNameMessage: 'Bitte Minecraft Namen eingeben.',
			playerNotFound: 'Spieler nicht gefunden',
			failedFetchSkin: 'Skin konnte nicht geladen werden',
			noSkinFound: 'Kein Skin gefunden',
			selectCharacterFirst: 'Bitte zuerst einen Charakter waehlen',
			apply: 'Anwenden',
			delete: 'Loeschen',
			hide: 'Ausblenden',
			show: 'Anzeigen',
			copy: 'Kopieren',
			paste: 'Einfuegen',
			move: 'Bewegen',
			resize: 'Groesse aendern',
			shapeRectangle: 'Rechteck',
			shapeCircle: 'Kreis',
			shapeTriangle: 'Dreieck',
			textPlaceholder: 'Dein Text',
			objectBringForward: 'Nach vorne',
			objectSendBackward: 'Nach hinten',
			objectDelete: 'Objekt loeschen',
			myScenes: 'Meine Szenen',
			saveScene: 'Szene speichern',
			loadScene: 'Szene laden',
			nameScene: 'Szene benennen',
			scenePlaceholder: 'Meine Szene',
			sceneExists: 'Eine Szene mit diesem Namen existiert bereits. Ueberschreiben?',
			sceneSaved: 'Szene gespeichert.',
			noScenes: 'Noch keine Szenen gespeichert.',
			sceneLoaded: 'Szene geladen.',
			overwrite: 'Ueberschreiben',
			undo: 'Rueckgaengig',
			redo: 'Wiederherstellen',
			position: 'Position',
			resetPosition: 'Position zuruecksetzen'
		},
		it: {
			appTitle: 'Creatore di Scene',
			languageLabel: 'Lingua',
			toggleTheme: 'Cambia tema',
			lightMode: 'Modalita Chiara',
			darkMode: 'Modalita Scura',
			toolPen: 'Penna',
			toolSelect: 'Seleziona',
			toolLine: 'Linea',
			toolEraser: 'Gomma',
			toolText: 'Testo',
			toolShape: 'Forma',
			brushSize: 'Dimensione pennello',
			textSize: 'Dimensione testo',
			clearCanvas: 'Pulisci tela',
			exportScene: 'Esporta scena',
			mySkins: 'I miei skin',
			enterMinecraftName: 'Inserisci un nome Minecraft',
			importSkin: 'Importa skin',
			myPoses: 'Le mie pose',
			savePose: 'Salva posa',
			loadPose: 'Carica posa',
			myCharacter: 'Il mio personaggio',
			layers: 'Livelli',
			addCharacter: 'Aggiungi personaggio',
			clearLayers: 'Pulisci livelli',
			background: 'Sfondo',
			transparent: 'Trasparente',
			uploadImage: 'Carica immagine',
			removeImage: 'Rimuovi immagine',
			head: 'Testa',
			arms: 'Braccia',
			legs: 'Gambe',
			resetUpDown: 'Reimposta su/giu',
			resetLeftRight: 'Reimposta sinistra/destra',
			resetRightArm: 'Reimposta braccio destro',
			resetLeftArm: 'Reimposta braccio sinistro',
			resetLegs: 'Reimposta gambe',
			resetAll: 'Reimposta tutto',
			ok: 'OK',
			cancel: 'Annulla',
			nameCharacter: 'Dai un nome al personaggio',
			characterNameUsed: 'Nome gia usato.',
			namePose: 'Dai un nome alla posa',
			posePlaceholder: 'La mia posa',
			poseExists: 'La posa esiste gia.',
			poseSaved: 'Posa salvata.',
			noPoses: 'Nessuna posa salvata.',
			skinImported: 'Skin importato con successo',
			enterMinecraftNameMessage: 'Inserisci un nome Minecraft.',
			playerNotFound: 'Giocatore non trovato',
			failedFetchSkin: 'Impossibile ottenere lo skin',
			noSkinFound: 'Nessuno skin trovato',
			selectCharacterFirst: 'Seleziona prima un personaggio',
			apply: 'Applica',
			delete: 'Elimina',
			hide: 'Nascondi',
			show: 'Mostra',
			copy: 'Copia',
			paste: 'Incolla',
			move: 'Sposta',
			resize: 'Ridimensiona',
			shapeRectangle: 'Rettangolo',
			shapeCircle: 'Cerchio',
			shapeTriangle: 'Triangolo',
			textPlaceholder: 'Il tuo testo',
			objectBringForward: 'Porta avanti',
			objectSendBackward: 'Porta indietro',
			objectDelete: 'Elimina oggetto',
			myScenes: 'Le mie Scene',
			saveScene: 'Salva scena',
			loadScene: 'Carica scena',
			nameScene: 'Dai un nome alla scena',
			scenePlaceholder: 'La mia scena',
			sceneExists: 'Una scena con questo nome esiste gia. Sovrascrivere?',
			sceneSaved: 'Scena salvata.',
			noScenes: 'Nessuna scena salvata.',
			sceneLoaded: 'Scena caricata.',
			overwrite: 'Sovrascrivere',
			undo: 'Annulla',
			redo: 'Ripeti',
			position: 'Posizione',
			resetPosition: 'Reimposta posizione'
		}
	}

	let currentLanguage = localStorage.getItem('language') || 'en'

	const t = key => translations[currentLanguage]?.[key] || translations.en[key] || key
	let refreshObjectMenuLabels = () => {}

	const updateThemeLabel = () => {
		if (!themeToggle) return
		const isLight = document.body.classList.contains('light')
		themeToggle.textContent = isLight ? t('darkMode') : t('lightMode')
	}

	const applyLanguage = nextLanguage => {
		if (nextLanguage) currentLanguage = nextLanguage
		localStorage.setItem('language', currentLanguage)
		if (languageSelect) languageSelect.value = currentLanguage

		document.querySelectorAll('[data-i18n]').forEach(el => {
			el.textContent = t(el.dataset.i18n)
		})
		document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
			el.placeholder = t(el.dataset.i18nPlaceholder)
		})
		document.querySelectorAll('[data-i18n-title]').forEach(el => {
			el.title = t(el.dataset.i18nTitle)
		})
		document.querySelectorAll('[data-i18n-aria]').forEach(el => {
			el.setAttribute('aria-label', t(el.dataset.i18nAria))
		})

		const shapeSelectEl = document.getElementById('shapeSelect')
		if (shapeSelectEl) {
			Array.from(shapeSelectEl.options).forEach(option => {
				if (option.value === 'rect') option.textContent = t('shapeRectangle')
				if (option.value === 'circle') option.textContent = t('shapeCircle')
				if (option.value === 'triangle') option.textContent = t('shapeTriangle')
			})
		}

		const menu = document.getElementById('characterContextMenu')
		if (menu) {
			const copyBtn = menu.querySelector('[data-action="copy"]')
			const pasteBtn = menu.querySelector('[data-action="paste"]')
			if (copyBtn) copyBtn.textContent = t('copy')
			if (pasteBtn) pasteBtn.textContent = t('paste')
		}

		refreshObjectMenuLabels()

		document.querySelectorAll('.resizeViewportBtn').forEach(btn => {
			btn.title = t('resize')
			btn.setAttribute('aria-label', t('resize'))
		})
		document.querySelectorAll('.moveViewportBtn').forEach(btn => {
			btn.title = t('move')
			btn.setAttribute('aria-label', t('move'))
		})

		updateThemeLabel()
		renderLayersList()
		renderGallery()
	}

	const setTheme = theme => {
		document.body.classList.toggle('light', theme === 'light')
		updateThemeLabel()
		localStorage.setItem('theme', theme)
	}

	if (themeToggle) {
		const storedTheme = localStorage.getItem('theme') || 'dark'
		applyLanguage(currentLanguage)
		setTheme(storedTheme)
		themeToggle.onclick = () => {
			const isLight = document.body.classList.contains('light')
			setTheme(isLight ? 'dark' : 'light')
		}
	}

	if (languageSelect) {
		languageSelect.value = currentLanguage
		languageSelect.onchange = e => applyLanguage(e.target.value)
	}

	function setSkin(url) {
		const sel = getSelectedCharacter()
		if (sel && sel.viewer) sel.viewer.loadSkin(url)
		if (sel) sel.skin = url
		currentSkin = url // Update currentSkin for pose saving
		highlightActiveSkin()
	}

	if (loadSteveBtn) {
		loadSteveBtn.style.backgroundImage = 'url("/heads/steve_head.png")'
		loadSteveBtn.onclick = () => setSkin(STEVE_SKIN)
	}
	if (loadAlexBtn) {
		loadAlexBtn.style.backgroundImage = 'url("/heads/alex_head.png")'
		loadAlexBtn.onclick = () => setSkin(ALEX_SKIN)
	}

	const appModal = document.getElementById('appModal')
	const modalTitle = document.getElementById('modalTitle')
	const modalMessage = document.getElementById('modalMessage')
	const modalLabel = document.getElementById('modalLabel')
	const modalInput = document.getElementById('modalInput')
	const modalConfirm = document.getElementById('modalConfirm')
	const modalCancel = document.getElementById('modalCancel')
	let modalResolve = null

	function openModal({
		title,
		message,
		inputLabel,
		inputPlaceholder,
		defaultValue,
		showInput,
		maxLength,
		confirmText,
		cancelText,
		showCancel
	}) {
		if (!appModal) return Promise.resolve(null)

		modalTitle.textContent = title || ''
		modalTitle.style.display = title ? 'block' : 'none'
		modalMessage.textContent = message || ''
		modalLabel.textContent = inputLabel || ''
		modalInput.value = defaultValue || ''
		modalInput.placeholder = inputPlaceholder || ''
		modalInput.maxLength = typeof maxLength === 'number' ? maxLength : 524288

		const hasInput = Boolean(showInput)
		const hasLabel = hasInput && Boolean(inputLabel)
		modalLabel.style.display = hasLabel ? 'block' : 'none'
		modalInput.style.display = hasInput ? 'block' : 'none'

		modalConfirm.textContent = confirmText || t('ok')
		modalCancel.textContent = cancelText || t('cancel')
		modalCancel.style.display = showCancel === false ? 'none' : 'inline-flex'

		appModal.classList.add('open')
		appModal.setAttribute('aria-hidden', 'false')

		if (hasInput) {
			setTimeout(() => modalInput.focus(), 0)
		} else {
			setTimeout(() => modalConfirm.focus(), 0)
		}

		return new Promise(resolve => {
			modalResolve = resolve
		})
	}

	function closeModal(value) {
		if (!appModal) return
		appModal.classList.remove('open')
		appModal.setAttribute('aria-hidden', 'true')
		if (typeof modalResolve === 'function') {
			const resolver = modalResolve
			modalResolve = null
			resolver(value)
		}
	}

	if (modalConfirm) {
		modalConfirm.onclick = () => {
			const value = modalInput.style.display === 'block' ? modalInput.value : true
			closeModal(value)
		}
	}

	if (modalCancel) {
		modalCancel.onclick = () => closeModal(null)
	}

	if (appModal) {
		appModal.addEventListener('click', e => {
			if (e.target === appModal) closeModal(null)
		})
	}

	if (fetchSkinBtn) {
		fetchSkinBtn.onclick = async () => {
			const cleanName = (playerUsername?.value || '').trim()
			if (!cleanName) {
				await openModal({
					message: t('enterMinecraftNameMessage'),
					showInput: false,
					showCancel: false
				})
				return
			}

			try {
				/* Use CORS-friendly APIs that return the raw skin texture PNG directly.
           Primary: minotar.net  —  Fallback: mc-heads.net */
				const skinApis = [
					`https://minotar.net/skin/${encodeURIComponent(cleanName)}`,
					`https://mc-heads.net/skin/${encodeURIComponent(cleanName)}`
				]

				let skinBlobUrl = null
				for (const apiUrl of skinApis) {
					try {
						const resp = await fetch(apiUrl)
						if (!resp.ok) continue
						const blob = await resp.blob()
						if (blob.size < 100) continue // too small = error page
						if (!blob.type.startsWith('image/')) continue
						skinBlobUrl = URL.createObjectURL(blob)
						break
					} catch (_) {
						/* try the next API */
					}
				}

				if (!skinBlobUrl) throw new Error(t('playerNotFound'))

				setSkin(skinBlobUrl)
				const existingIndex = uploadedSkins.findIndex(s => s.name === cleanName)
				if (existingIndex >= 0) {
					uploadedSkins[existingIndex].url = skinBlobUrl
				} else {
					uploadedSkins.push({ name: cleanName, url: skinBlobUrl })
				}
				renderUploadedSkins()
				await openModal({
					message: t('skinImported'),
					showInput: false,
					showCancel: false
				})
			} catch (error) {
				await openModal({
					message: `${t('failedFetchSkin')}: ${error.message}`,
					showInput: false,
					showCancel: false
				})
			}
		}
	}

	const uploadBtn = document.getElementById('uploadBtn')
	if (uploadBtn && skinUpload) uploadBtn.onclick = () => skinUpload.click()

	if (skinUpload) {
		skinUpload.addEventListener('change', e => {
			const file = e.target.files[0]
			if (!file) return

			const url = URL.createObjectURL(file)
			uploadedSkins.push({ name: file.name, url })
			setSkin(url)
			renderUploadedSkins()
		})
	}

	function renderUploadedSkins() {
		const uploadBtn = document.getElementById('uploadBtn')
		const uploadedSkinsContainer = document.getElementById('uploadedSkins')

		if (!uploadedSkinsContainer || !uploadBtn) return

		// Clear only the skin previews, not the button
		Array.from(uploadedSkinsContainer.children).forEach(child => {
			if (child.id !== 'uploadBtn') {
				child.remove()
			}
		})

		uploadedSkins.forEach(skin => {
			const wrapper = document.createElement('div')
			wrapper.className = 'skinPreview'

			const miniCanvas = document.createElement('canvas')
			miniCanvas.width = 80
			miniCanvas.height = 100

			const miniViewer = new SkinViewer({
				canvas: miniCanvas,
				width: 80,
				height: 100,
				skin: skin.url
			})
			miniViewer.controls.enableRotate = false
			miniViewer.controls.enableZoom = false

			const name = document.createElement('div')
			name.className = 'skinName'
			name.textContent = skin.name

			const deleteBtn = document.createElement('button')
			deleteBtn.className = 'skinDeleteBtn'
			deleteBtn.textContent = 'X'
			deleteBtn.onclick = e => {
				e.stopPropagation()
				// Replace this skin with Steve for all characters using it
				characters.forEach(ch => {
					if (ch.skin === skin.url) {
						ch.skin = STEVE_SKIN
						if (ch.viewer) ch.viewer.loadSkin(STEVE_SKIN)
					}
				})
				// Remove skin from uploaded list
				uploadedSkins = uploadedSkins.filter(s => s.url !== skin.url)
				// If current character's skin was removed, update UI
				if (getSelectedCharacter()?.skin === skin.url) {
					setSkin(STEVE_SKIN)
				}
				renderUploadedSkins()
			}

			wrapper.appendChild(miniCanvas)
			wrapper.appendChild(name)
			wrapper.appendChild(deleteBtn)

			wrapper.onclick = () => {
				const sel = getSelectedCharacter()
				if (sel) {
					sel.skin = skin.url
				}
				setSkin(skin.url)
			}
			wrapper.dataset.skin = skin.url

			uploadedSkinsContainer.insertBefore(wrapper, uploadBtn)
		})

		highlightActiveSkin()
	}

	function updateHeadUsage() {
		const selected = getSelectedCharacter()
		const selectedSkin = selected?.skin || null
		if (loadSteveBtn) loadSteveBtn.classList.toggle('used', selectedSkin === STEVE_SKIN)
		if (loadAlexBtn) loadAlexBtn.classList.toggle('used', selectedSkin === ALEX_SKIN)
	}

	function highlightActiveSkin() {
		const sel = getSelectedCharacter()
		const activeSkin = sel?.skin
		document.querySelectorAll('.skinPreview').forEach(el => {
			el.classList.toggle('active', el.dataset.skin === activeSkin)
		})
		// Highlight built-in skins
		if (loadSteveBtn) loadSteveBtn.classList.toggle('active', activeSkin === STEVE_SKIN)
		if (loadAlexBtn) loadAlexBtn.classList.toggle('active', activeSkin === ALEX_SKIN)
		updateHeadUsage()
	}

	// --- SLIDERS ---
	const sliders = {
		headX: document.getElementById('headX'),
		headY: document.getElementById('headY'),
		rightArmX: document.getElementById('rightArmX'),
		rightArmZ: document.getElementById('rightArmZ'),
		leftArmX: document.getElementById('leftArmX'),
		leftArmZ: document.getElementById('leftArmZ'),
		rightLegX: document.getElementById('rightLegX'),
		leftLegX: document.getElementById('leftLegX')
	}

	const sliderMap = {
		headX: ['head', 'x'],
		headY: ['head', 'y'],
		rightArmX: ['rightArm', 'x'],
		rightArmZ: ['rightArm', 'z'],
		leftArmX: ['leftArm', 'x'],
		leftArmZ: ['leftArm', 'z'],
		rightLegX: ['rightLeg', 'x'],
		leftLegX: ['leftLeg', 'x']
	}

	function applySliderValuesToCharacter(character) {
		if (!character?.viewer?.playerObject) return
		const skin = character.viewer.playerObject.skin
		Object.entries(character.sliderValues || {}).forEach(([k, v]) => {
			const map = sliderMap[k]
			if (!map) return
			const [part, axis] = map
			if (skin[part]) skin[part].rotation[axis] = deg(v)
		})
	}

	function bindSlider(slider, part, axis) {
		if (!slider) return
		slider.addEventListener('input', () => {
			const val = slider.value
			const sel = getSelectedCharacter()
			if (sel && sel.viewer && sel.viewer.playerObject)
				sel.viewer.playerObject.skin[part].rotation[axis] = deg(val)
			if (sel) {
				sel.sliderValues = sel.sliderValues || {}
				sel.sliderValues[Object.keys(sliders).find(k => sliders[k] === slider)] = val
			}
		})
	}

	bindSlider(sliders.headX, 'head', 'x')
	bindSlider(sliders.headY, 'head', 'y')
	bindSlider(sliders.rightArmX, 'rightArm', 'x')
	bindSlider(sliders.rightArmZ, 'rightArm', 'z')
	bindSlider(sliders.leftArmX, 'leftArm', 'x')
	bindSlider(sliders.leftArmZ, 'leftArm', 'z')
	bindSlider(sliders.rightLegX, 'rightLeg', 'x')
	bindSlider(sliders.leftLegX, 'leftLeg', 'x')

	const collapsibles = document.querySelectorAll('.panel-right .panelSection.collapsible')
	collapsibles.forEach(section => {
		section.classList.add('collapsed')
		const toggle = section.querySelector('.sectionToggle')
		if (toggle) {
			toggle.addEventListener('click', () => {
				section.classList.toggle('collapsed')
			})
		}
	})

	// --- Character management functions ---
	function getSelectedCharacter() {
		return characters.find(c => c.id === selectedCharacterId) || null
	}

	// --- Unified layer ordering ---
	function syncLayerOrder() {
		const existing = new Set(layerOrder.map(l => `${l.type}:${l.id}`))
		// Add missing characters at the top
		characters.forEach(c => {
			if (!existing.has(`character:${c.id}`)) {
				layerOrder.push({ type: 'character', id: c.id })
			}
		})
		// Add missing objects at the top
		drawObjects.forEach(obj => {
			if (!existing.has(`object:${obj.id}`)) {
				layerOrder.push({ type: 'object', id: obj.id })
			}
		})
		// Remove entries for deleted items
		layerOrder = layerOrder.filter(l => {
			if (l.type === 'character') return characters.some(c => c.id === l.id)
			if (l.type === 'object') return drawObjects.some(o => o.id === l.id)
			return false
		})
	}

	function applyLayerZIndexes() {
		const BASE_Z = 2
		let maxObjectZ = -1
		let maxZ = BASE_Z

		// Determine natural z-index for each layer
		const naturalZ = new Map()
		layerOrder.forEach((layer, idx) => {
			const z = BASE_Z + idx + 1
			if (z > maxZ) maxZ = z
			naturalZ.set(`${layer.type}:${layer.id}`, z)
			if (layer.type === 'character') {
				const ch = characters.find(c => c.id === layer.id)
				if (ch && ch.wrapper) {
					ch.wrapper.style.zIndex = z
					ch.wrapper.classList.remove('layer-boosted')
				}
			} else if (layer.type === 'object') {
				maxObjectZ = Math.max(maxObjectZ, z)
			}
		})

		const canvasZ = maxObjectZ >= 0 ? maxObjectZ : BASE_Z
		if (drawCanvas) drawCanvas.style.zIndex = canvasZ

		// Helper to calculate screen bounds for objects
		const getObjectScreenBounds = obj => {
			const bounds = getObjectBoundsLocal(obj)
			// Transform local bounds to screen space using obj transform
			// Simple approximation: AABB of the rotated/scaled bounding box
			const corners = [
				{ x: bounds.minX, y: bounds.minY },
				{ x: bounds.maxX, y: bounds.minY },
				{ x: bounds.maxX, y: bounds.maxY },
				{ x: bounds.minX, y: bounds.maxY }
			]
			const rad = -(obj.rotation || 0) // Rotation in canvas is usually clockwise, here we need consistent math
			const cos = Math.cos(obj.rotation || 0) // Canvas rotate is clockwise
			const sin = Math.sin(obj.rotation || 0)

			const transformed = corners.map(p => {
				// scale
				const sx = p.x * (obj.scaleX || 1)
				const sy = p.y * (obj.scaleY || 1)
				// rotate
				const rx = sx * cos - sy * sin
				const ry = sx * sin + sy * cos
				// translate
				return {
					x: rx + (obj.x || 0),
					y: ry + (obj.y || 0)
				}
			})

			const xs = transformed.map(p => p.x)
			const ys = transformed.map(p => p.y)
			return {
				minX: Math.min(...xs),
				maxX: Math.max(...xs),
				minY: Math.min(...ys),
				maxY: Math.max(...ys)
			}
		}

		const isOverlapping = (rectA, rectB) => {
			return (
				rectA.minX < rectB.maxX &&
				rectA.maxX > rectB.minX &&
				rectA.minY < rectB.maxY &&
				rectA.maxY > rectB.minY
			)
		}

		const isLayerVisible = layer => {
			if (layer.type === 'character') {
				const ch = characters.find(c => c.id === layer.id)
				return !ch || ch.visible !== false
			}
			if (layer.type === 'object') {
				const obj = drawObjects.find(o => o.id === layer.id)
				return !obj || obj.visible !== false
			}
			return true
		}

		const hasVisibleVisualObstruction = (targetId, isCharacter) => {
			// Get target bounds
			let targetBounds
			if (isCharacter) {
				const ch = characters.find(c => c.id === targetId)
				if (!ch) return false
				// Character bounds approx from position/scale
				// CSS: left:20px, top:20px, width:320px, height:420px -> Center is (180, 230)
				const centerX = 180 + (ch._posX || 0)
				const centerY = 230 + (ch._posY || 0)
				const width = 180 * (ch.scale || 1)
				const height = 320 * (ch.scale || 1)
				targetBounds = {
					minX: centerX - width / 2,
					maxX: centerX + width / 2,
					minY: centerY - height / 2,
					maxY: centerY + height / 2
				}
			} else {
				const obj = drawObjects.find(o => o.id === targetId)
				if (!obj) return false
				targetBounds = getObjectScreenBounds(obj)
			}

			const layerKey = isCharacter ? `character:${targetId}` : `object:${targetId}`
			const idx = layerOrder.findIndex(l => `${l.type}:${l.id}` === layerKey)
			if (idx < 0) return false

			// Check all layers ABOVE this one
			for (let i = idx + 1; i < layerOrder.length; i += 1) {
				const layer = layerOrder[i]
				if (!isLayerVisible(layer)) continue

				let obstacleBounds
				if (layer.type === 'character') {
					const ch = characters.find(c => c.id === layer.id)
					const centerX = 180 + (ch._posX || 0)
					const centerY = 230 + (ch._posY || 0)
					const width = 180 * (ch.scale || 1)
					const height = 320 * (ch.scale || 1)
					obstacleBounds = {
						minX: centerX - width / 2,
						maxX: centerX + width / 2,
						minY: centerY - height / 2,
						maxY: centerY + height / 2
					}
				} else {
					const obj = drawObjects.find(o => o.id === layer.id)
					obstacleBounds = getObjectScreenBounds(obj)
				}

				if (isOverlapping(targetBounds, obstacleBounds)) return true
			}
			return false
		}

		// Check if selected character needs boosting (only if visually obstructed by a visible layer above)
		let charBoosted = false
		if (selectedCharacterId !== null) {
			const sel = characters.find(c => c.id === selectedCharacterId)
			if (sel && sel.wrapper && hasVisibleVisualObstruction(selectedCharacterId, true)) {
				sel.wrapper.style.zIndex = maxZ + 10
				sel.wrapper.classList.add('layer-boosted')
				charBoosted = true
			}
		}

		// Check if selected object needs boosting (only if visually obstructed by a visible character above)
		if (selectedObjectId !== null && !charBoosted) {
			// Objects are drawn on canvas, but we need to check if ANY character ABOVE in layer order obstructs this object
			const isObstructed = hasVisibleVisualObstruction(selectedObjectId, false)
			if (isObstructed && drawCanvas) {
				drawCanvas.style.zIndex = maxZ + 10
				drawCanvas.classList.add('layer-boosted')
			} else if (drawCanvas) {
				drawCanvas.classList.remove('layer-boosted')
			}
		} else if (drawCanvas) {
			drawCanvas.classList.remove('layer-boosted')
		}

		// Sync drawObjects array order to match layerOrder (for correct canvas paint order)
		const objectOrder = layerOrder.filter(l => l.type === 'object').map(l => l.id)
		if (objectOrder.length > 0) {
			const objMap = new Map(drawObjects.map(o => [o.id, o]))
			const sorted = objectOrder.map(id => objMap.get(id)).filter(Boolean)
			drawObjects.forEach(o => {
				if (!sorted.includes(o)) sorted.push(o)
			})
			drawObjects.length = 0
			sorted.forEach(o => drawObjects.push(o))
		}
	}

	function renderLayersList() {
		const list = document.getElementById('layersList')
		if (!list) return
		list.innerHTML = ''

		// Sync and apply unified layer order
		syncLayerOrder()
		applyLayerZIndexes()

		const getObjectLabel = obj => {
			if (obj.name) return obj.name
			const idx = typeof obj._layerOrderIndex === 'number' ? obj._layerOrderIndex : ''
			if (obj.type === 'text') {
				const text = obj.text || ''
				const preview = text.length > 8 ? `${text.slice(0, 8)}...` : text
				return `Text ${idx}: ${preview || 'Text'}`
			}
			if (obj.type === 'stroke' || obj.originType === 'stroke') return `Stroke ${idx}`
			if (obj.type === 'shape') return `${obj.shapeType || 'Shape'} ${idx}`
			return `Shape ${idx}`
		}

		const reorderUnified = (fromType, fromId, toType, toId, visualPosition) => {
			const fromIdx = layerOrder.findIndex(l => l.type === fromType && l.id === fromId)
			const toIdx = layerOrder.findIndex(l => l.type === toType && l.id === toId)
			if (fromIdx < 0 || toIdx < 0) return

			const [moved] = layerOrder.splice(fromIdx, 1)
			const newToIdx = layerOrder.findIndex(l => l.type === toType && l.id === toId)
			// "above" in visual (top) = higher z = later in array = insert after target
			// "below" in visual = lower z = earlier in array = insert at target
			let insertIdx = newToIdx
			if (visualPosition === 'above') insertIdx = newToIdx + 1
			layerOrder.splice(insertIdx, 0, moved)

			applyLayerZIndexes()
			// Re-append character wrappers in DOM order
			const parent = renderArea
			if (parent) {
				characters.forEach(ch => {
					if (ch.wrapper && ch.wrapper.parentNode === parent)
						parent.appendChild(ch.wrapper)
				})
			}
			renderObjects()
			renderLayersList()
		}

		list.ondragover = e => {
			e.preventDefault()
			e.dataTransfer.dropEffect = 'move'
		}
		list.ondrop = e => {
			e.preventDefault()
		}

		// Unified list: iterate layerOrder reversed (top = highest z first)
		layerOrder
			.slice()
			.reverse()
			.forEach(layer => {
				if (layer.type === 'character') {
					const c = characters.find(ch => ch.id === layer.id)
					if (!c) return

					const item = document.createElement('div')
					item.className = 'layerItem characterLayer'
					item.dataset.layerType = 'character'
					item.dataset.layerId = c.id
					if (c.id === selectedCharacterId) item.classList.add('active')
					item.draggable = true
					item.setAttribute('draggable', 'true')

					const visBtn = document.createElement('button')
					visBtn.className = 'layerVisBtn'
					visBtn.innerHTML = c.visible !== false ? '👁️' : '🚫'
					visBtn.onclick = e => {
						e.stopPropagation()
						c.visible = c.visible === false
						if (c.wrapper)
							c.wrapper.style.display = c.visible !== false ? 'block' : 'none'
						renderLayersList()
					}

					const label = document.createElement('span')
					label.className = 'layerLabel'
					label.textContent = c.name
					label.onclick = () => {
						selectCharacter(c.id)
						renderLayersList()
					}

					label.ondblclick = e => {
						e.stopPropagation()
						const input = document.createElement('input')
						input.type = 'text'
						input.value = c.name
						input.className = 'layerRenameInput'
						input.style.width = '100%'
						const save = () => {
							const newName = input.value.trim()
							if (newName) {
								c.name = newName
								renderLayersList()
							} else {
								label.textContent = c.name
							}
							if (selectedCharacterId === c.id) {
								const nameDisplay = document.getElementById('characterName')
								if (nameDisplay) nameDisplay.textContent = c.name
							}
						}
						input.onblur = save
						input.onkeydown = k => {
							if (k.key === 'Enter') input.blur()
						}
						label.textContent = ''
						label.appendChild(input)
						input.focus()
					}

					item.oncontextmenu = e => {
						e.preventDefault()
						selectCharacter(c.id)
						openCharacterContextMenu(e.clientX, e.clientY, c.id)
					}

					const upBtn = document.createElement('button')
					upBtn.className = 'layerOrderBtn'
					upBtn.innerHTML = '▲'
					upBtn.onclick = e => {
						e.stopPropagation()
						const idx = layerOrder.findIndex(
							l => l.type === 'character' && l.id === c.id
						)
						if (idx < layerOrder.length - 1) {
							;[layerOrder[idx], layerOrder[idx + 1]] = [
								layerOrder[idx + 1],
								layerOrder[idx]
							]
							applyLayerZIndexes()
							const parent = renderArea
							if (parent)
								characters.forEach(ch => {
									if (ch.wrapper && ch.wrapper.parentNode === parent)
										parent.appendChild(ch.wrapper)
								})
							renderObjects()
							renderLayersList()
						}
					}

					const downBtn = document.createElement('button')
					downBtn.className = 'layerOrderBtn'
					downBtn.innerHTML = '▼'
					downBtn.onclick = e => {
						e.stopPropagation()
						const idx = layerOrder.findIndex(
							l => l.type === 'character' && l.id === c.id
						)
						if (idx > 0) {
							;[layerOrder[idx], layerOrder[idx - 1]] = [
								layerOrder[idx - 1],
								layerOrder[idx]
							]
							applyLayerZIndexes()
							const parent = renderArea
							if (parent)
								characters.forEach(ch => {
									if (ch.wrapper && ch.wrapper.parentNode === parent)
										parent.appendChild(ch.wrapper)
								})
							renderObjects()
							renderLayersList()
						}
					}

					const delBtn = document.createElement('button')
					delBtn.className = 'layerDelBtn'
					delBtn.textContent = '✕'
					delBtn.onclick = e => {
						e.stopPropagation()
						if (c.wrapper) c.wrapper.remove()
						characters = characters.filter(ch => ch.id !== c.id)
						if (selectedCharacterId === c.id) selectCharacter(null)
						renderLayersList()
					}

					item.ondragstart = e => {
						e.dataTransfer.effectAllowed = 'move'
						e.dataTransfer.setData(
							'text/plain',
							JSON.stringify({ type: 'character', id: c.id })
						)
					}
					item.ondragover = e => {
						e.preventDefault()
						e.stopPropagation()
						e.dataTransfer.dropEffect = 'move'
						const rect = item.getBoundingClientRect()
						if (e.clientY - rect.top < rect.height / 2) {
							item.classList.add('drop-target-top')
							item.classList.remove('drop-target-bottom')
						} else {
							item.classList.add('drop-target-bottom')
							item.classList.remove('drop-target-top')
						}
					}
					item.ondragleave = () => {
						item.classList.remove('drop-target-top', 'drop-target-bottom')
					}
					item.ondrop = e => {
						e.preventDefault()
						e.stopPropagation()
						const position = item.classList.contains('drop-target-top')
							? 'above'
							: 'below'
						item.classList.remove('drop-target-top', 'drop-target-bottom')
						try {
							const d = JSON.parse(e.dataTransfer.getData('text/plain'))
							if (d.type && d.id)
								reorderUnified(d.type, d.id, 'character', c.id, position)
						} catch (err) {}
					}

					item.appendChild(visBtn)
					item.appendChild(label)
					item.appendChild(upBtn)
					item.appendChild(downBtn)
					item.appendChild(delBtn)
					item.querySelectorAll('button, span').forEach(el =>
						el.setAttribute('draggable', 'false')
					)
					list.appendChild(item)
				} else if (layer.type === 'object') {
					const obj = drawObjects.find(o => o.id === layer.id)
					if (!obj) return

					const item = document.createElement('div')
					item.className = 'layerItem objectLayer'
					item.dataset.layerType = 'object'
					item.dataset.layerId = obj.id
					if (obj.id === selectedObjectId) item.classList.add('active')
					item.draggable = true
					item.setAttribute('draggable', 'true')

					const visBtn = document.createElement('button')
					visBtn.className = 'layerVisBtn'
					visBtn.innerHTML = obj.visible !== false ? '👁️' : '🚫'
					visBtn.onclick = e => {
						e.stopPropagation()
						obj.visible = obj.visible === false
						renderObjects()
						renderLayersList()
					}

					const label = document.createElement('span')
					label.className = 'layerLabel'
					label.textContent = getObjectLabel(obj)
					label.onclick = () => {
						selectObject(obj.id)
						renderLayersList()
					}

					label.ondblclick = e => {
						e.stopPropagation()
						const currentName = obj.name || getObjectLabel(obj)
						const input = document.createElement('input')
						input.type = 'text'
						input.value = currentName
						input.className = 'layerRenameInput'
						input.style.width = '100%'
						const save = () => {
							const newName = input.value.trim()
							if (newName) {
								obj.name = newName
								renderLayersList()
								saveSceneObjects()
							} else {
								label.textContent = getObjectLabel(obj)
							}
						}
						input.onblur = save
						input.onkeydown = k => {
							if (k.key === 'Enter') input.blur()
						}
						label.textContent = ''
						label.appendChild(input)
						input.focus()
					}

					item.oncontextmenu = e => {
						e.preventDefault()
						selectObject(obj.id)
						openObjectContextMenu(e.clientX, e.clientY)
					}

					const upBtn = document.createElement('button')
					upBtn.className = 'layerOrderBtn'
					upBtn.innerHTML = '▲'
					upBtn.onclick = e => {
						e.stopPropagation()
						const idx = layerOrder.findIndex(
							l => l.type === 'object' && l.id === obj.id
						)
						if (idx < layerOrder.length - 1) {
							;[layerOrder[idx], layerOrder[idx + 1]] = [
								layerOrder[idx + 1],
								layerOrder[idx]
							]
							applyLayerZIndexes()
							renderObjects()
							renderLayersList()
						}
					}

					const downBtn = document.createElement('button')
					downBtn.className = 'layerOrderBtn'
					downBtn.innerHTML = '▼'
					downBtn.onclick = e => {
						e.stopPropagation()
						const idx = layerOrder.findIndex(
							l => l.type === 'object' && l.id === obj.id
						)
						if (idx > 0) {
							;[layerOrder[idx], layerOrder[idx - 1]] = [
								layerOrder[idx - 1],
								layerOrder[idx]
							]
							applyLayerZIndexes()
							renderObjects()
							renderLayersList()
						}
					}

					const delBtn = document.createElement('button')
					delBtn.className = 'layerDelBtn'
					delBtn.textContent = '✕'
					delBtn.onclick = e => {
						e.stopPropagation()
						drawObjects = drawObjects.filter(x => x.id !== obj.id)
						if (selectedObjectId === obj.id) selectObject(null)
						renderObjects()
						renderLayersList()
					}

					item.ondragstart = e => {
						e.dataTransfer.effectAllowed = 'move'
						e.dataTransfer.setData(
							'text/plain',
							JSON.stringify({ type: 'object', id: obj.id })
						)
					}
					item.ondragover = e => {
						e.preventDefault()
						e.stopPropagation()
						e.dataTransfer.dropEffect = 'move'
						const rect = item.getBoundingClientRect()
						if (e.clientY - rect.top < rect.height / 2) {
							item.classList.add('drop-target-top')
							item.classList.remove('drop-target-bottom')
						} else {
							item.classList.add('drop-target-bottom')
							item.classList.remove('drop-target-top')
						}
					}
					item.ondragleave = () => {
						item.classList.remove('drop-target-top', 'drop-target-bottom')
					}
					item.ondrop = e => {
						e.preventDefault()
						e.stopPropagation()
						const position = item.classList.contains('drop-target-top')
							? 'above'
							: 'below'
						item.classList.remove('drop-target-top', 'drop-target-bottom')
						try {
							const d = JSON.parse(e.dataTransfer.getData('text/plain'))
							if (d.type && d.id)
								reorderUnified(d.type, d.id, 'object', obj.id, position)
						} catch (err) {}
					}

					item.appendChild(visBtn)
					item.appendChild(label)
					item.appendChild(upBtn)
					item.appendChild(downBtn)
					item.appendChild(delBtn)
					item.querySelectorAll('button, span').forEach(el =>
						el.setAttribute('draggable', 'false')
					)
					list.appendChild(item)
				}
			})

		updateHeadUsage()
	}

	function getUniqueCharacterName(baseName) {
		const existing = characters.map(c => c.name.trim().toLowerCase())
		if (!existing.includes(baseName.toLowerCase())) return baseName
		let i = 2
		while (existing.includes(`${baseName} ${i}`.toLowerCase())) i += 1
		return `${baseName} ${i}`
	}

	function buildCharacterCopyData(character) {
		if (!character) return null
		const width = character.wrapper?.offsetWidth || character.canvas?.width || 320
		const height = character.wrapper?.offsetHeight || character.canvas?.height || 420
		const left = Number.parseFloat(character.wrapper?.style.left) || 0
		const top = Number.parseFloat(character.wrapper?.style.top) || 0
		const cameraPos = character.viewer
			? {
					x: character.viewer.camera.position.x,
					y: character.viewer.camera.position.y,
					z: character.viewer.camera.position.z
				}
			: character.cameraPos

		return {
			name: character.name,
			skin: character.skin,
			sliderValues: { ...(character.sliderValues || {}) },
			cameraPos,
			visible: character.visible !== false,
			width,
			height,
			left,
			top,
			posX: character._posX || 0,
			posY: character._posY || 0
		}
	}

	function buildObjectCopyData(obj) {
		if (!obj) return null
		try {
			return JSON.parse(JSON.stringify(obj))
		} catch (err) {
			return null
		}
	}

	function pasteObjectFromData(data) {
		if (!data) return
		if (!drawCanvas) return
		const cloned = buildObjectCopyData(data)
		if (!cloned) return
		const newObj = { ...cloned, id: buildObjectId() }
		delete newObj.preview
		delete newObj._layerOrderIndex
		ensureLayerOrder(newObj)

		const offset = 20
		if (lastContextMenuPosition) {
			const rect = drawCanvas.getBoundingClientRect()
			const scaleX = drawCanvas.width / rect.width
			const scaleY = drawCanvas.height / rect.height
			const clickX = (lastContextMenuPosition.x - rect.left) * scaleX
			const clickY = (lastContextMenuPosition.y - rect.top) * scaleY
			const bounds = getObjectBoundsLocal(newObj)
			newObj.x = clickX - bounds.minX
			newObj.y = clickY - bounds.minY
		} else {
			newObj.x = (newObj.x || 0) + offset
			newObj.y = (newObj.y || 0) + offset
		}
		drawObjects.push(newObj)
		selectObject(newObj.id)
		renderObjects()
		renderLayersList()
		saveSceneObjects()
	}

	function pasteCharacterFromData(data) {
		if (!data) return
		const newName = getUniqueCharacterName(`${data.name} Copy`)
		const newChar = createCharacter(newName, data.skin || STEVE_SKIN)
		if (!newChar) return

		newChar.sliderValues = { ...(data.sliderValues || {}) }
		applySliderValuesToCharacter(newChar)

		if (data.cameraPos && newChar.viewer) {
			newChar.viewer.camera.position.set(data.cameraPos.x, data.cameraPos.y, data.cameraPos.z)
			newChar.viewer.controls.update()
			newChar.cameraPos = { ...data.cameraPos }
		}

		if (Number.isFinite(data.width) && Number.isFinite(data.height)) {
			newChar.wrapper.style.width = `${data.width}px`
			newChar.wrapper.style.height = `${data.height}px`
			if (newChar.viewer?.setSize) {
				newChar.viewer.setSize(Math.round(data.width), Math.round(data.height))
			} else if (newChar.canvas && newChar.viewer?.camera) {
				newChar.canvas.width = Math.round(data.width)
				newChar.canvas.height = Math.round(data.height)
				newChar.viewer.camera.aspect = data.width / data.height
				newChar.viewer.camera.updateProjectionMatrix()
			}
			newChar.viewer?.render?.()
		}

		const offset = 20
		let left = (Number.isFinite(data.left) ? data.left : 0) + offset
		let top = (Number.isFinite(data.top) ? data.top : 0) + offset
		if (lastContextMenuPosition && renderArea) {
			const rect = renderArea.getBoundingClientRect()
			left = lastContextMenuPosition.x - rect.left
			top = lastContextMenuPosition.y - rect.top
		}
		newChar.wrapper.style.left = `${left}px`
		newChar.wrapper.style.top = `${top}px`

		newChar._posX = (data.posX || 0) + offset
		newChar._posY = (data.posY || 0) + offset
		const scale = newChar.scale || 1
		newChar.wrapper.style.transform = `translate(${newChar._posX}px, ${newChar._posY}px) scale(${scale})`

		newChar.visible = data.visible !== false
		newChar.wrapper.style.display = newChar.visible ? 'block' : 'none'

		selectCharacter(newChar.id)
		renderLayersList()
	}

	function setSceneClipboard(type, data) {
		if (!data) {
			sceneClipboard = null
			return
		}
		sceneClipboard = { type, data }
	}

	function pasteSceneClipboard() {
		if (!sceneClipboard) return
		if (sceneClipboard.type === 'character') pasteCharacterFromData(sceneClipboard.data)
		if (sceneClipboard.type === 'object') pasteObjectFromData(sceneClipboard.data)
	}

	const existingContextMenu = document.getElementById('characterContextMenu')
	const characterContextMenu = existingContextMenu || document.createElement('div')
	if (!existingContextMenu) {
		characterContextMenu.id = 'characterContextMenu'
		characterContextMenu.innerHTML = `
      <button type="button" data-action="copy">Copy</button>
      <button type="button" data-action="paste">Paste</button>
    `
		document.body.appendChild(characterContextMenu)
		const copyBtn = characterContextMenu.querySelector('[data-action="copy"]')
		const pasteBtn = characterContextMenu.querySelector('[data-action="paste"]')
		if (copyBtn) copyBtn.textContent = t('copy')
		if (pasteBtn) pasteBtn.textContent = t('paste')
	}

	function closeCharacterContextMenu() {
		characterContextMenu.style.display = 'none'
		characterContextMenu.dataset.targetId = ''
	}

	function openCharacterContextMenu(x, y, targetId) {
		lastContextMenuPosition = { x, y }
		const copyBtn = characterContextMenu.querySelector('[data-action="copy"]')
		const pasteBtn = characterContextMenu.querySelector('[data-action="paste"]')
		if (copyBtn) copyBtn.style.display = targetId ? 'block' : 'none'
		if (pasteBtn) pasteBtn.style.display = sceneClipboard ? 'block' : 'none'

		if (!targetId && !sceneClipboard) return

		characterContextMenu.dataset.targetId = targetId || ''
		characterContextMenu.style.display = 'block'

		const menuWidth = characterContextMenu.offsetWidth || 160
		const menuHeight = characterContextMenu.offsetHeight || 80
		const maxX = window.innerWidth - menuWidth - 8
		const maxY = window.innerHeight - menuHeight - 8
		const clampedX = Math.max(8, Math.min(x, maxX))
		const clampedY = Math.max(8, Math.min(y, maxY))
		characterContextMenu.style.left = `${clampedX}px`
		characterContextMenu.style.top = `${clampedY}px`
	}

	characterContextMenu.addEventListener('click', e => {
		const action = e.target?.dataset?.action
		if (!action) return
		if (action === 'copy') {
			const id = characterContextMenu.dataset.targetId
			const c = characters.find(ch => ch.id === id)
			setSceneClipboard('character', buildCharacterCopyData(c))
		}
		if (action === 'paste') pasteSceneClipboard()
		closeCharacterContextMenu()
	})

	document.addEventListener('click', () => closeCharacterContextMenu())
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape') closeCharacterContextMenu()
	})

	const existingObjectMenu = document.getElementById('objectContextMenu')
	const objectContextMenu = existingObjectMenu || document.createElement('div')
	if (!existingObjectMenu) {
		objectContextMenu.id = 'objectContextMenu'
		objectContextMenu.innerHTML = `
      <button type="button" data-action="copy">Copy</button>
      <button type="button" data-action="paste">Paste</button>
      <button type="button" data-action="bringForward">Bring Forward</button>
      <button type="button" data-action="sendBackward">Send Backward</button>
      <button type="button" data-action="delete">Delete</button>
    `
		document.body.appendChild(objectContextMenu)
	}

	refreshObjectMenuLabels = () => {
		const copyBtn = objectContextMenu.querySelector('[data-action="copy"]')
		const pasteBtn = objectContextMenu.querySelector('[data-action="paste"]')
		const bringBtn = objectContextMenu.querySelector('[data-action="bringForward"]')
		const sendBtn = objectContextMenu.querySelector('[data-action="sendBackward"]')
		const deleteBtn = objectContextMenu.querySelector('[data-action="delete"]')
		if (copyBtn) copyBtn.textContent = t('copy')
		if (pasteBtn) pasteBtn.textContent = t('paste')
		if (bringBtn) bringBtn.textContent = t('objectBringForward')
		if (sendBtn) sendBtn.textContent = t('objectSendBackward')
		if (deleteBtn) deleteBtn.textContent = t('objectDelete')
	}
	refreshObjectMenuLabels()

	const closeObjectContextMenu = () => {
		objectContextMenu.style.display = 'none'
	}

	const openObjectContextMenu = (x, y) => {
		lastContextMenuPosition = { x, y }
		const copyBtn = objectContextMenu.querySelector('[data-action="copy"]')
		const pasteBtn = objectContextMenu.querySelector('[data-action="paste"]')
		if (copyBtn) copyBtn.style.display = selectedObjectId ? 'block' : 'none'
		if (pasteBtn) pasteBtn.style.display = sceneClipboard ? 'block' : 'none'

		const menuWidth = objectContextMenu.offsetWidth || 160
		const menuHeight = objectContextMenu.offsetHeight || 100
		const maxX = window.innerWidth - menuWidth - 8
		const maxY = window.innerHeight - menuHeight - 8
		const clampedX = Math.max(8, Math.min(x, maxX))
		const clampedY = Math.max(8, Math.min(y, maxY))
		objectContextMenu.style.left = `${clampedX}px`
		objectContextMenu.style.top = `${clampedY}px`
		objectContextMenu.style.display = 'block'
	}

	const bringObjectForward = id => {
		const idx = layerOrder.findIndex(l => l.type === 'object' && l.id === id)
		if (idx < 0 || idx >= layerOrder.length - 1) return
		;[layerOrder[idx], layerOrder[idx + 1]] = [layerOrder[idx + 1], layerOrder[idx]]
		applyLayerZIndexes()
	}

	const sendObjectBackward = id => {
		const idx = layerOrder.findIndex(l => l.type === 'object' && l.id === id)
		if (idx <= 0) return
		;[layerOrder[idx], layerOrder[idx - 1]] = [layerOrder[idx - 1], layerOrder[idx]]
		applyLayerZIndexes()
	}

	objectContextMenu.addEventListener('click', e => {
		const action = e.target?.dataset?.action
		if (!action) return
		if (action === 'paste') {
			pasteSceneClipboard()
			closeObjectContextMenu()
			return
		}

		const selected = getObjectById(selectedObjectId)
		if (!selected) return

		if (action === 'copy') setSceneClipboard('object', buildObjectCopyData(selected))
		if (action === 'bringForward') bringObjectForward(selected.id)
		if (action === 'sendBackward') sendObjectBackward(selected.id)
		if (action === 'delete') {
			drawObjects = drawObjects.filter(obj => obj.id !== selected.id)
			selectedObjectId = null
		}

		renderObjects()
		renderLayersList()
		saveSceneObjects()
		closeObjectContextMenu()
	})

	document.addEventListener('click', () => closeObjectContextMenu())
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape') closeObjectContextMenu()
	})

	const charactersListEl = document.getElementById('charactersList')
	if (charactersListEl) {
		charactersListEl.addEventListener('contextmenu', e => {
			const item = e.target.closest('.characterItem')
			if (!item && !sceneClipboard) return
			e.preventDefault()
			openCharacterContextMenu(e.clientX, e.clientY, item?.dataset?.id || '')
		})
	}

	if (renderArea) {
		renderArea.addEventListener('contextmenu', e => {
			if (e.target.closest('.charViewport')) return
			if (!sceneClipboard) return
			e.preventDefault()
			openCharacterContextMenu(e.clientX, e.clientY, '')
		})
	}

	function createCharacter(name = `Character ${characters.length + 1}`, skin = STEVE_SKIN) {
		const id = Date.now().toString()
		const sliderValues = Object.fromEntries(Object.keys(sliders).map(k => [k, 0]))
		const isFirst = characters.length === 0
		const baseWidth = isFirst ? 480 : 320
		const baseHeight = isFirst ? 640 : 420
		// create DOM wrapper + canvas for this character
		const wrapper = document.createElement('div')
		wrapper.className = 'charViewport'
		wrapper.dataset.id = id
		const cvs = document.createElement('canvas')
		cvs.width = baseWidth
		cvs.height = baseHeight
		wrapper.style.width = `${baseWidth}px`
		wrapper.style.height = `${baseHeight}px`
		cvs.style.pointerEvents = 'auto' // Ensure canvas can receive pointer events
		wrapper.appendChild(cvs)

		// Add resize button to viewport (top left)
		const resizeViewportBtn = document.createElement('button')
		resizeViewportBtn.className = 'resizeViewportBtn'
		resizeViewportBtn.textContent = ''
		resizeViewportBtn.title = t('resize')
		resizeViewportBtn.setAttribute('aria-label', t('resize'))
		const aspectRatio = baseWidth / baseHeight // Keep aspect ratio

		resizeViewportBtn.addEventListener('pointerdown', e => {
			e.stopPropagation()
			resizingChar = { id, wrapper, cvs, charViewer: null } // charViewer will be set below
			resizeData = {
				startX: e.clientX,
				startY: e.clientY,
				startWidth: wrapper.offsetWidth,
				startHeight: wrapper.offsetHeight,
				startTop: parseFloat(wrapper.style.top) || 0,
				startLeft: parseFloat(wrapper.style.left) || 0,
				aspectRatio: aspectRatio
			}
			wrapper.classList.add('resizing', 'movable')
		})

		wrapper.appendChild(resizeViewportBtn)

		// Add move button to viewport (next to resize)
		const moveViewportBtn = document.createElement('button')
		moveViewportBtn.className = 'moveViewportBtn'
		moveViewportBtn.title = t('move')
		moveViewportBtn.setAttribute('aria-label', t('move'))
		moveViewportBtn.innerHTML =
			'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 3h-2v4h-2V5H9l3-3zm0 20l-3-3h2v-4h2v4h2l-3 3zm10-10l-3 3v-2h-4v-2h4V9l3 3zM2 12l3-3v2h4v2H5v2l-3-3z" /></svg>'
		wrapper.appendChild(moveViewportBtn)

		// Add delete button to viewport
		const deleteViewportBtn = document.createElement('button')
		deleteViewportBtn.className = 'deleteViewportBtn'
		deleteViewportBtn.textContent = 'X'
		deleteViewportBtn.onclick = e => {
			e.stopPropagation()
			// Remove character viewport from render area
			wrapper.remove()
			// Remove from characters array
			characters = characters.filter(ch => ch.id !== id)
			// Select another character if current is deleted
			if (selectedCharacterId === id) {
				if (characters.length > 0) selectCharacter(characters[0].id)
				else selectedCharacterId = null
			}
			renderLayersList()
		}
		wrapper.appendChild(deleteViewportBtn)

		renderArea.appendChild(wrapper)
		if (isFirst) {
			const areaRect = renderArea.getBoundingClientRect()
			const left = Math.max(0, (areaRect.width - baseWidth) / 2)
			const top = Math.max(0, (areaRect.height - baseHeight) / 2)
			wrapper.style.left = `${left}px`
			wrapper.style.top = `${top}px`
		}

		// create a skinviewer for this canvas
		const charViewer = new SkinViewer({
			canvas: cvs,
			width: cvs.width,
			height: cvs.height,
			skin
		})
		charViewer.controls.enableRotate = true
		charViewer.controls.enableZoom = false

		// Store charViewer reference for resizing
		if (resizingChar && resizingChar.id === id) {
			resizingChar.charViewer = charViewer
		}

		// Track zoom level for this character
		let lastZoom = charViewer.camera.position.z
		const updateZoom = () => {
			const currentZoom = charViewer.camera.position.z
			if (currentZoom !== lastZoom) {
				lastZoom = currentZoom
				// Apply scale based on zoom (inverse: closer = bigger, farther = smaller)
				const defaultZoom = 70 // approximate default zoom
				const scale = defaultZoom / currentZoom
				void scale
			}
			requestAnimationFrame(updateZoom)
		}
		updateZoom()

		const c = {
			id,
			name,
			skin,
			sliderValues,
			viewer: charViewer,
			wrapper,
			canvas: cvs,
			moveEnabled: false,
			_posX: 0,
			_posY: 0,
			cameraPos: {
				x: charViewer.camera.position.x,
				y: charViewer.camera.position.y,
				z: charViewer.camera.position.z
			},
			visible: true,
			moveButton: moveViewportBtn
		}

		moveViewportBtn.addEventListener('pointerdown', e => {
			e.stopPropagation()
			e.preventDefault()
			moveHoldChar = c
			setMoveMode(c, true)
			startDrag(c, e)
		})

		// Click on viewport to select this character
		wrapper.addEventListener('click', e => {
			e.stopPropagation()
			if (selectedCharacterId !== c.id) {
				selectCharacter(c.id)
			}
		})

		wrapper.addEventListener('contextmenu', e => {
			e.preventDefault()
			e.stopPropagation()
			openCharacterContextMenu(e.clientX, e.clientY, c.id)
		})

		// pointerdown on wrapper to start dragging when this character is movable
		wrapper.addEventListener('pointerdown', e => {
			// Don't start drag if clicking on the delete button or resize button
			if (e.target.classList.contains('deleteViewportBtn')) return
			if (e.target.classList.contains('resizeViewportBtn')) return

			// If move is not enabled, stop propagation but don't drag
			if (!c.moveEnabled) {
				if (e.target === cvs) {
					e.stopPropagation()
				}
				return
			}
			if (selectedCharacterId !== c.id) return

			dragging = true
			dragChar = c

			startX = e.clientX - c._posX
			startY = e.clientY - c._posY

			wrapper.setPointerCapture(e.pointerId)
			wrapper.classList.add('dragging')
			wrapper.style.cursor = 'grabbing'

			e.preventDefault()
		})

		characters.push(c)
		selectedCharacterId = id
		renderLayersList()
		selectCharacter(id)
		return c
	}

	function selectCharacter(id) {
		// Save zoom and position of previously selected character
		const prev = getSelectedCharacter()
		if (prev && prev.viewer) {
			prev.cameraPos = {
				x: prev.viewer.camera.position.x,
				y: prev.viewer.camera.position.y,
				z: prev.viewer.camera.position.z
			}
		}

		selectedCharacterId = id

		// Deselect any selected object when selecting a character
		if (id !== null && selectedObjectId !== null) {
			selectedObjectId = null
			renderObjects()
		}

		// Update character name display
		const characterNameEl = document.getElementById('characterName')
		if (characterNameEl) {
			characterNameEl.textContent =
				id !== null && characters.find(x => x.id === id)
					? characters.find(x => x.id === id).name
					: ''
		}

		// Show/hide content in right panel based on selection
		const panelRight = document.querySelector('.panel-right')
		if (panelRight) {
			panelRight.style.display = id !== null ? '' : 'none'
			const toggles = panelRight.querySelectorAll(
				'.panelSection.collapsible, .panelSection.collapsible *'
			)
			toggles.forEach(el => {
				el.style.display = id !== null ? '' : 'none'
			})

			const resetAllBtn = panelRight.querySelector('#resetAll')
			if (resetAllBtn) {
				const resetSection = resetAllBtn.closest('.panelSection')
				if (resetSection) resetSection.style.display = id !== null ? '' : 'none'
				else resetAllBtn.style.display = id !== null ? '' : 'none'
			}

			const nameSection = panelRight.querySelector('#characterName')?.closest('.panelSection')
			if (nameSection) nameSection.style.display = id !== null ? '' : 'none'
		}

		if (id !== null) {
			const c = characters.find(x => x.id === id)
			if (!c) return

			// Apply skin and sliders to viewer
			setSkin(c.skin)
			Object.entries(c.sliderValues).forEach(([k, v]) => {
				if (sliders[k]) {
					sliders[k].value = v
					sliders[k].dispatchEvent(new Event('input'))
				}
			})

			// Sync position inputs
			updatePositionInputs(c)

			// Restore zoom (camera position) and wrapper position
			if (c.viewer && c.cameraPos) {
				c.viewer.camera.position.set(c.cameraPos.x, c.cameraPos.y, c.cameraPos.z)
				c.viewer.controls.update()
				// Reapply transform with zoom
				const defaultZoom = 70
				const scale = defaultZoom / c.cameraPos.z
				void scale
			}
			if (c.wrapper && c._posX !== undefined && c._posY !== undefined) {
				const defaultZoom = 70
				const scale = defaultZoom / (c.cameraPos?.z || 70)
				void scale
			}
		} else {
			// Deselect: reset sliders to 0
			Object.values(sliders).forEach(s => {
				if (!s) return
				s.value = 0
				s.dispatchEvent(new Event('input'))
			})

			document.querySelectorAll('.skinPreview').forEach(el => {
				el.classList.remove('active')
			})
			if (loadSteveBtn) loadSteveBtn.classList.remove('active')
			if (loadAlexBtn) loadAlexBtn.classList.remove('active')
		}

		updateHeadUsage()

		// selection: bring selected to front, enable its controls, disable others
		characters.forEach((ch, index) => {
			const is = ch.id === id
			if (ch.wrapper) ch.wrapper.classList.toggle('active', is)
			if (ch.wrapper) ch.wrapper.classList.toggle('movable', is && ch.moveEnabled)
			if (ch.wrapper) {
				const deleteBtn = ch.wrapper.querySelector('.deleteViewportBtn')
				const resizeBtn = ch.wrapper.querySelector('.resizeViewportBtn')
				const moveBtn = ch.wrapper.querySelector('.moveViewportBtn')
				if (deleteBtn) deleteBtn.style.display = is ? 'block' : 'none'
				if (resizeBtn) resizeBtn.style.display = is ? 'block' : 'none'
				if (moveBtn) {
					moveBtn.style.display = is ? 'block' : 'none'
					moveBtn.classList.toggle('active', is && ch.moveEnabled)
				}
			}
			// z-index is managed by applyLayerZIndexes (including selected boost)

			// Allow pointer events on selected character's canvas for rotation
			if (ch.canvas) {
				ch.canvas.style.pointerEvents = is ? 'auto' : 'none'
			}
			// Enable rotation for selected character
			if (ch.viewer && ch.viewer.controls) {
				ch.viewer.controls.enableRotate = is && !ch.moveEnabled
			}
			// Disable move mode for characters that aren't selected
			if (!is && ch.moveEnabled) {
				ch.moveEnabled = false
				if (ch.moveButton) ch.moveButton.classList.remove('active')
			}
		})

		renderLayersList()
	}

	// Wire addCharacter button
	const addCharacterBtn = document.getElementById('addCharacter')
	const addCharacterLeftBtn = document.getElementById('addCharacterLeft')
	const addCharHandler = async () => {
		const defaultName = `Character ${characters.length + 1}`
		const name = await openModal({
			message: t('nameCharacter'),
			inputPlaceholder: defaultName,
			showInput: true,
			maxLength: 24
		})
		const cleanName = (name || '').trim() || defaultName
		const exists = characters.some(c => c.name.trim().toLowerCase() === cleanName.toLowerCase())
		if (exists) {
			await openModal({
				message: t('characterNameUsed'),
				showInput: false,
				showCancel: false
			})
			return
		}
		createCharacter(cleanName)
	}
	if (addCharacterBtn) addCharacterBtn.onclick = addCharHandler
	if (addCharacterLeftBtn) addCharacterLeftBtn.onclick = addCharHandler

	// --- Position inputs ---
	const charPosXInput = document.getElementById('charPosX')
	const charPosYInput = document.getElementById('charPosY')

	function updatePositionInputs(c) {
		if (charPosXInput) charPosXInput.value = Math.round(c ? c._posX : 0)
		if (charPosYInput) charPosYInput.value = Math.round(c ? c._posY : 0)
	}

	function applyPositionFromInputs() {
		const sel = getSelectedCharacter()
		if (!sel) return
		const x = parseInt(charPosXInput?.value, 10) || 0
		const y = parseInt(charPosYInput?.value, 10) || 0
		sel._posX = x
		sel._posY = y
		const scale = sel.scale || 1
		sel.wrapper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
	}

	if (charPosXInput) charPosXInput.addEventListener('input', applyPositionFromInputs)
	if (charPosYInput) charPosYInput.addEventListener('input', applyPositionFromInputs)

	// Create initial character if none
	if (characters.length === 0) createCharacter('Main', STEVE_SKIN)

	// --- DRAWING SETUP ---
	const drawCtx = drawCanvas.getContext('2d')
	// Fixed canvas size to ensure consistent export
	const CANVAS_WIDTH = 800
	const CANVAS_HEIGHT = 600
	drawCanvas.width = CANVAS_WIDTH
	drawCanvas.height = CANVAS_HEIGHT
	drawCtx.lineWidth = brushSize?.value || 50
	drawCtx.lineCap = 'round'
	drawCtx.strokeStyle = currentColor

	const OBJECT_STORAGE_KEY = 'sceneObjects'
	const SELECTION_HANDLE_SIZE = 12
	const SIDE_HANDLE_THICKNESS = 6
	const RESIZE_BUTTON_SIZE = 20
	const MIN_SCALE = 0.1

	const buildObjectId = () => `obj_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

	const normalizeObject = obj => {
		if (!obj || typeof obj !== 'object') return null
		return {
			id: obj.id || buildObjectId(),
			type: obj.type || 'stroke',
			x: Number.isFinite(obj.x) ? obj.x : 0,
			y: Number.isFinite(obj.y) ? obj.y : 0,
			rotation: Number.isFinite(obj.rotation) ? obj.rotation : 0,
			scaleX: Number.isFinite(obj.scaleX) ? obj.scaleX : 1,
			scaleY: Number.isFinite(obj.scaleY) ? obj.scaleY : 1,
			color: obj.color || '#000000',
			lineWidth: Number.isFinite(obj.lineWidth) ? obj.lineWidth : 2,
			points: Array.isArray(obj.points) ? obj.points : [],
			shapeType: obj.shapeType || 'rect',
			width: Number.isFinite(obj.width) ? obj.width : 0,
			height: Number.isFinite(obj.height) ? obj.height : 0,
			text: obj.text || '',
			fontSize: Number.isFinite(obj.fontSize) ? obj.fontSize : 36,
			fontFamily: obj.fontFamily || '"Space Grotesk", "Segoe UI", sans-serif',
			fontWeight: Number.isFinite(obj.fontWeight) ? obj.fontWeight : 700
		}
	}

	const saveSceneObjects = () => {
		localStorage.setItem(OBJECT_STORAGE_KEY, JSON.stringify(drawObjects))
		captureState()
	}

	const loadSceneObjects = () => {
		try {
			const stored = localStorage.getItem(OBJECT_STORAGE_KEY)
			if (!stored) return
			const parsed = JSON.parse(stored)
			if (Array.isArray(parsed)) {
				const normalized = parsed.map(normalizeObject).filter(Boolean)
				const legacyErasers = normalized.filter(obj => obj.type === 'eraser')
				drawObjects = normalized.filter(obj => obj.type !== 'eraser')

				// Restore layer indices and counter
				let maxIndex = 0
				drawObjects.forEach(obj => {
					if (typeof obj._layerOrderIndex === 'number') {
						if (obj._layerOrderIndex > maxIndex) maxIndex = obj._layerOrderIndex
					}
				})
				layerOrderCounter = Math.max(layerOrderCounter, maxIndex + 1)

				drawObjects.forEach(ensureLayerOrder)

				legacyErasers.forEach(eraser => applyEraserToStrokes(eraser))
				if (legacyErasers.length > 0) saveSceneObjects()
			}
		} catch (err) {
			drawObjects = []
		}
	}

	const getObjectById = id => drawObjects.find(obj => obj.id === id)

	const getTextMetrics = obj => {
		const lines = (obj.text || '').split('\n')
		const fontSize = Math.max(8, Number(obj.fontSize) || 36)
		const lineHeight = Math.round(fontSize * 1.2)
		drawCtx.save()
		drawCtx.font = `${obj.fontWeight || 700} ${fontSize}px ${obj.fontFamily || '"Space Grotesk", "Segoe UI", sans-serif'}`
		const maxWidth = Math.max(...lines.map(line => drawCtx.measureText(line).width), 1)
		drawCtx.restore()
		return { maxWidth, lineHeight, height: lineHeight * lines.length, lines }
	}

	const getObjectBoundsLocal = obj => {
		if (obj.type === 'text') {
			const { maxWidth, height } = getTextMetrics(obj)
			return {
				minX: -maxWidth / 2,
				maxX: maxWidth / 2,
				minY: -height / 2,
				maxY: height / 2
			}
		}

		if (obj.type === 'shape' && obj.shapeType === 'line') {
			const width = Math.max(1, obj.width || 0)
			const height = Math.max(obj.lineWidth || 2, 6)
			return {
				minX: -width / 2,
				maxX: width / 2,
				minY: -height / 2,
				maxY: height / 2
			}
		}

		if (obj.type === 'shape') {
			const width = Math.max(1, obj.width || 0)
			const height = Math.max(1, obj.height || 0)
			return {
				minX: -width / 2,
				maxX: width / 2,
				minY: -height / 2,
				maxY: height / 2
			}
		}

		if (obj.type === 'stroke' || obj.type === 'eraser') {
			if (!obj.points || obj.points.length === 0) {
				return { minX: -1, maxX: 1, minY: -1, maxY: 1 }
			}
			const xs = obj.points.map(p => p.x)
			const ys = obj.points.map(p => p.y)
			const minX = Math.min(...xs)
			const maxX = Math.max(...xs)
			const minY = Math.min(...ys)
			const maxY = Math.max(...ys)
			const pad = (obj.lineWidth || 2) / 2 + 2
			return {
				minX: minX - pad,
				maxX: maxX + pad,
				minY: minY - pad,
				maxY: maxY + pad
			}
		}

		return { minX: -1, maxX: 1, minY: -1, maxY: 1 }
	}

	const applyObjectTransform = (ctx, obj) => {
		ctx.translate(obj.x || 0, obj.y || 0)
		ctx.rotate(obj.rotation || 0)
		ctx.scale(obj.scaleX || 1, obj.scaleY || 1)
	}

	const renderObject = obj => {
		drawCtx.save()
		applyObjectTransform(drawCtx, obj)
		drawCtx.globalCompositeOperation = obj.type === 'eraser' ? 'destination-out' : 'source-over'

		if (obj.type === 'stroke' || obj.type === 'eraser') {
			if (obj.points.length > 0) {
				drawCtx.lineCap = 'round'
				drawCtx.strokeStyle = obj.color || '#000000'
				drawCtx.lineWidth = obj.lineWidth || 2
				drawCtx.beginPath()
				drawCtx.moveTo(obj.points[0].x, obj.points[0].y)
				obj.points.slice(1).forEach(pt => drawCtx.lineTo(pt.x, pt.y))
				drawCtx.stroke()
			}
		} else if (obj.type === 'shape') {
			const width = Math.max(1, obj.width || 0)
			const height = Math.max(1, obj.height || 0)
			drawCtx.fillStyle = obj.color || '#000000'
			drawCtx.strokeStyle = obj.color || '#000000'
			drawCtx.lineWidth = obj.lineWidth || 2

			if (obj.shapeType === 'line') {
				drawCtx.beginPath()
				drawCtx.moveTo(-width / 2, 0)
				drawCtx.lineTo(width / 2, 0)
				drawCtx.stroke()
			} else if (obj.shapeType === 'rect') {
				drawCtx.fillRect(-width / 2, -height / 2, width, height)
			} else if (obj.shapeType === 'circle') {
				drawCtx.beginPath()
				drawCtx.arc(0, 0, Math.max(width, height) / 2, 0, 2 * Math.PI)
				drawCtx.fill()
			} else if (obj.shapeType === 'triangle') {
				drawCtx.beginPath()
				drawCtx.moveTo(0, -height / 2)
				drawCtx.lineTo(width / 2, height / 2)
				drawCtx.lineTo(-width / 2, height / 2)
				drawCtx.closePath()
				drawCtx.fill()
			} else if (obj.shapeType === 'polygon') {
				if (obj.points && obj.points.length > 0) {
					drawCtx.beginPath()
					drawCtx.moveTo(obj.points[0].x, obj.points[0].y)
					obj.points.slice(1).forEach(pt => drawCtx.lineTo(pt.x, pt.y))
					drawCtx.closePath()
					drawCtx.fill()
				}
			}
		} else if (obj.type === 'text') {
			const { maxWidth, lineHeight, lines } = getTextMetrics(obj)
			drawCtx.fillStyle = obj.color || '#000000'
			drawCtx.font = `${obj.fontWeight || 700} ${obj.fontSize || 36}px ${obj.fontFamily || '"Space Grotesk", "Segoe UI", sans-serif'}`
			drawCtx.textBaseline = 'top'
			drawCtx.textAlign = 'left'
			const startX = -maxWidth / 2
			const startY = -(lineHeight * lines.length) / 2
			lines.forEach((line, index) => {
				drawCtx.fillText(line, startX, startY + index * lineHeight)
			})
		}

		drawCtx.restore()
	}

	const transformPoint = (x, y, obj) => {
		const scaleX = obj.scaleX || 1
		const scaleY = obj.scaleY || 1
		const cos = Math.cos(obj.rotation || 0)
		const sin = Math.sin(obj.rotation || 0)
		const sx = x * scaleX
		const sy = y * scaleY
		return {
			x: (obj.x || 0) + sx * cos - sy * sin,
			y: (obj.y || 0) + sx * sin + sy * cos
		}
	}

	const getSelectionHandles = obj => {
		const bounds = getObjectBoundsLocal(obj)
		const center = { x: obj.x || 0, y: obj.y || 0 }
		const width = bounds.maxX - bounds.minX
		const height = bounds.maxY - bounds.minY
		const scaleX = Math.max(0.001, Math.abs(obj.scaleX || 1))
		const scaleY = Math.max(0.001, Math.abs(obj.scaleY || 1))
		const baseWorld = Math.min(width * scaleX, height * scaleY)
		const maxSize = Math.max(1, Math.floor(baseWorld))
		const resizeSize = Math.min(RESIZE_BUTTON_SIZE, Math.max(1, maxSize - 2))
		const padWorld = 1
		const insetX = Math.min((resizeSize / 2 + padWorld) / scaleX, width / 2)
		const insetY = Math.min((resizeSize / 2 + padWorld) / scaleY, height / 2)
		const resizeLocal = {
			x: bounds.minX + insetX,
			y: bounds.minY + insetY
		}

		const handles = [
			{
				type: 'resize',
				width: resizeSize,
				height: resizeSize,
				...transformPoint(resizeLocal.x, resizeLocal.y, obj)
			},
			{
				type: 'n',
				width: SELECTION_HANDLE_SIZE,
				height: SIDE_HANDLE_THICKNESS,
				...transformPoint(0, bounds.minY, obj)
			},
			{
				type: 's',
				width: SELECTION_HANDLE_SIZE,
				height: SIDE_HANDLE_THICKNESS,
				...transformPoint(0, bounds.maxY, obj)
			},
			{
				type: 'e',
				width: SIDE_HANDLE_THICKNESS,
				height: SELECTION_HANDLE_SIZE,
				...transformPoint(bounds.maxX, 0, obj)
			},
			{
				type: 'w',
				width: SIDE_HANDLE_THICKNESS,
				height: SELECTION_HANDLE_SIZE,
				...transformPoint(bounds.minX, 0, obj)
			}
		]

		return handles.map(handle => ({
			...handle,
			center,
			rotation: obj.rotation || 0
		}))
	}

	const drawRoundedRect = (ctx, x, y, w, h, r) => {
		const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2))
		if (ctx.roundRect) {
			ctx.roundRect(x, y, w, h, radius)
			return
		}
		ctx.moveTo(x + radius, y)
		ctx.lineTo(x + w - radius, y)
		ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
		ctx.lineTo(x + w, y + h - radius)
		ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
		ctx.lineTo(x + radius, y + h)
		ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
		ctx.lineTo(x, y + radius)
		ctx.quadraticCurveTo(x, y, x + radius, y)
	}

	const drawSelectionOutline = obj => {
		if (!obj || isExporting) return
		const bounds = getObjectBoundsLocal(obj)
		const corners = [
			transformPoint(bounds.minX, bounds.minY, obj),
			transformPoint(bounds.maxX, bounds.minY, obj),
			transformPoint(bounds.maxX, bounds.maxY, obj),
			transformPoint(bounds.minX, bounds.maxY, obj)
		]

		drawCtx.save()
		drawCtx.globalCompositeOperation = 'source-over'
		drawCtx.strokeStyle = '#60a5fa'
		drawCtx.lineWidth = 2
		drawCtx.beginPath()
		drawCtx.moveTo(corners[0].x, corners[0].y)
		corners.slice(1).forEach(pt => drawCtx.lineTo(pt.x, pt.y))
		drawCtx.closePath()
		drawCtx.stroke()

		const handles = getSelectionHandles(obj)
		handles.forEach(handle => {
			const width = handle.width || SELECTION_HANDLE_SIZE
			const height = handle.height || SELECTION_HANDLE_SIZE
			drawCtx.fillStyle = handle.type === 'resize' ? '#0ea5e9' : '#ffffff'
			drawCtx.strokeStyle = '#1d4ed8'
			drawCtx.lineWidth = 1.5
			drawCtx.save()
			drawCtx.translate(handle.x, handle.y)
			drawCtx.rotate(handle.rotation || 0)
			drawCtx.beginPath()
			if (handle.type === 'resize') {
				const radius = Math.min(3, Math.floor(Math.min(width, height) * 0.15))
				drawRoundedRect(drawCtx, -width / 2, -height / 2, width, height, radius)
			} else {
				drawCtx.rect(-width / 2, -height / 2, width, height)
			}
			drawCtx.fill()
			drawCtx.stroke()

			if (handle.type === 'resize') {
				drawCtx.strokeStyle = '#f8fafc'
				drawCtx.lineWidth = 2
				const inset = Math.max(2, Math.floor(width * 0.2))
				const len = Math.max(4, Math.floor(width * 0.3))
				drawCtx.beginPath()
				drawCtx.moveTo(-width / 2 + inset, -height / 2 + inset + len)
				drawCtx.lineTo(-width / 2 + inset, -height / 2 + inset)
				drawCtx.lineTo(-width / 2 + inset + len, -height / 2 + inset)
				drawCtx.moveTo(width / 2 - inset - len, height / 2 - inset)
				drawCtx.lineTo(width / 2 - inset, height / 2 - inset)
				drawCtx.lineTo(width / 2 - inset, height / 2 - inset - len)
				drawCtx.stroke()
			}
			drawCtx.restore()
		})

		drawCtx.restore()
	}

	const renderObjects = () => {
		drawCtx.globalCompositeOperation = 'source-over'
		drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height)
		drawObjects.forEach(obj => {
			if (obj.visible === false) return
			renderObject(obj)
		})
		if (activeDrawObject) renderObject(activeDrawObject)
		const selected = getObjectById(selectedObjectId)
		if (selected && selected.visible !== false) drawSelectionOutline(selected)
	}

	const selectObject = id => {
		selectedObjectId = id || null
		const selected = getObjectById(selectedObjectId)
		if (selected && selected.color && colorPicker) {
			currentColor = selected.color
			colorPicker.value = selected.color
			drawCtx.strokeStyle = currentColor
			drawCtx.fillStyle = currentColor
			updateTextEditorStyle()
		}
		// Deselect character when selecting an object
		if (id !== null && selectedCharacterId !== null) {
			selectCharacter(null)
		}
		renderObjects()
	}

	const screenToLocal = (x, y, obj) => {
		const dx = x - (obj.x || 0)
		const dy = y - (obj.y || 0)
		const cos = Math.cos(-(obj.rotation || 0))
		const sin = Math.sin(-(obj.rotation || 0))
		const rx = dx * cos - dy * sin
		const ry = dx * sin + dy * cos
		return {
			x: rx / (obj.scaleX || 1),
			y: ry / (obj.scaleY || 1)
		}
	}

	const hitTestStroke = (localPoint, obj) => {
		if (!obj.points || obj.points.length < 2) return false
		const threshold = (obj.lineWidth || 2) / 2 + 6
		for (let i = 0; i < obj.points.length - 1; i += 1) {
			const a = obj.points[i]
			const b = obj.points[i + 1]
			const dx = b.x - a.x
			const dy = b.y - a.y
			const lenSq = dx * dx + dy * dy || 1
			const t = Math.max(
				0,
				Math.min(1, ((localPoint.x - a.x) * dx + (localPoint.y - a.y) * dy) / lenSq)
			)
			const projX = a.x + t * dx
			const projY = a.y + t * dy
			const dist = Math.hypot(localPoint.x - projX, localPoint.y - projY)
			if (dist <= threshold) return true
		}
		return false
	}

	const hitTestObject = (x, y) => {
		for (let i = drawObjects.length - 1; i >= 0; i -= 1) {
			const obj = drawObjects[i]
			if (obj.visible === false) continue
			if (obj.type === 'eraser') continue
			const local = screenToLocal(x, y, obj)
			const bounds = getObjectBoundsLocal(obj)
			if (obj.type === 'stroke') {
				if (hitTestStroke(local, obj)) return obj
			} else if (
				local.x >= bounds.minX &&
				local.x <= bounds.maxX &&
				local.y >= bounds.minY &&
				local.y <= bounds.maxY
			) {
				return obj
			}
		}
		return null
	}

	const splitShapeByEraser = (obj, eraserObj, eraserRadius) => {
		// Determine the bounding box of the object in World Space (roughly) directly from properties
		// or by transforming its corners.
		const hw = (obj.width || 100) / 2
		const hh = (obj.height || 100) / 2
		// Corners in local
		const localCorners = [
			{ x: -hw, y: -hh },
			{ x: hw, y: -hh },
			{ x: hw, y: hh },
			{ x: -hw, y: hh }
		]
		if (obj.shapeType === 'polygon' && obj.points) {
			// Use actual points for bounding box if available
			const xs = obj.points.map(p => p.x)
			const ys = obj.points.map(p => p.y)
			localCorners[0] = { x: Math.min(...xs), y: Math.min(...ys) }
			localCorners[1] = { x: Math.max(...xs), y: Math.min(...ys) }
			localCorners[2] = { x: Math.max(...xs), y: Math.max(...ys) }
			localCorners[3] = { x: Math.min(...xs), y: Math.max(...ys) }
		}

		// Transform to World
		const worldCorners = localCorners.map(p => transformPoint(p.x, p.y, obj))

		// Start with a padded bounding box around the object
		const padding = (eraserRadius || 10) + 20
		const minX = Math.min(...worldCorners.map(p => p.x)) - padding
		const maxX = Math.max(...worldCorners.map(p => p.x)) + padding
		const minY = Math.min(...worldCorners.map(p => p.y)) - padding
		const maxY = Math.max(...worldCorners.map(p => p.y)) + padding

		const w = Math.ceil(maxX - minX)
		const h = Math.ceil(maxY - minY)
		if (w < 1 || h < 1) return null

		// Create offscreen canvas
		const cvs = document.createElement('canvas')
		cvs.width = w
		cvs.height = h
		const ctx = cvs.getContext('2d')

		// Shift coordinate system so (minX, minY) is at (0,0)
		ctx.translate(-minX, -minY)

		// Draw the Object (Transformation handled by applyObjectTransform)
		ctx.save()
		applyObjectTransform(ctx, obj)
		ctx.fillStyle = '#000000'
		ctx.strokeStyle = '#000000'
		if (obj.shapeType === 'rect') {
			ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height)
		} else if (obj.shapeType === 'circle') {
			ctx.beginPath()
			ctx.arc(0, 0, Math.max(obj.width, obj.height) / 2, 0, Math.PI * 2)
			ctx.fill()
		} else if (obj.shapeType === 'triangle') {
			ctx.beginPath()
			ctx.moveTo(0, -obj.height / 2)
			ctx.lineTo(obj.width / 2, obj.height / 2)
			ctx.lineTo(-obj.width / 2, obj.height / 2)
			ctx.fill()
		} else if (obj.shapeType === 'polygon' && obj.points) {
			ctx.beginPath()
			ctx.moveTo(obj.points[0].x, obj.points[0].y)
			obj.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
			ctx.fill()
		} else if (obj.shapeType === 'line') {
			ctx.lineWidth = Math.max(obj.lineWidth || 2, 4)
			ctx.beginPath()
			ctx.moveTo(-obj.width / 2, 0)
			ctx.lineTo(obj.width / 2, 0)
			ctx.stroke()
		}
		ctx.restore()

		// Erase
		ctx.globalCompositeOperation = 'destination-out'
		ctx.lineWidth = eraserObj.lineWidth || 10
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.beginPath()
		if (eraserObj.points.length > 0) {
			ctx.moveTo(eraserObj.points[0].x, eraserObj.points[0].y)
			eraserObj.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
			ctx.stroke()
		}

		// Analyze Result
		const imgData = ctx.getImageData(0, 0, w, h)
		const data = imgData.data
		const visited = new Uint8Array(w * h)
		const pieces = []

		// Helper: 2D index
		const idx = (x, y) => y * w + x

		// Iterate over pixels to find islands
		for (let y = 0; y < h; y += 1) {
			for (let x = 0; x < w; x += 1) {
				if (visited[idx(x, y)]) continue
				if (data[idx(x, y) * 4 + 3] > 50) {
					// Found solid pixel (alpha > 50)
					// Flood Fill to mark this island
					const stack = [[x, y]]
					const islandPixels = new Set()
					visited[idx(x, y)] = 1
					let iMinX = x,
						iMaxX = x,
						iMinY = y,
						iMaxY = y

					while (stack.length) {
						const [cx, cy] = stack.pop()
						const key = `${cx},${cy}`
						if (!islandPixels.has(key)) {
							islandPixels.add(key)
							if (cx < iMinX) iMinX = cx
							if (cx > iMaxX) iMaxX = cx
							if (cy < iMinY) iMinY = cy
							if (cy > iMaxY) iMaxY = cy

							const nbors = [
								[1, 0],
								[-1, 0],
								[0, 1],
								[0, -1]
							]
							for (const [dx, dy] of nbors) {
								const nx = cx + dx,
									ny = cy + dy
								if (
									nx >= 0 &&
									nx < w &&
									ny >= 0 &&
									ny < h &&
									!visited[idx(nx, ny)] &&
									data[idx(nx, ny) * 4 + 3] > 50
								) {
									visited[idx(nx, ny)] = 1
									stack.push([nx, ny])
								}
							}
						}
					}

					// Filter noise
					if (islandPixels.size < 10) continue

					// Generate Polygon
					let startPx = null
					// Scan the implementation bounding box
					outer: for (let py = iMinY; py <= iMaxY; py++) {
						for (let px = iMinX; px <= iMaxX; px++) {
							if (islandPixels.has(`${px},${py}`)) {
								startPx = { x: px, y: py }
								break outer
							}
						}
					}
					if (!startPx) continue

					// Moore Tracing
					const geometry = []
					let cx = startPx.x,
						cy = startPx.y
					geometry.push({ x: cx, y: cy })

					const dirs = [
						{ x: 0, y: -1 },
						{ x: 1, y: -1 },
						{ x: 1, y: 0 },
						{ x: 1, y: 1 },
						{ x: 0, y: 1 },
						{ x: -1, y: 1 },
						{ x: -1, y: 0 },
						{ x: -1, y: -1 }
					]
					let entryDir = 6
					let boundaryIter = 0
					const maxIter = islandPixels.size * 5 + 1000

					let tracerX = cx,
						tracerY = cy

					do {
						let foundNext = false
						for (let k = 0; k < 8; k++) {
							const checkDir = (entryDir + 1 + k) % 8
							const nx = tracerX + dirs[checkDir].x
							const ny = tracerY + dirs[checkDir].y
							if (islandPixels.has(`${nx},${ny}`)) {
								tracerX = nx
								tracerY = ny
								entryDir = (checkDir + 4) % 8
								foundNext = true
								geometry.push({ x: tracerX, y: tracerY })
								break
							}
						}
						if (!foundNext) break
					} while (
						(tracerX !== startPx.x || tracerY !== startPx.y) &&
						boundaryIter++ < maxIter
					)

					// Simplify geometry
					const simplePoints = []
					for (let i = 0; i < geometry.length; i += 2) {
						simplePoints.push(geometry[i])
					}
					if (simplePoints.length < 3) continue

					const centerX = iMinX + (iMaxX - iMinX) / 2
					const centerY = iMinY + (iMaxY - iMinY) / 2
					const finalWorldX = minX + centerX
					const finalWorldY = minY + centerY

					const finalPoints = simplePoints.map(p => ({
						x: p.x * 1 - centerX,
						y: p.y * 1 - centerY
					}))

					pieces.push({
						...obj,
						id: buildObjectId(),
						type: 'shape',
						shapeType: 'polygon',
						x: finalWorldX,
						y: finalWorldY,
						width: iMaxX - iMinX,
						height: iMaxY - iMinY,
						rotation: 0,
						points: finalPoints
					})
				}
			}
		}

		return pieces.length > 0 ? pieces : null
	}

	const splitStrokeByEraser = (obj, eraserObj, eraserRadius) => {
		if (!obj.points || obj.points.length < 2) return null
		const worldPoints = obj.points.map(p => transformPoint(p.x, p.y, obj))
		const xs = worldPoints.map(p => p.x)
		const ys = worldPoints.map(p => p.y)
		const padding = (eraserRadius || 10) + Math.max(obj.lineWidth || 2, 4)
		const minX = Math.min(...xs) - padding
		const maxX = Math.max(...xs) + padding
		const minY = Math.min(...ys) - padding
		const maxY = Math.max(...ys) + padding

		const w = Math.ceil(maxX - minX)
		const h = Math.ceil(maxY - minY)
		if (w < 1 || h < 1) return null

		const cvs = document.createElement('canvas')
		cvs.width = w
		cvs.height = h
		const ctx = cvs.getContext('2d')
		ctx.translate(-minX, -minY)

		ctx.save()
		ctx.strokeStyle = '#000000'
		ctx.lineWidth = Math.max(obj.lineWidth || 2, 2)
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.beginPath()
		ctx.moveTo(worldPoints[0].x, worldPoints[0].y)
		worldPoints.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
		ctx.stroke()
		ctx.restore()

		ctx.globalCompositeOperation = 'destination-out'
		ctx.lineWidth = eraserObj.lineWidth || 10
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		ctx.beginPath()
		if (eraserObj.points.length > 0) {
			ctx.moveTo(eraserObj.points[0].x, eraserObj.points[0].y)
			eraserObj.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
			ctx.stroke()
		}

		const imgData = ctx.getImageData(0, 0, w, h)
		const data = imgData.data
		const visited = new Uint8Array(w * h)
		const pieces = []
		const idx = (x, y) => y * w + x

		for (let y = 0; y < h; y += 1) {
			for (let x = 0; x < w; x += 1) {
				if (visited[idx(x, y)]) continue
				if (data[idx(x, y) * 4 + 3] > 50) {
					const stack = [[x, y]]
					const islandPixels = new Set()
					visited[idx(x, y)] = 1
					let iMinX = x,
						iMaxX = x,
						iMinY = y,
						iMaxY = y

					while (stack.length) {
						const [cx, cy] = stack.pop()
						const key = `${cx},${cy}`
						if (!islandPixels.has(key)) {
							islandPixels.add(key)
							if (cx < iMinX) iMinX = cx
							if (cx > iMaxX) iMaxX = cx
							if (cy < iMinY) iMinY = cy
							if (cy > iMaxY) iMaxY = cy

							const nbors = [
								[1, 0],
								[-1, 0],
								[0, 1],
								[0, -1]
							]
							for (const [dx, dy] of nbors) {
								const nx = cx + dx,
									ny = cy + dy
								if (
									nx >= 0 &&
									nx < w &&
									ny >= 0 &&
									ny < h &&
									!visited[idx(nx, ny)] &&
									data[idx(nx, ny) * 4 + 3] > 50
								) {
									visited[idx(nx, ny)] = 1
									stack.push([nx, ny])
								}
							}
						}
					}

					if (islandPixels.size < 10) continue

					let startPx = null
					outer: for (let py = iMinY; py <= iMaxY; py += 1) {
						for (let px = iMinX; px <= iMaxX; px += 1) {
							if (islandPixels.has(`${px},${py}`)) {
								startPx = { x: px, y: py }
								break outer
							}
						}
					}
					if (!startPx) continue

					const geometry = []
					let cx = startPx.x,
						cy = startPx.y
					geometry.push({ x: cx, y: cy })

					const dirs = [
						{ x: 0, y: -1 },
						{ x: 1, y: -1 },
						{ x: 1, y: 0 },
						{ x: 1, y: 1 },
						{ x: 0, y: 1 },
						{ x: -1, y: 1 },
						{ x: -1, y: 0 },
						{ x: -1, y: -1 }
					]
					let entryDir = 6
					let boundaryIter = 0
					const maxIter = islandPixels.size * 5 + 1000
					let tracerX = cx,
						tracerY = cy

					do {
						let foundNext = false
						for (let k = 0; k < 8; k += 1) {
							const checkDir = (entryDir + 1 + k) % 8
							const nx = tracerX + dirs[checkDir].x
							const ny = tracerY + dirs[checkDir].y
							if (islandPixels.has(`${nx},${ny}`)) {
								tracerX = nx
								tracerY = ny
								entryDir = (checkDir + 4) % 8
								foundNext = true
								geometry.push({ x: tracerX, y: tracerY })
								break
							}
						}
						if (!foundNext) break
					} while (
						(tracerX !== startPx.x || tracerY !== startPx.y) &&
						boundaryIter++ < maxIter
					)

					const simplePoints = []
					for (let i = 0; i < geometry.length; i += 2) {
						simplePoints.push(geometry[i])
					}
					if (simplePoints.length < 3) continue

					const centerX = iMinX + (iMaxX - iMinX) / 2
					const centerY = iMinY + (iMaxY - iMinY) / 2
					const finalWorldX = minX + centerX
					const finalWorldY = minY + centerY

					const finalPoints = simplePoints.map(p => ({
						x: p.x - centerX,
						y: p.y - centerY
					}))

					pieces.push({
						...obj,
						id: buildObjectId(),
						type: 'shape',
						shapeType: 'polygon',
						originType: 'stroke',
						x: finalWorldX,
						y: finalWorldY,
						width: iMaxX - iMinX,
						height: iMaxY - iMinY,
						rotation: 0,
						points: finalPoints
					})
				}
			}
		}

		return pieces.length > 0 ? pieces : null
	}

	const applyEraserToStrokes = eraserObj => {
		if (!eraserObj?.points || eraserObj.points.length < 2) return
		const eraserRadius = (eraserObj.lineWidth || 10) / 2
		const nextObjects = []
		let nextSelectedId = selectedObjectId

		const distancePointToSegment = (p, a, b) => {
			const dx = b.x - a.x
			const dy = b.y - a.y
			const lenSq = dx * dx + dy * dy || 1
			const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
			const projX = a.x + t * dx
			const projY = a.y + t * dy
			return Math.hypot(p.x - projX, p.y - projY)
		}

		const distancePointToPolyline = (p, points) => {
			let min = Infinity
			for (let i = 0; i < points.length - 1; i += 1) {
				const d = distancePointToSegment(p, points[i], points[i + 1])
				if (d < min) min = d
			}
			return min
		}

		const densifyPoints = (points, step) => {
			if (points.length < 2) return points.slice()
			const dense = [points[0]]
			for (let i = 0; i < points.length - 1; i += 1) {
				const a = points[i]
				const b = points[i + 1]
				const len = Math.hypot(b.x - a.x, b.y - a.y)
				const steps = Math.max(1, Math.ceil(len / step))
				for (let s = 1; s <= steps; s += 1) {
					const t = s / steps
					dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
				}
			}
			return dense
		}

		// Helper: Recenter a stroke (World Points -> New Object)
		const recenterStrokeSegments = (originalObj, worldPoints) => {
			if (worldPoints.length < 2) return null
			const xs = worldPoints.map(p => p.x)
			const ys = worldPoints.map(p => p.y)
			const minX = Math.min(...xs)
			const maxX = Math.max(...xs)
			const minY = Math.min(...ys)
			const maxY = Math.max(...ys)
			const centerX = (minX + maxX) / 2
			const centerY = (minY + maxY) / 2

			return {
				...originalObj,
				id: buildObjectId(),
				x: centerX,
				y: centerY,
				width: maxX - minX,
				height: maxY - minY,
				points: worldPoints.map(p => ({
					x: p.x - centerX,
					y: p.y - centerY
				}))
			}
		}

		drawObjects.forEach(obj => {
			// Logic for Strokes
			if (obj.type === 'stroke') {
				const worldPoints = obj.points.map(p => transformPoint(p.x, p.y, obj))
				const step = Math.max(1, (obj.lineWidth || 2) / 2)
				const densePoints = densifyPoints(worldPoints, step)
				const segments = []
				let current = []

				densePoints.forEach(pt => {
					const d = distancePointToPolyline(pt, eraserObj.points)
					if (d > eraserRadius) {
						current.push(pt)
					} else {
						if (current.length > 1) {
							segments.push(current)
							current = []
						} else {
							current = []
						}
					}
				})

				if (current.length > 1) segments.push(current)

				if (segments.length === 0) {
					if (obj.id === selectedObjectId) nextSelectedId = null
				} else if (segments.length === 1 && segments[0].length === worldPoints.length) {
					nextObjects.push(obj)
				} else {
					segments.forEach(seg => {
						const newObj = recenterStrokeSegments(obj, seg)
						if (newObj) {
							nextObjects.push(newObj)
							if (obj.id === selectedObjectId && !nextSelectedId) {
								nextSelectedId = newObj.id
							}
						}
					})
				}
				return
			}

			if (obj.type === 'shape') {
				const pieces = splitShapeByEraser(obj, eraserObj, eraserRadius)
				if (pieces) {
					pieces.forEach(p => nextObjects.push(p))
					if (obj.id === selectedObjectId) {
						const largest = pieces.reduce((prev, curr) =>
							curr.width * curr.height > prev.width * prev.height ? curr : prev
						)
						nextSelectedId = largest.id
					}
				} else {
					const objBounds = {
						minX: obj.x - (obj.width || 0) / 2 - 200,
						maxX: obj.x + (obj.width || 0) / 2 + 200,
						minY: obj.y - (obj.height || 0) / 2 - 200,
						maxY: obj.y + (obj.height || 0) / 2 + 200
					}
					const eraserXs = eraserObj.points.map(p => p.x)
					const eraserYs = eraserObj.points.map(p => p.y)
					const eMinX = Math.min(...eraserXs),
						eMaxX = Math.max(...eraserXs)
					const eMinY = Math.min(...eraserYs),
						eMaxY = Math.max(...eraserYs)

					if (
						eMaxX < objBounds.minX ||
						eMinX > objBounds.maxX ||
						eMaxY < objBounds.minY ||
						eMinY > objBounds.maxY
					) {
						nextObjects.push(obj)
					} else {
						if (pieces) {
							pieces.forEach(x => nextObjects.push(x))
						}
					}
				}
				return
			}

			nextObjects.push(obj)
		})

		drawObjects = nextObjects
		if (selectedObjectId !== nextSelectedId) {
			selectObject(nextSelectedId)
		} else {
			renderObjects()
		}
	}

	const hitTestHandle = (x, y, obj) => {
		if (!obj) return null
		const handles = getSelectionHandles(obj)
		return handles.find(handle => {
			const local = screenToLocal(x, y, {
				x: handle.x,
				y: handle.y,
				rotation: handle.rotation || 0,
				scaleX: 1,
				scaleY: 1
			})
			const width = handle.width || SELECTION_HANDLE_SIZE
			const height = handle.height || SELECTION_HANDLE_SIZE
			return Math.abs(local.x) <= width / 2 && Math.abs(local.y) <= height / 2
		})
	}

	loadSceneObjects()
	captureState()
	renderObjects()
	renderLayersList()

	// Click on renderArea to deselect character (background only)
	renderArea.addEventListener('click', e => {
		if (clickThroughHandled) {
			clickThroughHandled = false
			return
		}
		const target = e.target
		if (target && target.closest) {
			// Allow clicking on "empty" space (not viewport, not viewer content) to deselect
			// but if we clicked a character viewport, keep selection
			if (target.closest('.charViewport')) return

			// If clicking inside viewer but not on a specific char (should be covered by charViewport check actually)
			// The viewer div is inside rendering area.
			// We want to deselect if we click on DrawCanvas (empty part handled by mousedown) or Background.
			// But we just want to avoid deselecting if we clicked a valid object.
			// The previous logic was:
			// if (target.closest(".charViewport")) return;
			// if (target.closest("#viewer")) return;
			// if (target.closest("#drawCanvas")) return;

			// The user wants: "quand on appuie n'importe ou ça déselectionne le perso" (except on the perso itself)
			// So if it IS a charViewport, don't deselect. Otherwise, deselect.
			// Note: Clicks on draw objects are handled by drawCanvas mousedown/click, which stops propagation if it hit something?
			// Actually drawCanvas mousedown handles object selection.
			// If drawCanvas mousedown HIT an object, it does selectObject(id) and selectCharacter(null).
			// If it missed, it does selectObject(null).
			// Then the CLICK event bubbles here.
			// If we clicked an object, selectObject handled it.
			// If we clicked emptiness, we want selectCharacter(null).
			// So, really, we just need to protect clicks that definitely ARE on a character.
		}

		// If the click originated from a UI element overlaying the area (like a context menu), we might need care,
		// but here we are listening on renderArea.

		// Simple check: if we clicked a character, we returned above.
		// If we clicked an object on canvas, the mousedown listener on canvas ALREADY handled logic.
		// But wait, if logic ran on mousedown, and then we deselect here on click?

		// If we clicked an object: mousedown -> selectObject(id), selectCharacter(null).
		// Then click bubbles to renderArea. renderArea -> selectCharacter(null). Harmless redundant call.

		// If we clicked nothing on canvas: mousedown -> selectObject(null).
		// Click bubbles -> renderArea -> selectCharacter(null). Correct.

		// If we clicked a character (click-through or direct): mousedown -> selectCharacter(id).
		// Click bubbles -> renderArea. WE MUST NOT DESELECT.
		// Ensure we detect if target is a character.
		// Direct click: target is inside .charViewport.
		// Click-through: target is #drawCanvas. BUT 'clickThroughHandled' is set!
		// So if clickThroughHandled is checked (which it is above), we are safe for click-through.
		// For direct click, we check .charViewport.

		if (target.closest('.charViewport')) return

		selectCharacter(null)
	})

	// Toolbar events
	const setShapeSelected = active => {
		if (shapeBtn) shapeBtn.classList.toggle('selected', active)
		if (shapeSelect) shapeSelect.classList.toggle('selected', active)
	}

	const updateCanvasInteraction = () => {
		const toolActive = textMode || shapeMode || drawMode === 'pen' || drawMode === 'eraser'
		selectMode = !toolActive
		if (selectBtn) selectBtn.classList.toggle('selected', selectMode)
		const active = toolActive || selectMode
		drawCanvas.style.pointerEvents = active ? 'auto' : 'none'
		if (textMode) {
			if (brushCursor) brushCursor.style.display = 'none'
			drawCanvas.style.cursor = 'text'
		} else if (selectMode) {
			if (brushCursor) brushCursor.style.display = 'none'
			drawCanvas.style.cursor = 'default'
		} else {
			drawCanvas.style.cursor = 'default'
		}
	}

	const updateTextEditorStyle = () => {
		if (!activeTextEditor?.el) return
		const sizeValue = Number(textSize?.value || 36)
		const fontSize = Math.max(8, Math.round(sizeValue))
		activeTextEditor.el.style.fontSize = `${fontSize}px`
		activeTextEditor.el.style.color = currentColor
	}

	const commitTextEdit = () => {
		if (!activeTextEditor?.el || isCommittingText) return
		isCommittingText = true
		const editor = activeTextEditor.el
		const text = (editor.innerText || '').replace(/\r/g, '').trim()
		const { x, y } = activeTextEditor
		activeTextEditor = null
		const sizeValue = Number(textSize?.value || 36)
		const fontSize = Math.max(8, Math.round(sizeValue))

		if (text) {
			const lines = text.split('\n')
			const lineHeight = Math.round(fontSize * 1.2)
			const fontFamily = '"Space Grotesk", "Segoe UI", sans-serif'
			drawCtx.save()
			drawCtx.font = `bold ${fontSize}px ${fontFamily}`
			const maxWidth = Math.max(...lines.map(line => drawCtx.measureText(line).width), 1)
			drawCtx.restore()

			const obj = {
				id: buildObjectId(),
				type: 'text',
				x: x + maxWidth / 2,
				y: y + (lineHeight * lines.length) / 2,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				color: currentColor,
				fontSize,
				fontFamily,
				fontWeight: 700,
				text
			}
			drawObjects.push(obj)
			selectObject(obj.id)
			renderObjects()
			saveSceneObjects()
		}

		editor.remove()
		isCommittingText = false
	}

	const cancelTextEdit = () => {
		if (!activeTextEditor?.el) return
		activeTextEditor.el.remove()
		activeTextEditor = null
	}

	const startTextEdit = e => {
		if (e) {
			e.preventDefault()
			e.stopPropagation()
		}
		if (!renderArea) return
		if (activeTextEditor) commitTextEdit()

		const coords = getCanvasCoordinates(e)
		const rect = renderArea.getBoundingClientRect()
		const left = e.clientX - rect.left
		const top = e.clientY - rect.top

		const editor = document.createElement('div')
		editor.className = 'canvasTextEditor'
		editor.contentEditable = 'true'
		editor.style.left = `${left}px`
		editor.style.top = `${top}px`
		editor.style.fontFamily = '"Space Grotesk", "Segoe UI", sans-serif'
		editor.style.fontWeight = '700'
		editor.style.whiteSpace = 'pre'
		editor.style.minWidth = '40px'
		editor.style.minHeight = '20px'
		editor.spellcheck = false

		renderArea.appendChild(editor)
		activeTextEditor = { el: editor, x: coords.x, y: coords.y }
		updateTextEditorStyle()
		requestAnimationFrame(() => editor.focus())

		editor.addEventListener('mousedown', evt => {
			evt.stopPropagation()
		})

		editor.addEventListener('keydown', evt => {
			if (evt.key === 'Enter' && !evt.shiftKey) {
				evt.preventDefault()
				commitTextEdit()
			} else if (evt.key === 'Escape') {
				evt.preventDefault()
				cancelTextEdit()
			}
		})

		editor.addEventListener('blur', () => {
			commitTextEdit()
		})
	}

	const activateTextMode = () => {
		if (shapeMode) deactivateShapeMode()
		if (selectMode) deactivateSelectMode()
		textMode = true
		drawMode = ''
		drawCtx.globalCompositeOperation = 'source-over'
		drawCtx.fillStyle = currentColor
		if (textBtn) textBtn.classList.add('selected')
		if (penBtn) penBtn.classList.remove('selected')
		if (eraserBtn) eraserBtn.classList.remove('selected')
		if (lineBtn) lineBtn.classList.remove('selected')
		setShapeSelected(false)
		selectCharacter(null)
		selectObject(null)
		updateCanvasInteraction()
		updateBrushCursor()
	}

	const deactivateTextMode = () => {
		textMode = false
		if (textBtn) textBtn.classList.remove('selected')
		commitTextEdit()
		updateCanvasInteraction()
		updateBrushCursor()
	}

	const activateSelectMode = () => {
		if (textMode) deactivateTextMode()
		if (shapeMode) deactivateShapeMode()
		drawMode = ''
		selectMode = true
		if (selectBtn) selectBtn.classList.add('selected')
		if (penBtn) penBtn.classList.remove('selected')
		if (eraserBtn) eraserBtn.classList.remove('selected')
		if (lineBtn) lineBtn.classList.remove('selected')
		setShapeSelected(false)
		selectCharacter(null)
		updateCanvasInteraction()
		updateBrushCursor()
	}

	const deactivateSelectMode = () => {
		selectMode = false
		if (selectBtn) selectBtn.classList.remove('selected')
		updateCanvasInteraction()
		updateBrushCursor()
	}

	const activateShapeMode = () => {
		if (selectMode) deactivateSelectMode()
		shapeMode = true
		drawCanvas.style.pointerEvents = 'auto'
		drawCtx.globalCompositeOperation = 'source-over'
		drawCtx.strokeStyle = currentColor
		drawCtx.fillStyle = currentColor
		setShapeSelected(true)
		if (lineBtn) lineBtn.classList.remove('selected')
		if (penBtn) penBtn.classList.remove('selected')
		if (eraserBtn) eraserBtn.classList.remove('selected')
		drawMode = ''
		selectCharacter(null)
		selectObject(null)
	}

	const deactivateShapeMode = () => {
		shapeMode = false
		drawCanvas.style.pointerEvents = 'none'
		setShapeSelected(false)
		if (lineBtn) lineBtn.classList.remove('selected')
		drawMode = ''
	}

	if (shapeSelect) {
		if (shapeType === 'line') shapeType = 'rect'
		shapeSelect.value = shapeType
		shapeSelect.onchange = e => {
			shapeType = e.target.value
			activateShapeMode()
		}
	}

	if (lineBtn) {
		lineBtn.onclick = () => {
			if (textMode) deactivateTextMode()
			if (selectMode) deactivateSelectMode()
			cancelTextEdit()
			if (shapeMode && shapeType === 'line') {
				deactivateShapeMode()
			} else {
				shapeType = 'line'
				shapeMode = true
				drawCanvas.style.pointerEvents = 'auto'
				drawCtx.globalCompositeOperation = 'source-over'
				drawCtx.strokeStyle = currentColor
				drawCtx.fillStyle = currentColor
				if (lineBtn) lineBtn.classList.add('selected')
				if (penBtn) penBtn.classList.remove('selected')
				if (eraserBtn) eraserBtn.classList.remove('selected')
				setShapeSelected(false)
				drawMode = ''
				selectCharacter(null)
				selectObject(null)
			}
			updateCanvasInteraction()
		}
	}

	if (penBtn) {
		penBtn.onclick = () => {
			if (textMode) deactivateTextMode()
			if (selectMode) deactivateSelectMode()
			cancelTextEdit()
			if (drawMode === 'pen') {
				// If pen is already active, toggle it off
				drawMode = ''
				penBtn.classList.remove('selected')
			} else {
				// Activate pen mode
				// Disable shape mode when switching to pen
				if (shapeMode) deactivateShapeMode()
				drawMode = 'pen'
				drawCtx.globalCompositeOperation = 'source-over'
				penBtn.classList.add('selected')
				if (eraserBtn) eraserBtn.classList.remove('selected')
				// Deselect character to avoid interference
				selectCharacter(null)
				selectObject(null)
			}
			updateCanvasInteraction()
			updateBrushCursor()
		}
	}

	// Initialize pen as active on first load
	if (!penInitialized) {
		// Don't activate pen at startup - let user choose when to draw
		drawMode = ''
		drawCanvas.style.pointerEvents = 'none'
		if (penBtn) penBtn.classList.remove('selected')
		penInitialized = true
	}

	if (!selectMode) {
		selectMode = true
		if (selectBtn) selectBtn.classList.add('selected')
		updateCanvasInteraction()
		updateBrushCursor()
	}

	if (eraserBtn) {
		eraserBtn.onclick = () => {
			if (textMode) deactivateTextMode()
			if (selectMode) deactivateSelectMode()
			cancelTextEdit()
			if (drawMode === 'eraser') {
				drawMode = ''
				eraserBtn.classList.remove('selected')
			} else {
				// Disable shape mode when switching to eraser
				if (shapeMode) deactivateShapeMode()
				drawMode = 'eraser'
				drawCtx.globalCompositeOperation = 'destination-out'
				eraserBtn.classList.add('selected')
				if (penBtn) penBtn.classList.remove('selected')
				selectObject(null)
			}
			updateCanvasInteraction()
			updateBrushCursor()
		}
	}

	if (shapeBtn) {
		shapeBtn.onclick = () => {
			if (textMode) deactivateTextMode()
			if (selectMode) deactivateSelectMode()
			cancelTextEdit()
			if (shapeMode) {
				// If shape mode is active, toggle it off
				deactivateShapeMode()
			} else {
				// Activate shape mode
				activateShapeMode()
				if (shapeSelect) shapeType = shapeSelect.value
				if (shapeSelect) shapeSelect.focus()
			}
			updateCanvasInteraction()
		}
	}

	if (textBtn) {
		textBtn.onclick = () => {
			if (textMode) {
				deactivateTextMode()
			} else {
				if (selectMode) deactivateSelectMode()
				activateTextMode()
			}
		}
	}

	if (selectBtn) {
		selectBtn.onclick = () => {
			if (selectMode) {
				deactivateSelectMode()
			} else {
				activateSelectMode()
			}
		}
	}

	if (colorPicker) {
		const handleColorChange = e => {
			currentColor = e.target.value
			drawCtx.strokeStyle = currentColor
			drawCtx.fillStyle = currentColor
			updateTextEditorStyle()
			const selected = getObjectById(selectedObjectId)
			if (selected) {
				selected.color = currentColor
				renderObjects()
				saveSceneObjects()
			}
		}
		colorPicker.oninput = handleColorChange
		colorPicker.onchange = handleColorChange
	}

	if (brushSize) {
		brushSize.oninput = e => {
			drawCtx.lineWidth = e.target.value
			updateBrushCursor()
		}
	}

	if (textSize) {
		textSize.oninput = () => {
			updateTextEditorStyle()
		}
	}

	if (clearCanvasBtn) {
		clearCanvasBtn.onclick = () => {
			drawObjects = []
			activeDrawObject = null
			selectedObjectId = null
			renderObjects()
			saveSceneObjects()
		}
	}

	const clearLayersBtn = document.getElementById('clearLayersBtn')
	if (clearLayersBtn) {
		clearLayersBtn.onclick = () => {
			characters.forEach(ch => {
				if (ch.wrapper) ch.wrapper.remove()
			})
			characters = []
			selectedCharacterId = null
			drawObjects = []
			activeDrawObject = null
			selectedObjectId = null
			renderObjects()
			renderLayersList()
			updateHeadUsage()
			saveSceneObjects()
		}
	}

	// Helper function to get correct canvas coordinates
	function getCanvasCoordinates(e) {
		const rect = drawCanvas.getBoundingClientRect()
		const scaleX = drawCanvas.width / rect.width
		const scaleY = drawCanvas.height / rect.height
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY
		}
	}

	// Prevent click-through selection from being undone by renderArea click handler
	drawCanvas.addEventListener('click', e => {
		if (clickThroughHandled) {
			e.stopPropagation()
			clickThroughHandled = false
		}
	})

	// Drawing events
	drawCanvas.addEventListener('mousedown', e => {
		if (selectMode) {
			handleSelectionDown(e)
		} else {
			startDrawing(e)
		}
	})
	drawCanvas.addEventListener('mousemove', e => {
		if (selectMode) {
			handleSelectionMove(e)
		} else {
			draw(e)
			updateCursor(e)
		}
	})
	drawCanvas.addEventListener('mouseup', e => {
		if (selectMode) {
			handleSelectionUp(e)
		} else {
			finishDrawing(e)
		}
	})
	drawCanvas.addEventListener('mouseout', () => {
		if (selectMode) {
			handleSelectionUp()
		} else {
			cancelDrawing()
		}
	})
	drawCanvas.addEventListener('contextmenu', e => {
		if (!selectMode) return
		const coords = getCanvasCoordinates(e)
		const hit = hitTestObject(coords.x, coords.y)
		if (!hit) return
		e.preventDefault()
		selectObject(hit.id)
		openObjectContextMenu(e.clientX, e.clientY)
	})
	drawCanvas.addEventListener('mouseleave', () => {
		if (brushCursor) brushCursor.style.display = 'none'
		drawCanvas.style.cursor = 'default'
	})

	function startDrawing(e) {
		if (textMode) {
			startTextEdit(e)
			return
		}

		const coords = getCanvasCoordinates(e)
		if (shapeMode) {
			shapeStart = { x: coords.x, y: coords.y }
			activeDrawObject = {
				id: buildObjectId(),
				type: 'shape',
				shapeType,
				x: coords.x,
				y: coords.y,
				width: 1,
				height: 1,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				color: currentColor,
				lineWidth: Number(brushSize?.value || 2)
			}
			isDrawing = true
			renderObjects()
		} else if (drawMode === 'pen' || drawMode === 'eraser') {
			activeDrawObject = {
				id: buildObjectId(),
				type: drawMode === 'eraser' ? 'eraser' : 'stroke',
				x: 0,
				y: 0,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				color: currentColor,
				lineWidth: Number(brushSize?.value || 2),
				points: [{ x: coords.x, y: coords.y }],
				preview: true
			}
			isDrawing = true
			renderObjects()
		}
	}

	function draw(e) {
		if (!isDrawing || !activeDrawObject) return
		const coords = getCanvasCoordinates(e)

		if (shapeMode && shapeStart) {
			const dx = coords.x - shapeStart.x
			const dy = coords.y - shapeStart.y

			if (shapeType === 'line') {
				const length = Math.hypot(dx, dy)
				const angle = Math.atan2(dy, dx)
				activeDrawObject.x = shapeStart.x + dx / 2
				activeDrawObject.y = shapeStart.y + dy / 2
				activeDrawObject.width = Math.max(1, length)
				activeDrawObject.height = Math.max(1, Number(brushSize?.value || 2))
				activeDrawObject.rotation = angle
			} else if (shapeType === 'circle') {
				const radius = Math.hypot(dx, dy) / 2
				activeDrawObject.x = shapeStart.x + dx / 2
				activeDrawObject.y = shapeStart.y + dy / 2
				activeDrawObject.width = Math.max(1, radius * 2)
				activeDrawObject.height = Math.max(1, radius * 2)
				activeDrawObject.rotation = 0
			} else {
				activeDrawObject.x = shapeStart.x + dx / 2
				activeDrawObject.y = shapeStart.y + dy / 2
				activeDrawObject.width = Math.max(1, Math.abs(dx))
				activeDrawObject.height = Math.max(1, Math.abs(dy))
				activeDrawObject.rotation = 0
			}
			renderObjects()
		} else if (drawMode === 'pen' || drawMode === 'eraser') {
			activeDrawObject.points.push({ x: coords.x, y: coords.y })
			renderObjects()
		}
	}

	function updateBrushCursor() {
		if (textMode) {
			if (brushCursor) brushCursor.style.display = 'none'
			drawCanvas.style.cursor = 'text'
			return
		}
		if (selectMode) {
			if (brushCursor) brushCursor.style.display = 'none'
			drawCanvas.style.cursor = 'default'
			return
		}
		if (drawMode === 'pen' || drawMode === 'eraser' || (shapeMode && shapeType === 'line')) {
			const baseSize = drawCtx.lineWidth
			const rect = drawCanvas.getBoundingClientRect()
			const scaleX = rect.width / drawCanvas.width
			const scaleY = rect.height / drawCanvas.height
			const borderSize = 4
			const size = Math.max(2, baseSize * ((scaleX + scaleY) / 2) + borderSize * 2)

			brushCursor.style.width = `${size}px`
			brushCursor.style.height = `${size}px`
			brushCursor.style.display = 'block'
			drawCanvas.style.cursor = 'none'

			if (lastCursor) {
				brushCursor.style.left = `${lastCursor.x}px`
				brushCursor.style.top = `${lastCursor.y}px`
			}
		} else {
			brushCursor.style.display = 'none'
			drawCanvas.style.cursor = 'default'
		}
	}

	function updateCursor(e) {
		updateBrushCursor()
		if (brushCursor.style.display === 'block' && e) {
			const rect = drawCanvas.getBoundingClientRect()
			const x = e.clientX - rect.left
			const y = e.clientY - rect.top
			lastCursor = { x, y }
			brushCursor.style.left = `${x}px`
			brushCursor.style.top = `${y}px`
		}
	}

	function handleSelectionDown(e) {
		clickThroughHandled = false
		const coords = getCanvasCoordinates(e)
		const selected = getObjectById(selectedObjectId)
		const handle = selected ? hitTestHandle(coords.x, coords.y, selected) : null

		if (handle) {
			isTransforming = true
			transformData = {
				mode: 'resize',
				handle: handle.type,
				startX: coords.x,
				startY: coords.y,
				startScaleX: selected.scaleX || 1,
				startScaleY: selected.scaleY || 1,
				bounds: getObjectBoundsLocal(selected)
			}
			return
		}

		const hit = hitTestObject(coords.x, coords.y)
		if (hit) {
			selectObject(hit.id)
			selectCharacter(null)
			isTransforming = true
			transformData = {
				mode: 'move',
				startX: coords.x,
				startY: coords.y,
				startObjX: hit.x,
				startObjY: hit.y
			}
			return
		}

		selectObject(null)
		isTransforming = false
		transformData = null

		// Click-through: check if a character viewport is under the click
		const elems = document.elementsFromPoint(e.clientX, e.clientY)
		for (const el of elems) {
			const viewport = el.closest ? el.closest('.charViewport') : null
			if (viewport && viewport.dataset.id) {
				const charId = viewport.dataset.id
				if (characters.some(c => c.id === charId)) {
					selectCharacter(charId)
					clickThroughHandled = true
					return
				}
			}
		}
	}

	function handleSelectionMove(e) {
		if (!isTransforming || !transformData) return
		const obj = getObjectById(selectedObjectId)
		if (!obj) return
		const coords = getCanvasCoordinates(e)

		if (transformData.mode === 'move') {
			obj.x = transformData.startObjX + (coords.x - transformData.startX)
			obj.y = transformData.startObjY + (coords.y - transformData.startY)
		} else if (transformData.mode === 'resize') {
			const local = screenToLocal(coords.x, coords.y, {
				x: obj.x,
				y: obj.y,
				rotation: obj.rotation,
				scaleX: transformData.startScaleX,
				scaleY: transformData.startScaleY
			})
			const width = transformData.bounds.maxX - transformData.bounds.minX || 1
			const height = transformData.bounds.maxY - transformData.bounds.minY || 1

			if (transformData.handle === 'resize') {
				const nextScaleX = Math.max(MIN_SCALE, (Math.abs(local.x) * 2) / width)
				const nextScaleY = Math.max(MIN_SCALE, (Math.abs(local.y) * 2) / height)
				const nextScale = Math.max(nextScaleX, nextScaleY)
				obj.scaleX = nextScale
				obj.scaleY = nextScale
			}

			if (transformData.handle === 'e' || transformData.handle === 'w') {
				const nextScaleX = Math.max(MIN_SCALE, (Math.abs(local.x) * 2) / width)
				obj.scaleX = nextScaleX
			}

			if (transformData.handle === 'n' || transformData.handle === 's') {
				const nextScaleY = Math.max(MIN_SCALE, (Math.abs(local.y) * 2) / height)
				obj.scaleY = nextScaleY
			}
		}

		renderObjects()
	}

	function handleSelectionUp() {
		if (!isTransforming) return
		isTransforming = false
		transformData = null
		renderObjects()
		saveSceneObjects()
	}

	document.addEventListener('keydown', e => {
		const target = e.target
		if (!selectMode) return
		if (activeTextEditor) return
		if (
			target &&
			(target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable)
		) {
			return
		}
		if (e.key === 'Delete' || e.key === 'Backspace') {
			const selected = getObjectById(selectedObjectId)
			if (!selected) return
			drawObjects = drawObjects.filter(obj => obj.id !== selected.id)
			selectedObjectId = null
			renderObjects()
			saveSceneObjects()
		}
	})

	function finishDrawing() {
		if (!activeDrawObject) {
			isDrawing = false
			return
		}

		if (activeDrawObject.type === 'stroke' || activeDrawObject.type === 'eraser') {
			const pts = activeDrawObject.points || []
			if (pts.length > 1) {
				if (activeDrawObject.type === 'eraser') {
					applyEraserToStrokes(activeDrawObject)
					if (eraserBtn) eraserBtn.classList.add('selected')
					drawMode = 'eraser'
					updateCanvasInteraction()
					updateBrushCursor()
				} else {
					const xs = pts.map(p => p.x)
					const ys = pts.map(p => p.y)
					const minX = Math.min(...xs)
					const maxX = Math.max(...xs)
					const minY = Math.min(...ys)
					const maxY = Math.max(...ys)
					const centerX = (minX + maxX) / 2
					const centerY = (minY + maxY) / 2
					activeDrawObject.points = pts.map(p => ({ x: p.x - centerX, y: p.y - centerY }))
					activeDrawObject.x = centerX
					activeDrawObject.y = centerY
					delete activeDrawObject.preview
					ensureLayerOrder(activeDrawObject)
					drawObjects.push(activeDrawObject)
					selectObject(activeDrawObject.id)
				}
				saveSceneObjects()
			}
		} else if (activeDrawObject.type === 'shape') {
			if (activeDrawObject.width > 1 || activeDrawObject.height > 1) {
				ensureLayerOrder(activeDrawObject)
				drawObjects.push(activeDrawObject)
				selectObject(activeDrawObject.id)
				saveSceneObjects()
			}
		}

		activeDrawObject = null
		shapeStart = null
		isDrawing = false
		renderObjects()
	}

	function cancelDrawing() {
		activeDrawObject = null
		shapeStart = null
		isDrawing = false
		renderObjects()
	}

	// --- RESET ---
	document.querySelectorAll('.reset').forEach(btn => {
		btn.onclick = () => {
			const part = btn.dataset.part
			const sel = getSelectedCharacter()
			if (!sel) return

			if (part === 'position') {
				sel._posX = 0
				sel._posY = 0
				const scale = sel.scale || 1
				sel.wrapper.style.transform = `translate(0px, 0px) scale(${scale})`
				updatePositionInputs(sel)
				return
			}

			if (!sel.viewer) return
			const s = sel.viewer.playerObject.skin

			if (part === 'headX') {
				sliders.headX.value = 0
				s.head.rotation.x = 0
			}
			if (part === 'headY') {
				sliders.headY.value = 0
				s.head.rotation.y = 0
			}
			if (part === 'rightArm') {
				sliders.rightArmX.value = 0
				sliders.rightArmZ.value = 0
				s.rightArm.rotation.set(0, 0, 0)
			}
			if (part === 'leftArm') {
				sliders.leftArmX.value = 0
				sliders.leftArmZ.value = 0
				s.leftArm.rotation.set(0, 0, 0)
			}
			if (part === 'legs') {
				sliders.rightLegX.value = 0
				sliders.leftLegX.value = 0
				s.rightLeg.rotation.set(0, 0, 0)
				s.leftLeg.rotation.set(0, 0, 0)
			}
		}
	})

	const resetAllBtn = document.getElementById('resetAll')
	if (resetAllBtn) {
		resetAllBtn.onclick = () => {
			Object.values(sliders).forEach(s => {
				if (!s) return
				s.value = 0
				s.dispatchEvent(new Event('input')) // Trigger input event to save values
			})
			const sel = getSelectedCharacter()
			if (sel && sel.viewer && sel.viewer.playerObject) {
				const s = sel.viewer.playerObject.skin
				s.head.rotation.set(0, 0, 0)
				s.rightArm.rotation.set(0, 0, 0)
				s.leftArm.rotation.set(0, 0, 0)
				s.rightLeg.rotation.set(0, 0, 0)
				s.leftLeg.rotation.set(0, 0, 0)
			}
			// Also reset position
			if (sel) {
				sel._posX = 0
				sel._posY = 0
				const scale = sel.scale || 1
				sel.wrapper.style.transform = `translate(0px, 0px) scale(${scale})`
				updatePositionInputs(sel)
			}
		}
	}

	// --- POSES ---
	if (savePoseBtn) {
		savePoseBtn.onclick = async () => {
			const POSE_NAME_MAX = 24
			const name = await openModal({
				message: t('namePose'),
				inputPlaceholder: t('posePlaceholder'),
				showInput: true,
				maxLength: POSE_NAME_MAX
			})
			const cleanName = (name || '').trim()
			if (!cleanName) return
			if (cleanName.length > POSE_NAME_MAX) {
				await openModal({
					message: `Pose name too long (max ${POSE_NAME_MAX} characters).`,
					showInput: false,
					showCancel: false
				})
				return
			}
			if (poseDB[cleanName]) {
				await openModal({
					message: t('poseExists'),
					showInput: false,
					showCancel: false
				})
				return
			}

			const sel = getSelectedCharacter()
			poseDB[cleanName] = {
				skin: sel?.skin || STEVE_SKIN,
				data: Object.fromEntries(Object.entries(sliders).map(([k, v]) => [k, v.value]))
			}
			localStorage.setItem('poses', JSON.stringify(poseDB))
			await openModal({
				message: t('poseSaved'),
				showInput: false,
				showCancel: false
			})
		}
	}

	if (loadPoseBtn) {
		loadPoseBtn.onclick = () => {
			if (!poseDB || Object.keys(poseDB).length === 0) {
				openModal({
					message: t('noPoses'),
					showInput: false,
					showCancel: false
				})
				return
			}
			renderGallery()
			poseGalleryModal.style.display = 'flex'
		}
	}

	function applyPose(pose) {
		// Apply slider values only, don't change the skin
		Object.entries(pose.data).forEach(([k, v]) => {
			if (sliders[k]) {
				sliders[k].value = v
				sliders[k].dispatchEvent(new Event('input'))
			}
		})
	}

	// --- GALLERY ---
	if (poseGalleryModal) {
		poseGalleryModal.onclick = e => {
			if (e.target === poseGalleryModal) poseGalleryModal.style.display = 'none'
		}
	}

	function renderGallery() {
		if (!poseGalleryContent) return
		poseGalleryContent.innerHTML = ''
		for (const [name, pose] of Object.entries(poseDB)) {
			// Skip invalid poses
			if (!pose || typeof pose !== 'object') {
				delete poseDB[name]
				continue
			}

			const card = document.createElement('div')
			card.className = 'poseCard'

			const miniCanvas = document.createElement('canvas')
			miniCanvas.width = 80
			miniCanvas.height = 100
			// Ensure skin has a valid value
			const skinUrl = pose.skin && typeof pose.skin === 'string' ? pose.skin : STEVE_SKIN
			const miniViewer = new SkinViewer({
				canvas: miniCanvas,
				width: 80,
				height: 100,
				skin: skinUrl
			})
			const map = {
				headX: ['head', 'x'],
				headY: ['head', 'y'],
				rightArmX: ['rightArm', 'x'],
				rightArmZ: ['rightArm', 'z'],
				leftArmX: ['leftArm', 'x'],
				leftArmZ: ['leftArm', 'z'],
				rightLegX: ['rightLeg', 'x'],
				leftLegX: ['leftLeg', 'x']
			}
			if (pose.data && typeof pose.data === 'object') {
				Object.entries(pose.data).forEach(([k, v]) => {
					const [part, axis] = map[k]
					if (part && axis && miniViewer.playerObject.skin[part]) {
						miniViewer.playerObject.skin[part].rotation[axis] = deg(v)
					}
				})
			}

			const strong = document.createElement('strong')
			strong.textContent = name

			const applyBtn = document.createElement('button')
			applyBtn.className = 'btnSecondary'
			applyBtn.textContent = t('apply')
			applyBtn.onclick = () => applyPose(pose)

			const delBtn = document.createElement('button')
			delBtn.className = 'btnGhost'
			delBtn.textContent = t('delete')
			delBtn.onclick = () => {
				delete poseDB[name]
				localStorage.setItem('poses', JSON.stringify(poseDB))
				if (Object.keys(poseDB).length === 0) {
					poseGalleryModal.style.display = 'none'
					return
				}
				renderGallery()
			}

			card.append(miniCanvas, strong, applyBtn, delBtn)
			poseGalleryContent.appendChild(card)
		}
		// Clean up localStorage if any poses were removed
		localStorage.setItem('poses', JSON.stringify(poseDB))
	}

	// --- EXPORT ---
	if (exportBtn) {
		exportBtn.onclick = async () => {
			const target = document.getElementById('renderArea')
			if (!target) return

			commitTextEdit()

			const prevSelectedId = selectedCharacterId

			// Save current styles
			const saved = characters.map(c => ({
				id: c.id,
				border: c.wrapper.style.border,
				bg: c.wrapper.style.background,
				overflow: c.wrapper.style.overflow,
				display: c.wrapper.querySelector('.deleteViewportBtn')?.style.display
			}))

			// Save renderArea border style
			const renderAreaBorder = target.style.border
			const renderAreaBg = target.style.background

			// Hide all UI elements
			target.style.border = 'none'
			if (transparentMode) target.style.background = 'transparent'

			isExporting = true
			renderObjects()

			// Hide delete buttons on viewports
			characters.forEach(c => {
				const deleteBtn = c.wrapper.querySelector('.deleteViewportBtn')
				const resizeBtn = c.wrapper.querySelector('.resizeViewportBtn')
				const moveBtn = c.wrapper.querySelector('.moveViewportBtn')
				if (deleteBtn) deleteBtn.style.display = 'none'
				if (resizeBtn) resizeBtn.style.display = 'none'
				if (moveBtn) moveBtn.style.display = 'none'
			})

			if (exportBtn) exportBtn.style.display = 'none'

			// Hide containers and show all characters, allow overflow for zoom
			characters.forEach(c => {
				if (c.wrapper) {
					c.wrapper.style.border = 'none'
					c.wrapper.style.background = 'transparent'
					c.wrapper.style.overflow = 'visible'
					c.wrapper.classList.remove('active', 'movable')
				}
			})

			// Render all character viewers
			characters.forEach(c => {
				if (c.viewer) c.viewer.render()
			})

			const canvas = await html2canvas(target, {
				backgroundColor: null,
				useCORS: true,
				scale: 2
			})

			// Restore original styles
			target.style.border = renderAreaBorder
			target.style.background = renderAreaBg

			characters.forEach(c => {
				const s = saved.find(x => x.id === c.id)
				const deleteBtn = c.wrapper.querySelector('.deleteViewportBtn')
				const resizeBtn = c.wrapper.querySelector('.resizeViewportBtn')
				const moveBtn = c.wrapper.querySelector('.moveViewportBtn')
				if (c.wrapper && s) {
					c.wrapper.style.border = s.border
					c.wrapper.style.background = s.bg
					c.wrapper.style.overflow = s.overflow
				}
				const shouldShow = prevSelectedId && c.id === prevSelectedId
				if (deleteBtn && s)
					deleteBtn.style.display = shouldShow ? s.display || 'block' : 'none'
				if (resizeBtn) resizeBtn.style.display = shouldShow ? 'block' : 'none'
				if (moveBtn) moveBtn.style.display = shouldShow ? 'block' : 'none'
			})

			if (exportBtn) exportBtn.style.display = 'block'

			isExporting = false
			renderObjects()

			// Restore character active/movable states and selection UI
			if (prevSelectedId && characters.some(c => c.id === prevSelectedId)) {
				selectCharacter(prevSelectedId)
			} else {
				selectCharacter(null)
			}

			const link = document.createElement('a')
			link.download = 'minecraft_pose.png'
			link.href = canvas.toDataURL('image/png')
			link.click()
		}
	}

	// --- BACKGROUND SYSTEM ---
	if (uploadBgBtn && bgUpload) uploadBgBtn.onclick = () => bgUpload.click()

	const bgLayer = document.getElementById('backgroundLayer')
	if (bgTransparent) {
		transparentMode = true
		bgTransparent.classList.add('active')
	}

	const updateBackground = () => {
		if (!bgLayer) return
		if (transparentMode) {
			bgLayer.style.backgroundColor = 'transparent'
		} else {
			bgLayer.style.backgroundColor = bgColor
		}

		if (bgImage) {
			bgLayer.style.backgroundImage = `url("${bgImage}")`
			bgLayer.style.backgroundSize = 'contain'
			bgLayer.style.backgroundRepeat = 'no-repeat'
			bgLayer.style.backgroundPosition = 'center'
		} else {
			bgLayer.style.backgroundImage = ''
		}
	}

	updateBackground()

	if (bgColorPicker) {
		bgColorPicker.addEventListener('input', () => {
			bgColor = bgColorPicker.value
			if (!transparentMode) updateBackground()
		})
	}

	// Transparent toggle
	if (bgTransparent) {
		bgTransparent.addEventListener('click', () => {
			transparentMode = !transparentMode
			bgTransparent.classList.toggle('active', transparentMode)
			updateBackground()
		})
	}

	// Image
	if (bgUpload) {
		bgUpload.addEventListener('change', e => {
			const file = e.target.files[0]
			if (!file) return

			bgImage = URL.createObjectURL(file)
			updateBackground()
		})
	}

	// Bouton pour enlever l'image
	if (removeBgBtn) {
		removeBgBtn.onclick = () => {
			bgImage = null
			updateBackground()
		}
	}

	// --- MOVE SYSTEM ---
	let dragging = false
	let dragChar = null
	let startX = 0
	let startY = 0

	let moveHoldChar = null

	function setMoveMode(sel, enabled) {
		const target = sel || getSelectedCharacter()
		if (!target) {
			alert(t('selectCharacterFirst'))
			return
		}
		target.moveEnabled = enabled

		characters.forEach(ch => {
			const isSelected = ch.id === target.id
			if (ch.wrapper) {
				ch.wrapper.classList.toggle('movable', isSelected && target.moveEnabled)
				if (isSelected) ch.wrapper.style.cursor = target.moveEnabled ? 'grab' : 'default'
			}
			if (ch.viewer && ch.viewer.controls)
				ch.viewer.controls.enableRotate = isSelected && !target.moveEnabled
			if (ch.canvas)
				ch.canvas.style.pointerEvents = isSelected && !target.moveEnabled ? 'auto' : 'none'
			if (ch.moveButton)
				ch.moveButton.classList.toggle('active', isSelected && target.moveEnabled)
		})
	}

	function startDrag(char, e) {
		if (!char || selectedCharacterId !== char.id) return
		dragging = true
		dragChar = char
		startX = e.clientX - char._posX
		startY = e.clientY - char._posY
		char.wrapper.setPointerCapture(e.pointerId)
		char.wrapper.classList.add('dragging')
		char.wrapper.style.cursor = 'grabbing'
	}

	// Global resize listeners
	document.addEventListener('pointermove', () => {
		// Handle resize for any character in resizing state
		characters.forEach(c => {
			if (c.wrapper && c.wrapper.classList.contains('resizing')) {
				const rect = c.resizeButton?.getBoundingClientRect?.()
				const parentRect = c.wrapper.parentElement?.getBoundingClientRect?.()
				void rect
				void parentRect
			}
		})
	})

	document.addEventListener('pointerup', () => {
		// Reset resizing flag for all characters
		characters.forEach(c => {
			if (c.wrapper && c.wrapper.classList.contains('resizing')) {
				c.resizing = false
				c.wrapper.classList.remove('resizing')
			}
		})
	})

	// Global resize listeners
	document.addEventListener('pointermove', e => {
		if (!resizingChar || !resizeData) return

		const deltaX = e.clientX - resizeData.startX
		const deltaY = e.clientY - resizeData.startY
		// Use the larger delta to maintain proportional growth
		// Invert so that moving towards top-left (negative delta) makes it bigger
		const delta = -(Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY)

		// Calculate new height and width maintaining aspect ratio
		const newHeight = Math.max(150, resizeData.startHeight + delta)
		const newWidth = newHeight * resizeData.aspectRatio

		// The bottom-right corner should stay fixed
		// Bottom-right = startLeft + startWidth, startTop + startHeight
		const bottomRightX = resizeData.startLeft + resizeData.startWidth
		const bottomRightY = resizeData.startTop + resizeData.startHeight

		// New top-left so bottom-right stays fixed
		const newTop = bottomRightY - newHeight
		const newLeft = bottomRightX - newWidth

		resizingChar.wrapper.style.width = newWidth + 'px'
		resizingChar.wrapper.style.height = newHeight + 'px'
		resizingChar.wrapper.style.top = newTop + 'px'
		resizingChar.wrapper.style.left = newLeft + 'px'

		// Find the character and update its viewer
		const char = characters.find(c => c.id === resizingChar.id)
		if (char && char.viewer) {
			// Use setSize if available, otherwise update canvas dimensions
			if (char.viewer.setSize) {
				char.viewer.setSize(Math.round(newWidth), Math.round(newHeight))
			} else {
				resizingChar.cvs.width = Math.round(newWidth)
				resizingChar.cvs.height = Math.round(newHeight)
				char.viewer.camera.aspect = newWidth / newHeight
				char.viewer.camera.updateProjectionMatrix()
			}
			char.viewer.render()
			// Call render again to ensure proper display
			requestAnimationFrame(() => char.viewer.render())
		}
	})

	document.addEventListener('pointerup', () => {
		if (!resizingChar || !resizeData) return

		resizingChar.wrapper.classList.remove('resizing', 'movable')
		resizingChar = null
		resizeData = null
	})

	// Mouse move
	window.addEventListener('pointermove', e => {
		if (!dragging || !dragChar) return

		dragChar._posX = e.clientX - startX
		dragChar._posY = e.clientY - startY

		const scale = dragChar.scale || 1
		dragChar.wrapper.style.transform = `translate(${dragChar._posX}px, ${dragChar._posY}px) scale(${scale})`
		updatePositionInputs(dragChar)
	})

	// Mouse up - always stop dragging
	window.addEventListener('pointerup', () => {
		if (!dragging) return

		dragging = false

		if (dragChar && dragChar.wrapper) {
			dragChar.wrapper.classList.remove('dragging')
			dragChar.wrapper.style.cursor = dragChar.moveEnabled ? 'grab' : 'default'
		}

		if (moveHoldChar) {
			setMoveMode(moveHoldChar, false)
			moveHoldChar = null
		}

		dragChar = null
	})

	return () => {
		window.__mcsceneInitialized = false
	}
}
