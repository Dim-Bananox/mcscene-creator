export function createUiTextManager(deps) {
	const {
		languageSelect,
		themeToggle,
		getRenderLayersList,
		getRefreshObjectMenuLabels,
		getRenderGallery
	} = deps

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
			layersCharacters: 'Characters',
			layersObjects: 'Objects',
			layerForeground: 'Foreground',
			layerBackground: 'Background',
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
			layersCharacters: 'Personnages',
			layersObjects: 'Objets',
			layerForeground: 'Avant-plan',
			layerBackground: 'Arriere-plan',
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
			layersCharacters: 'Personajes',
			layersObjects: 'Objetos',
			layerForeground: 'Primer plano',
			layerBackground: 'Fondo',
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
			layersCharacters: 'Charaktere',
			layersObjects: 'Objekte',
			layerForeground: 'Vordergrund',
			layerBackground: 'Hintergrund',
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
			layersCharacters: 'Personaggi',
			layersObjects: 'Oggetti',
			layerForeground: 'Primo piano',
			layerBackground: 'Sfondo',
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

	const t = key => {
		const value = translations[currentLanguage]?.[key] || translations.en[key]
		if (value) return value
		if (key === 'layersCharacters') return 'Characters'
		if (key === 'layersObjects') return 'Objects'
		return (
			String(key || '')
				.replace(/^layers?\s*/i, '')
				.trim() || key
		)
	}

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

		const refreshObjectMenuLabels = getRefreshObjectMenuLabels?.()
		if (typeof refreshObjectMenuLabels === 'function') refreshObjectMenuLabels()

		document.querySelectorAll('.resizeViewportBtn').forEach(btn => {
			btn.title = t('resize')
			btn.setAttribute('aria-label', t('resize'))
		})
		document.querySelectorAll('.moveViewportBtn').forEach(btn => {
			btn.title = t('move')
			btn.setAttribute('aria-label', t('move'))
		})

		updateThemeLabel()

		const renderLayersList = getRenderLayersList?.()
		if (typeof renderLayersList === 'function') renderLayersList()

		const renderGallery = getRenderGallery?.()
		if (typeof renderGallery === 'function') renderGallery()
	}

	const setTheme = theme => {
		document.body.classList.toggle('light', theme === 'light')
		updateThemeLabel()
		localStorage.setItem('theme', theme)
	}

	const appModal = document.getElementById('appModal')
	const modalTitle = document.getElementById('modalTitle')
	const modalMessage = document.getElementById('modalMessage')
	const modalLabel = document.getElementById('modalLabel')
	const modalInput = document.getElementById('modalInput')
	const modalConfirm = document.getElementById('modalConfirm')
	const modalCancel = document.getElementById('modalCancel')
	let modalResolve = null

	const closeModal = value => {
		if (!appModal) return
		appModal.classList.remove('open')
		appModal.setAttribute('aria-hidden', 'true')
		if (modalResolve) modalResolve(value)
		modalResolve = null
	}

	const openModal = ({
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
	}) => {
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

	const init = () => {
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
	}

	return {
		t,
		applyLanguage,
		setTheme,
		getCurrentLanguage: () => currentLanguage,
		openModal,
		init
	}
}
