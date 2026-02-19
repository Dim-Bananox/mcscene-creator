export function createLayerManager(deps) {
	const {
		drawCanvas,
		renderArea,
		t,
		actions,
		getCharacters,
		getDrawObjects,
		setDrawObjects,
		getSelectedObjectId,
		getSelectedCharacterId,
		getObjectsGroupLayer,
		setObjectsGroupLayer,
		getLayerOrderCounter,
		setLayerOrderCounter,
		getBgCanvas,
		setBgCanvas,
		getFgCanvas,
		setFgCanvas
	} = deps

	const ensureLayerOrder = obj => {
		if (!obj) return
		obj.layer = getObjectsGroupLayer()

		if (typeof obj._layerOrderIndex !== 'number') {
			setLayerOrderCounter(getLayerOrderCounter() + 1)
			obj._layerOrderIndex = getLayerOrderCounter() - 1
		}
	}

	function applyLayerZIndexes() {
		const cw = drawCanvas ? drawCanvas.width : 800
		const ch = drawCanvas ? drawCanvas.height : 600

		let bgCanvas = getBgCanvas()
		if (!bgCanvas) {
			bgCanvas = document.createElement('canvas')
			bgCanvas.className = 'bgLayerCanvas'
			if (renderArea) renderArea.appendChild(bgCanvas)
			setBgCanvas(bgCanvas)
		}

		let fgCanvas = getFgCanvas()
		if (!fgCanvas) {
			fgCanvas = document.createElement('canvas')
			fgCanvas.className = 'fgLayerCanvas'
			if (renderArea) renderArea.appendChild(fgCanvas)
			setFgCanvas(fgCanvas)
		}

		bgCanvas.width = cw
		bgCanvas.height = ch
		bgCanvas.style.position = 'absolute'
		bgCanvas.style.zIndex = 10
		bgCanvas.style.pointerEvents = 'none'

		const characters = getCharacters()
		characters.forEach(c => {
			if (c.wrapper) {
				c.wrapper.style.zIndex = 20
			}
		})

		fgCanvas.width = cw
		fgCanvas.height = ch
		fgCanvas.style.position = 'absolute'
		fgCanvas.style.zIndex = 30
		fgCanvas.style.pointerEvents = 'none'

		if (drawCanvas) {
			drawCanvas.style.zIndex = 40
		}
	}

	function renderLayersList() {
		const charactersList = document.getElementById('layersListCharacters')
		const objectsList = document.getElementById('layersListObjects')
		if (!charactersList || !objectsList) return
		charactersList.innerHTML = ''
		objectsList.innerHTML = ''

		const normalizeLayerLabel = value =>
			String(value || '')
				.replace(/^layer\s*[:\-]?\s*/i, '')
				.trim()

		const createGroupHeader = (title, color, isTop, onMove) => {
			const h = document.createElement('div')
			h.className = 'layerGroupHeader'
			h.style.background = color || '#444'
			h.style.color = '#fff'
			h.style.padding = '8px'
			h.style.fontSize = '0.85em'
			h.style.fontWeight = 'bold'
			h.style.marginTop = '4px'
			h.style.borderRadius = '4px'
			h.style.display = 'flex'
			h.style.justifyContent = 'space-between'
			h.style.alignItems = 'center'
			h.style.cursor = 'pointer'
			h.title = 'Click arrows to change layer order of entire group'

			const label = document.createElement('span')
			label.textContent = title
			h.appendChild(label)

			const moveBtn = document.createElement('button')
			moveBtn.className = 'layerOrderBtn'
			moveBtn.innerHTML = isTop ? '▼' : '▲'
			moveBtn.title = isTop ? 'Move Group to Background' : 'Move Group to Foreground'
			moveBtn.onclick = e => {
				e.stopPropagation()
				onMove()
			}
			h.appendChild(moveBtn)

			return h
		}

		const createObjectItem = obj => {
			const item = document.createElement('div')
			item.className = 'layerItem'
			item.style.display = 'flex'
			item.style.justifyContent = 'space-between'
			item.style.alignItems = 'center'
			if (obj.id === getSelectedObjectId()) item.classList.add('active')

			const labelText = normalizeLayerLabel(obj.name || obj.type || 'Object')
			const label = document.createElement('span')
			label.style.flex = '1'
			label.style.overflow = 'hidden'
			label.style.textOverflow = 'ellipsis'
			label.textContent = labelText
			label.onclick = () => actions.selectObject(obj.id)

			const visBtn = document.createElement('button')
			visBtn.className = 'layerVisBtn'
			visBtn.innerHTML = obj.visible !== false ? '👁️' : '🚫'
			visBtn.onclick = e => {
				e.stopPropagation()
				obj.visible = obj.visible === false
				actions.renderObjects()
				renderLayersList()
			}

			const moveContainer = document.createElement('div')

			const upBtn = document.createElement('button')
			upBtn.className = 'layerOrderBtn'
			upBtn.innerHTML = '▲'
			upBtn.onclick = e => {
				e.stopPropagation()
				const drawObjects = getDrawObjects()
				const idx = drawObjects.indexOf(obj)
				if (idx < drawObjects.length - 1) {
					;[drawObjects[idx], drawObjects[idx + 1]] = [
						drawObjects[idx + 1],
						drawObjects[idx]
					]
					actions.renderObjects()
					renderLayersList()
					actions.saveSceneObjects()
				}
			}

			const downBtn = document.createElement('button')
			downBtn.className = 'layerOrderBtn'
			downBtn.innerHTML = '▼'
			downBtn.onclick = e => {
				e.stopPropagation()
				const drawObjects = getDrawObjects()
				const idx = drawObjects.indexOf(obj)
				if (idx > 0) {
					;[drawObjects[idx], drawObjects[idx - 1]] = [
						drawObjects[idx - 1],
						drawObjects[idx]
					]
					actions.renderObjects()
					renderLayersList()
					actions.saveSceneObjects()
				}
			}

			const delBtn = document.createElement('button')
			delBtn.className = 'layerDelBtn'
			delBtn.textContent = '✕'
			delBtn.onclick = e => {
				e.stopPropagation()
				setDrawObjects(getDrawObjects().filter(o => o.id !== obj.id))
				if (getSelectedObjectId() === obj.id) actions.selectObject(null)
				actions.renderObjects()
				renderLayersList()
				actions.saveSceneObjects()
			}

			item.appendChild(visBtn)
			item.appendChild(label)
			moveContainer.appendChild(upBtn)
			moveContainer.appendChild(downBtn)
			item.appendChild(moveContainer)
			item.appendChild(delBtn)

			item.oncontextmenu = e => {
				e.preventDefault()
				actions.selectObject(obj.id)
				actions.openObjectContextMenu(e.clientX, e.clientY)
			}

			return item
		}

		const buildObjectsGroup = () => {
			const container = document.createElement('div')
			container.className = 'layerGroup'

			const isFg = getObjectsGroupLayer() === 'front'
			const headerColor = isFg ? '#5b21b6' : '#166534'
			const groupLabel = isFg ? t('layerForeground') : t('layerBackground')
			const headerText = `${t('layersObjects')} (${normalizeLayerLabel(groupLabel)})`

			const header = createGroupHeader(headerText, headerColor, isFg, () => {
				setObjectsGroupLayer(isFg ? 'back' : 'front')
				getDrawObjects().forEach(o => (o.layer = getObjectsGroupLayer()))
				actions.renderObjects()
				renderLayersList()
				actions.saveSceneObjects()
			})
			container.appendChild(header)

			const ul = document.createElement('div')
			ul.className = 'layerGroupItems'
			;[...getDrawObjects()].reverse().forEach(obj => {
				const row = createObjectItem(obj)
				ul.appendChild(row)
			})
			container.appendChild(ul)
			return container
		}

		const buildCharactersGroup = () => {
			const container = document.createElement('div')
			container.className = 'layerGroup'

			const ul = document.createElement('div')
			ul.className = 'layerGroupItems'
			getCharacters().forEach(c => {
				const item = document.createElement('div')
				item.className = 'layerItem characterLayer'
				item.textContent = normalizeLayerLabel(c.name)
				item.onclick = () => actions.selectCharacter(c.id)
				if (c.id === getSelectedCharacterId()) item.classList.add('active')

				const visBtn = document.createElement('button')
				visBtn.className = 'layerVisBtn'
				visBtn.innerHTML = c.visible !== false ? '👁️' : '🚫'
				visBtn.style.marginRight = '8px'
				visBtn.onclick = e => {
					e.stopPropagation()
					c.visible = c.visible === false
					if (c.wrapper) c.wrapper.style.display = c.visible !== false ? 'block' : 'none'
					renderLayersList()
				}
				item.prepend(visBtn)

				item.oncontextmenu = e => {
					e.preventDefault()
					actions.selectCharacter(c.id)
					actions.openCharacterContextMenu(e.clientX, e.clientY, c.id)
				}

				ul.appendChild(item)
			})
			container.appendChild(ul)
			return container
		}

		charactersList.appendChild(buildCharactersGroup())
		objectsList.appendChild(buildObjectsGroup())
	}

	return {
		ensureLayerOrder,
		applyLayerZIndexes,
		renderLayersList,
		getBgCanvas,
		getFgCanvas
	}
}
