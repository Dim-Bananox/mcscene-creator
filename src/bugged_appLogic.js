import { SkinViewer } from 'skinview3d'
import { createLayerManager } from './layerManager'
import { createCanvasRenderer } from './canvasRenderer'
import { createPoseManager } from './poseManager'
import { createBackgroundManager } from './backgroundManager'
import { createExportManager } from './exportManager'
import { createUiTextManager } from './uiTextManager'
import { createCharacterManager } from './characterManager'

export function initApp() {
	console.log('--- MC Scene Creator: 3-Plane System Loaded (Forced Write) ---')
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
	let backgroundManager
	// let layerOrder = []; // REMOVED: Replaced by 3-Plane System

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
	let canvasDragBoost = false

	// 3-plane system
	let bgCanvas = null
	let fgCanvas = null
	let splitFrontPass = null // Removed
	let splitBackPass = null // Removed

	// Shape state
	let shapeMode = false
	let shapeType = 'line' // 'line', 'rect', 'circle'
	let shapeStart = null

	let sceneClipboard = null
	let lastContextMenuPosition = null
	let layerOrderCounter = 1
	let clickThroughHandled = false
	let objectsGroupLayer = 'front' // "front" or "back" - controls if Object Group is above Character Group

	let ensureLayerOrder
	let applyLayerZIndexes
	let renderLayersList = () => {}
	let renderObjects
	let selectObject
	let saveSceneObjects
	let loadSceneObjects
	let updateCanvasInteraction
	let updateTextEditorStyle
	let commitTextEdit
	let buildObjectId
	let getObjectBoundsLocal
	let getSelectedCharacter
	let getUniqueCharacterName
	let createCharacter
	let selectCharacter
	let updatePositionInputs
	let applyPositionFromInputs
	let initCharacterUI

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
		// Infer group state
		const backCount = drawObjects.filter(o => o.layer === 'back').length
		objectsGroupLayer = backCount > drawObjects.length / 2 ? 'back' : 'front'

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
		// Infer group state
		const backCount = drawObjects.filter(o => o.layer === 'back').length
		objectsGroupLayer = backCount > drawObjects.length / 2 ? 'back' : 'front'

		selectedObjectId = null
		renderObjects()
		renderLayersList()
		localStorage.setItem('sceneObjects', JSON.stringify(drawObjects))
		undoHistory.capturing = true
	}

	// Initialize pen as active
	let penInitialized = false

	// --- UTILS ---
	const deg = v => (v * Math.PI) / 180

	let refreshObjectMenuLabels = () => {}
	let renderGallery = () => {}

	const uiTextManager = createUiTextManager({
		languageSelect,
		themeToggle,
		getRenderLayersList: () => renderLayersList,
		getRefreshObjectMenuLabels: () => refreshObjectMenuLabels,
		getRenderGallery: () => renderGallery
	})

	const { t, applyLanguage, openModal } = uiTextManager
	uiTextManager.init()

	const layerActions = {
		selectObject: () => {},
		selectCharacter: () => {},
		renderObjects: () => {},
		saveSceneObjects: () => {},
		openObjectContextMenu: () => {},
		openCharacterContextMenu: () => {}
	}

	const layerManager = createLayerManager({
		drawCanvas,
		renderArea,
		t,
		actions: layerActions,
		getCharacters: () => characters,
		getDrawObjects: () => drawObjects,
		setDrawObjects: next => {
			drawObjects = next
		},
		getSelectedObjectId: () => selectedObjectId,
		getSelectedCharacterId: () => selectedCharacterId,
		getObjectsGroupLayer: () => objectsGroupLayer,
		setObjectsGroupLayer: next => {
			objectsGroupLayer = next
		},
		getLayerOrderCounter: () => layerOrderCounter,
		setLayerOrderCounter: next => {
			layerOrderCounter = next
		},
		getBgCanvas: () => bgCanvas,
		setBgCanvas: next => {
			bgCanvas = next
		},
		getFgCanvas: () => fgCanvas,
		setFgCanvas: next => {
			fgCanvas = next
		}
	})

	;({ ensureLayerOrder, applyLayerZIndexes, renderLayersList } = layerManager)

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
	function syncLayerOrder() {
		// Deprecated in 3-Plane System
	}

	// Layer manager functions are defined in layerManager.js

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
      <button type="button" data-action="moveToFront">To Foreground</button>
      <button type="button" data-action="moveToBack">To Background</button>
      <button type="button" data-action="bringForward">Shift Up</button>
      <button type="button" data-action="sendBackward">Shift Down</button>
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

		// Todo: add translations for new buttons

		if (copyBtn) copyBtn.textContent = t('copy')
		if (pasteBtn) pasteBtn.textContent = t('paste')
		// Reuse existing keys or add new ones
		if (bringBtn) bringBtn.textContent = '▲' // t("objectBringForward");
		if (sendBtn) sendBtn.textContent = '▼' // t("objectSendBackward");
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
		const idx = drawObjects.findIndex(o => o.id === id)
		if (idx < 0 || idx >= drawObjects.length - 1) return // Swap
		;[drawObjects[idx], drawObjects[idx + 1]] = [drawObjects[idx + 1], drawObjects[idx]]
		renderObjects()
		renderLayersList()
		saveSceneObjects()
	}

	const sendObjectBackward = id => {
		const idx = drawObjects.findIndex(o => o.id === id)
		if (idx <= 0) return // Swap
		;[drawObjects[idx], drawObjects[idx - 1]] = [drawObjects[idx - 1], drawObjects[idx]]
		renderObjects()
		renderLayersList()
		saveSceneObjects()
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

		// New Actions
		if (action === 'moveToFront') {
			selected.layer = 'front'
		}
		if (action === 'moveToBack') {
			selected.layer = 'back'
		}

		// Standard reorder (just affects array order, which determines render order WITHIN the bucket)
		if (action === 'bringForward') {
			const idx = drawObjects.indexOf(selected)
			if (idx < drawObjects.length - 1) {
				;[drawObjects[idx], drawObjects[idx + 1]] = [drawObjects[idx + 1], drawObjects[idx]]
			}
		}
		if (action === 'sendBackward') {
			const idx = drawObjects.indexOf(selected)
			if (idx > 0) {
				;[drawObjects[idx], drawObjects[idx - 1]] = [drawObjects[idx - 1], drawObjects[idx]]
			}
		}
		// Old logic:
		//if (action === "bringForward") bringObjectForward(selected.id);
		//if (action === "sendBackward") sendObjectBackward(selected.id);

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

	const characterManager = createCharacterManager({
		renderArea,
		sliders,
		t,
		openModal,
		setSkin,
		renderLayersList,
		renderObjects,
		updateHeadUsage,
		startDrag,
		setMoveMode,
		openCharacterContextMenu,
		loadSteveBtn,
		loadAlexBtn,
		state: {
			getCharacters: () => characters,
			setCharacters: next => {
				characters = next
			},
			getSelectedCharacterId: () => selectedCharacterId,
			setSelectedCharacterId: value => {
				selectedCharacterId = value
			},
			getSelectedObjectId: () => selectedObjectId,
			setSelectedObjectId: value => {
				selectedObjectId = value
			}
		},
		setResizingChar: value => {
			resizingChar = value
		},
		setResizeData: value => {
			resizeData = value
		},
		setMoveHoldChar: value => {
			moveHoldChar = value
		},
		defaultSkin: STEVE_SKIN
	})

	;({
		getSelectedCharacter,
		getUniqueCharacterName,
		createCharacter,
		selectCharacter,
		updatePositionInputs,
		applyPositionFromInputs,
		initCharacterUI
	} = characterManager)

	// --- DRAWING SETUP ---
	const canvasState = {
		get characters() {
			return characters
		},
		get drawObjects() {
			return drawObjects
		},
		set drawObjects(value) {
			drawObjects = value
		},
		get selectedObjectId() {
			return selectedObjectId
		},
		set selectedObjectId(value) {
			selectedObjectId = value
		},
		get selectedCharacterId() {
			return selectedCharacterId
		},
		set selectedCharacterId(value) {
			selectedCharacterId = value
		},
		get objectsGroupLayer() {
			return objectsGroupLayer
		},
		set objectsGroupLayer(value) {
			objectsGroupLayer = value
		},
		get layerOrderCounter() {
			return layerOrderCounter
		},
		set layerOrderCounter(value) {
			layerOrderCounter = value
		},
		get currentColor() {
			return currentColor
		},
		set currentColor(value) {
			currentColor = value
		},
		get drawMode() {
			return drawMode
		},
		set drawMode(value) {
			drawMode = value
		},
		get textMode() {
			return textMode
		},
		set textMode(value) {
			textMode = value
		},
		get shapeMode() {
			return shapeMode
		},
		set shapeMode(value) {
			shapeMode = value
		},
		get shapeType() {
			return shapeType
		},
		set shapeType(value) {
			shapeType = value
		},
		get shapeStart() {
			return shapeStart
		},
		set shapeStart(value) {
			shapeStart = value
		},
		get isDrawing() {
			return isDrawing
		},
		set isDrawing(value) {
			isDrawing = value
		},
		get activeDrawObject() {
			return activeDrawObject
		},
		set activeDrawObject(value) {
			activeDrawObject = value
		},
		get isTransforming() {
			return isTransforming
		},
		set isTransforming(value) {
			isTransforming = value
		},
		get transformData() {
			return transformData
		},
		set transformData(value) {
			transformData = value
		},
		get canvasDragBoost() {
			return canvasDragBoost
		},
		set canvasDragBoost(value) {
			canvasDragBoost = value
		},
		get isExporting() {
			return isExporting
		},
		get lastCursor() {
			return lastCursor
		},
		set lastCursor(value) {
			lastCursor = value
		},
		get penInitialized() {
			return penInitialized
		},
		set penInitialized(value) {
			penInitialized = value
		},
		get clickThroughHandled() {
			return clickThroughHandled
		},
		set clickThroughHandled(value) {
			clickThroughHandled = value
		},
		get selectMode() {
			return selectMode
		},
		set selectMode(value) {
			selectMode = value
		},
		get activeTextEditor() {
			return activeTextEditor
		},
		set activeTextEditor(value) {
			activeTextEditor = value
		},
		get isCommittingText() {
			return isCommittingText
		},
		set isCommittingText(value) {
			isCommittingText = value
		},
		get layerOrder() {
			return layerOrder
		}
	}

	const canvasActions = {
		selectCharacter,
		openObjectContextMenu,
		openCharacterContextMenu
	}

	;({
		renderObjects,
		selectObject,
		saveSceneObjects,
		loadSceneObjects,
		updateCanvasInteraction,
		updateTextEditorStyle,
		commitTextEdit,
		buildObjectId,
		getObjectBoundsLocal
	} = createCanvasRenderer({
		drawCanvas,
		renderArea,
		brushCursor,
		brushSize,
		textSize,
		colorPicker,
		shapeBtn,
		shapeSelect,
		lineBtn,
		penBtn,
		eraserBtn,
		textBtn,
		selectBtn,
		clearCanvasBtn,
		state: canvasState,
		layer: layerManager,
		actions: canvasActions,
		captureState
	}))

	layerActions.selectObject = selectObject
	layerActions.selectCharacter = selectCharacter
	layerActions.renderObjects = renderObjects
	layerActions.saveSceneObjects = saveSceneObjects
	layerActions.openObjectContextMenu = openObjectContextMenu
	layerActions.openCharacterContextMenu = openCharacterContextMenu

	initCharacterUI(STEVE_SKIN)

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
	const poseManager = createPoseManager({
		savePoseBtn,
		loadPoseBtn,
		poseGalleryModal,
		poseGalleryContent,
		sliders,
		getSelectedCharacter,
		openModal,
		t,
		STEVE_SKIN,
		SkinViewer,
		deg
	})
	renderGallery = poseManager?.renderGallery || (() => {})

	// --- EXPORT ---
	createExportManager({
		exportBtn,
		renderArea,
		commitTextEdit,
		renderObjects,
		getCharacters: () => characters,
		getSelectedCharacterId: () => selectedCharacterId,
		selectCharacter,
		isTransparent: () => backgroundManager?.isTransparent?.(),
		setIsExporting: value => {
			isExporting = value
		}
	})

	// --- BACKGROUND SYSTEM ---
	backgroundManager = createBackgroundManager({
		bgUpload,
		uploadBgBtn,
		bgColorPicker,
		bgTransparent,
		removeBgBtn
	})

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
		// Clean up object canvases
		objectCanvases.forEach(entry => {
			if (entry.canvas.parentNode) entry.canvas.parentNode.removeChild(entry.canvas)
		})
		objectCanvases = new Map()
		/*
    if (splitFrontPass?.canvas?.parentNode) {
      splitFrontPass.canvas.parentNode.removeChild(splitFrontPass.canvas);
    }
    if (splitBackPass?.canvas?.parentNode) {
      splitBackPass.canvas.parentNode.removeChild(splitBackPass.canvas);
    }
    splitFrontPass = null;
    splitBackPass = null;
    */
		window.__mcsceneInitialized = false
	}
}
