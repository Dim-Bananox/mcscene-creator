import { SkinViewer } from 'skinview3d'

export function createCharacterManager(deps) {
	const {
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
		state,
		setResizingChar,
		setResizeData,
		setMoveHoldChar,
		defaultSkin
	} = deps

	const getSelectedCharacter = () =>
		state.getCharacters().find(c => c.id === state.getSelectedCharacterId()) || null

	const getUniqueCharacterName = baseName => {
		const existing = state.getCharacters().map(c => c.name.trim().toLowerCase())
		if (!existing.includes(baseName.toLowerCase())) return baseName
		let i = 2
		while (existing.includes(`${baseName} ${i}`.toLowerCase())) i += 1
		return `${baseName} ${i}`
	}

	const charPosXInput = document.getElementById('charPosX')
	const charPosYInput = document.getElementById('charPosY')

	const updatePositionInputs = c => {
		if (charPosXInput) charPosXInput.value = Math.round(c ? c._posX : 0)
		if (charPosYInput) charPosYInput.value = Math.round(c ? c._posY : 0)
	}

	const applyPositionFromInputs = () => {
		const sel = getSelectedCharacter()
		if (!sel) return
		const x = parseInt(charPosXInput?.value, 10) || 0
		const y = parseInt(charPosYInput?.value, 10) || 0
		sel._posX = x
		sel._posY = y
		const scale = sel.scale || 1
		sel.wrapper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
	}

	const createCharacter = (
		name = `Character ${state.getCharacters().length + 1}`,
		skin = defaultSkin
	) => {
		if (!renderArea) return null
		const id = Date.now().toString()
		const sliderValues = Object.fromEntries(Object.keys(sliders).map(k => [k, 0]))
		const isFirst = state.getCharacters().length === 0
		const baseWidth = isFirst ? 480 : 320
		const baseHeight = isFirst ? 640 : 420
		const wrapper = document.createElement('div')
		wrapper.className = 'charViewport'
		wrapper.dataset.id = id
		const cvs = document.createElement('canvas')
		cvs.width = baseWidth
		cvs.height = baseHeight
		wrapper.style.width = `${baseWidth}px`
		wrapper.style.height = `${baseHeight}px`
		cvs.style.pointerEvents = 'auto'
		wrapper.appendChild(cvs)

		const resizeViewportBtn = document.createElement('button')
		resizeViewportBtn.className = 'resizeViewportBtn'
		resizeViewportBtn.textContent = ''
		resizeViewportBtn.title = t('resize')
		resizeViewportBtn.setAttribute('aria-label', t('resize'))
		const aspectRatio = baseWidth / baseHeight

		resizeViewportBtn.addEventListener('pointerdown', e => {
			e.stopPropagation()
			setResizingChar({ id, wrapper, cvs, charViewer: null })
			setResizeData({
				startX: e.clientX,
				startY: e.clientY,
				startWidth: wrapper.offsetWidth,
				startHeight: wrapper.offsetHeight,
				startTop: parseFloat(wrapper.style.top) || 0,
				startLeft: parseFloat(wrapper.style.left) || 0,
				aspectRatio
			})
			wrapper.classList.add('resizing', 'movable')
		})

		wrapper.appendChild(resizeViewportBtn)

		const moveViewportBtn = document.createElement('button')
		moveViewportBtn.className = 'moveViewportBtn'
		moveViewportBtn.title = t('move')
		moveViewportBtn.setAttribute('aria-label', t('move'))
		moveViewportBtn.innerHTML =
			'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 3h-2v4h-2V5H9l3-3zm0 20l-3-3h2v-4h2v4h2l-3 3zm10-10l-3 3v-2h-4v-2h4V9l3 3zM2 12l3-3v2h4v2H5v2l-3-3z" /></svg>'
		wrapper.appendChild(moveViewportBtn)

		const deleteViewportBtn = document.createElement('button')
		deleteViewportBtn.className = 'deleteViewportBtn'
		deleteViewportBtn.textContent = 'X'
		deleteViewportBtn.onclick = e => {
			e.stopPropagation()
			wrapper.remove()
			const nextCharacters = state.getCharacters().filter(ch => ch.id !== id)
			state.setCharacters(nextCharacters)
			if (state.getSelectedCharacterId() === id) {
				if (nextCharacters.length > 0) selectCharacter(nextCharacters[0].id)
				else state.setSelectedCharacterId(null)
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

		const charViewer = new SkinViewer({
			canvas: cvs,
			width: cvs.width,
			height: cvs.height,
			skin: skin || defaultSkin
		})
		charViewer.controls.enableRotate = true
		charViewer.controls.enableZoom = false

		let lastZoom = charViewer.camera.position.z
		const updateZoom = () => {
			const currentZoom = charViewer.camera.position.z
			if (currentZoom !== lastZoom) {
				lastZoom = currentZoom
				const defaultZoom = 70
				const scale = defaultZoom / currentZoom
				void scale
			}
			requestAnimationFrame(updateZoom)
		}
		updateZoom()

		const c = {
			id,
			name,
			skin: skin || defaultSkin,
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
			setMoveHoldChar(c)
			setMoveMode(c, true)
			startDrag(c, e)
		})

		wrapper.addEventListener('click', e => {
			e.stopPropagation()
			if (state.getSelectedCharacterId() !== c.id) {
				selectCharacter(c.id)
			}
		})

		wrapper.addEventListener('contextmenu', e => {
			e.preventDefault()
			e.stopPropagation()
			openCharacterContextMenu(e.clientX, e.clientY, c.id)
		})

		wrapper.addEventListener('pointerdown', e => {
			if (e.target.classList.contains('deleteViewportBtn')) return
			if (e.target.classList.contains('resizeViewportBtn')) return

			if (!c.moveEnabled) {
				if (e.target === cvs) {
					e.stopPropagation()
				}
				return
			}
			if (state.getSelectedCharacterId() !== c.id) return

			startDrag(c, e)
			e.preventDefault()
		})

		const nextCharacters = [...state.getCharacters(), c]
		state.setCharacters(nextCharacters)
		state.setSelectedCharacterId(id)
		renderLayersList()
		selectCharacter(id)
		return c
	}

	const selectCharacter = id => {
		const prev = getSelectedCharacter()
		if (prev && prev.viewer) {
			prev.cameraPos = {
				x: prev.viewer.camera.position.x,
				y: prev.viewer.camera.position.y,
				z: prev.viewer.camera.position.z
			}
		}

		state.setSelectedCharacterId(id)

		if (id !== null && state.getSelectedObjectId() !== null) {
			state.setSelectedObjectId(null)
			renderObjects()
		}

		const characterNameEl = document.getElementById('characterName')
		if (characterNameEl) {
			const characters = state.getCharacters()
			characterNameEl.textContent =
				id !== null && characters.find(x => x.id === id)
					? characters.find(x => x.id === id).name
					: ''
		}

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
			const characters = state.getCharacters()
			const c = characters.find(x => x.id === id)
			if (!c) return

			setSkin(c.skin)
			Object.entries(c.sliderValues).forEach(([k, v]) => {
				if (sliders[k]) {
					sliders[k].value = v
					sliders[k].dispatchEvent(new Event('input'))
				}
			})

			updatePositionInputs(c)

			if (c.viewer && c.cameraPos) {
				c.viewer.camera.position.set(c.cameraPos.x, c.cameraPos.y, c.cameraPos.z)
				c.viewer.controls.update()
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

		const characters = state.getCharacters()
		characters.forEach(ch => {
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

			if (ch.canvas) {
				ch.canvas.style.pointerEvents = is ? 'auto' : 'none'
			}
			if (ch.viewer && ch.viewer.controls) {
				ch.viewer.controls.enableRotate = is && !ch.moveEnabled
			}
			if (!is && ch.moveEnabled) {
				ch.moveEnabled = false
				if (ch.moveButton) ch.moveButton.classList.remove('active')
			}
		})

		renderLayersList()
	}

	const initCharacterUI = defaultSkin => {
		const addCharacterBtn = document.getElementById('addCharacter')
		const addCharacterLeftBtn = document.getElementById('addCharacterLeft')
		const addCharHandler = async () => {
			const characters = state.getCharacters()
			const defaultName = `Character ${characters.length + 1}`
			const name = await openModal({
				message: t('nameCharacter'),
				inputPlaceholder: defaultName,
				showInput: true,
				maxLength: 24
			})
			const cleanName = (name || '').trim() || defaultName
			const exists = characters.some(
				c => c.name.trim().toLowerCase() === cleanName.toLowerCase()
			)
			if (exists) {
				await openModal({
					message: t('characterNameUsed'),
					showInput: false,
					showCancel: false
				})
				return
			}
			createCharacter(cleanName, defaultSkin)
		}
		if (addCharacterBtn) addCharacterBtn.onclick = addCharHandler
		if (addCharacterLeftBtn) addCharacterLeftBtn.onclick = addCharHandler

		if (charPosXInput) charPosXInput.addEventListener('input', applyPositionFromInputs)
		if (charPosYInput) charPosYInput.addEventListener('input', applyPositionFromInputs)

		if (state.getCharacters().length === 0) createCharacter('Main', defaultSkin)
	}

	return {
		getSelectedCharacter,
		getUniqueCharacterName,
		createCharacter,
		selectCharacter,
		updatePositionInputs,
		applyPositionFromInputs,
		initCharacterUI
	}
}
