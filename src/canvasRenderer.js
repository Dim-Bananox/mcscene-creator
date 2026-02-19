export function createCanvasRenderer(deps) {
	const {
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
		state,
		layer,
		actions,
		captureState
	} = deps

	const drawCtx = drawCanvas.getContext('2d')
	const CANVAS_WIDTH = 800
	const CANVAS_HEIGHT = 600
	drawCanvas.width = CANVAS_WIDTH
	drawCanvas.height = CANVAS_HEIGHT
	drawCtx.lineWidth = brushSize?.value || 50
	drawCtx.lineCap = 'round'
	drawCtx.strokeStyle = state.currentColor

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
			fontWeight: Number.isFinite(obj.fontWeight) ? obj.fontWeight : 700,
			layer: obj.layer || 'front'
		}
	}

	const saveSceneObjects = () => {
		localStorage.setItem(OBJECT_STORAGE_KEY, JSON.stringify(state.drawObjects))
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
				state.drawObjects = normalized.filter(obj => obj.type !== 'eraser')

				let maxIndex = 0
				state.drawObjects.forEach(obj => {
					if (typeof obj._layerOrderIndex === 'number') {
						if (obj._layerOrderIndex > maxIndex) maxIndex = obj._layerOrderIndex
					}
				})
				state.layerOrderCounter = Math.max(state.layerOrderCounter, maxIndex + 1)

				state.drawObjects.forEach(layer.ensureLayerOrder)

				const frontCount = state.drawObjects.filter(o => o.layer === 'front').length
				const backCount = state.drawObjects.filter(o => o.layer === 'back').length
				if (backCount > frontCount) {
					state.objectsGroupLayer = 'back'
				} else {
					state.objectsGroupLayer = 'front'
				}

				legacyErasers.forEach(eraser => applyEraserToStrokes(eraser))
				if (legacyErasers.length > 0) saveSceneObjects()
			}
		} catch (err) {
			state.drawObjects = []
		}
	}

	const getObjectById = id => state.drawObjects.find(obj => obj.id === id)

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

	const renderObject = (obj, targetCtx) => {
		const ctx = targetCtx || drawCtx
		ctx.save()
		applyObjectTransform(ctx, obj)
		ctx.globalCompositeOperation = obj.type === 'eraser' ? 'destination-out' : 'source-over'

		if (obj.type === 'stroke' || obj.type === 'eraser') {
			if (obj.points.length > 0) {
				ctx.lineCap = 'round'
				ctx.strokeStyle = obj.color || '#000000'
				ctx.lineWidth = obj.lineWidth || 2
				ctx.beginPath()
				ctx.moveTo(obj.points[0].x, obj.points[0].y)
				obj.points.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y))
				ctx.stroke()
			}
		} else if (obj.type === 'shape') {
			const width = Math.max(1, obj.width || 0)
			const height = Math.max(1, obj.height || 0)
			ctx.fillStyle = obj.color || '#000000'
			ctx.strokeStyle = obj.color || '#000000'
			ctx.lineWidth = obj.lineWidth || 2

			if (obj.shapeType === 'line') {
				ctx.beginPath()
				ctx.moveTo(-width / 2, 0)
				ctx.lineTo(width / 2, 0)
				ctx.stroke()
			} else if (obj.shapeType === 'rect') {
				ctx.fillRect(-width / 2, -height / 2, width, height)
			} else if (obj.shapeType === 'circle') {
				ctx.beginPath()
				ctx.arc(0, 0, Math.max(width, height) / 2, 0, 2 * Math.PI)
				ctx.fill()
			} else if (obj.shapeType === 'triangle') {
				ctx.beginPath()
				ctx.moveTo(0, -height / 2)
				ctx.lineTo(width / 2, height / 2)
				ctx.lineTo(-width / 2, height / 2)
				ctx.closePath()
				ctx.fill()
			} else if (obj.shapeType === 'polygon') {
				if (obj.points && obj.points.length > 0) {
					ctx.beginPath()
					ctx.moveTo(obj.points[0].x, obj.points[0].y)
					obj.points.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y))
					ctx.closePath()
					ctx.fill()
				}
			}
		} else if (obj.type === 'text') {
			const { maxWidth, lineHeight, lines } = getTextMetrics(obj)
			ctx.fillStyle = obj.color || '#000000'
			ctx.font = `${obj.fontWeight || 700} ${obj.fontSize || 36}px ${obj.fontFamily || '"Space Grotesk", "Segoe UI", sans-serif'}`
			ctx.textBaseline = 'top'
			ctx.textAlign = 'left'
			const startX = -maxWidth / 2
			const startY = -(lineHeight * lines.length) / 2
			lines.forEach((line, index) => {
				ctx.fillText(line, startX, startY + index * lineHeight)
			})
		}

		ctx.restore()
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

	const drawSelectionOutline = (obj, targetCtx) => {
		if (!obj || state.isExporting) return
		const ctx = targetCtx || drawCtx
		const bounds = getObjectBoundsLocal(obj)
		const corners = [
			transformPoint(bounds.minX, bounds.minY, obj),
			transformPoint(bounds.maxX, bounds.minY, obj),
			transformPoint(bounds.maxX, bounds.maxY, obj),
			transformPoint(bounds.minX, bounds.maxY, obj)
		]

		ctx.save()
		ctx.globalCompositeOperation = 'source-over'
		ctx.strokeStyle = '#60a5fa'
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.moveTo(corners[0].x, corners[0].y)
		corners.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y))
		ctx.closePath()
		ctx.stroke()

		const handles = getSelectionHandles(obj)
		handles.forEach(handle => {
			const width = handle.width || SELECTION_HANDLE_SIZE
			const height = handle.height || SELECTION_HANDLE_SIZE
			ctx.fillStyle = handle.type === 'resize' ? '#0ea5e9' : '#ffffff'
			ctx.strokeStyle = '#1d4ed8'
			ctx.lineWidth = 1.5
			ctx.save()
			ctx.translate(handle.x, handle.y)
			ctx.rotate(handle.rotation || 0)
			ctx.beginPath()
			if (handle.type === 'resize') {
				const radius = Math.min(3, Math.floor(Math.min(width, height) * 0.15))
				drawRoundedRect(ctx, -width / 2, -height / 2, width, height, radius)
			} else {
				ctx.rect(-width / 2, -height / 2, width, height)
			}
			ctx.fill()
			ctx.stroke()

			if (handle.type === 'resize') {
				ctx.strokeStyle = '#f8fafc'
				ctx.lineWidth = 2
				const inset = Math.max(2, Math.floor(width * 0.2))
				const len = Math.max(4, Math.floor(width * 0.3))
				ctx.beginPath()
				ctx.moveTo(-width / 2 + inset, -height / 2 + inset + len)
				ctx.lineTo(-width / 2 + inset, -height / 2 + inset)
				ctx.lineTo(-width / 2 + inset + len, -height / 2 + inset)
				ctx.moveTo(width / 2 - inset - len, height / 2 - inset)
				ctx.lineTo(width / 2 - inset, height / 2 - inset)
				ctx.lineTo(width / 2 - inset, height / 2 - inset - len)
				ctx.stroke()
			}
			ctx.restore()
		})

		ctx.restore()
	}

	const ensureSplitPassCanvas = className => {
		return null
	}

	const getCharacterCanvasRect = character => {
		if (!character?.wrapper || !drawCanvas) return null
		const charRect = character.wrapper.getBoundingClientRect()
		const canvasRect = drawCanvas.getBoundingClientRect()
		const scaleX = drawCanvas.width / canvasRect.width
		const scaleY = drawCanvas.height / canvasRect.height
		const x = (charRect.left - canvasRect.left) * scaleX
		const y = (charRect.top - canvasRect.top) * scaleY
		const width = charRect.width * scaleX
		const height = charRect.height * scaleY
		if (width <= 1 || height <= 1) return null
		return { x, y, width, height }
	}

	const getObjectCanvasBounds = obj => {
		const bounds = getObjectBoundsLocal(obj)
		const corners = [
			{ x: bounds.minX, y: bounds.minY },
			{ x: bounds.maxX, y: bounds.minY },
			{ x: bounds.maxX, y: bounds.maxY },
			{ x: bounds.minX, y: bounds.maxY }
		]
		const cos = Math.cos(obj.rotation || 0)
		const sin = Math.sin(obj.rotation || 0)
		const transformed = corners.map(p => {
			const sx = p.x * (obj.scaleX || 1)
			const sy = p.y * (obj.scaleY || 1)
			const rx = sx * cos - sy * sin
			const ry = sx * sin + sy * cos
			return { x: rx + (obj.x || 0), y: ry + (obj.y || 0) }
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

	const rectsOverlap = (a, b) =>
		a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY

	const findSplitCharacterForObject = obj => {
		return null
	}

	const renderObjects = () => {
		layer.applyLayerZIndexes()

		const bgCanvas = layer.getBgCanvas()
		const fgCanvas = layer.getFgCanvas()
		const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null
		const fgCtx = fgCanvas ? fgCanvas.getContext('2d') : null

		if (bgCtx) bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height)
		if (fgCtx) fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height)
		if (drawCtx) drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height)

		state.drawObjects.forEach(obj => {
			if (obj.visible === false) return
			const targetCtx = state.objectsGroupLayer === 'back' ? bgCtx : fgCtx
			if (targetCtx) {
				renderObject(obj, targetCtx)
			}
		})

		const selected = getObjectById(state.selectedObjectId)
		if (selected && selected.visible !== false) {
			drawSelectionOutline(selected, drawCtx)
		}

		if (state.activeDrawObject) renderObject(state.activeDrawObject, drawCtx)
	}

	const selectObject = id => {
		state.selectedObjectId = id || null
		const selected = getObjectById(state.selectedObjectId)
		if (selected && selected.color && colorPicker) {
			state.currentColor = selected.color
			colorPicker.value = selected.color
			drawCtx.strokeStyle = state.currentColor
			drawCtx.fillStyle = state.currentColor
			updateTextEditorStyle()
		}
		if (id !== null && state.selectedCharacterId !== null) {
			actions.selectCharacter(null)
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
		for (let i = state.drawObjects.length - 1; i >= 0; i -= 1) {
			const obj = state.drawObjects[i]
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

	const hitTestObjectByPoint = (x, y, obj) => {
		if (!obj || obj.visible === false) return false
		if (obj.type === 'eraser') return false
		const local = screenToLocal(x, y, obj)
		const bounds = getObjectBoundsLocal(obj)
		if (obj.type === 'stroke') return hitTestStroke(local, obj)
		return (
			local.x >= bounds.minX &&
			local.x <= bounds.maxX &&
			local.y >= bounds.minY &&
			local.y <= bounds.maxY
		)
	}

	const splitShapeByEraser = (obj, eraserObj, eraserRadius) => {
		const hw = (obj.width || 100) / 2
		const hh = (obj.height || 100) / 2
		const localCorners = [
			{ x: -hw, y: -hh },
			{ x: hw, y: -hh },
			{ x: hw, y: hh },
			{ x: -hw, y: hh }
		]
		if (obj.shapeType === 'polygon' && obj.points) {
			const xs = obj.points.map(p => p.x)
			const ys = obj.points.map(p => p.y)
			localCorners[0] = { x: Math.min(...xs), y: Math.min(...ys) }
			localCorners[1] = { x: Math.max(...xs), y: Math.min(...ys) }
			localCorners[2] = { x: Math.max(...xs), y: Math.max(...ys) }
			localCorners[3] = { x: Math.min(...xs), y: Math.max(...ys) }
		}

		const worldCorners = localCorners.map(p => transformPoint(p.x, p.y, obj))

		const padding = (eraserRadius || 10) + 20
		const minX = Math.min(...worldCorners.map(p => p.x)) - padding
		const maxX = Math.max(...worldCorners.map(p => p.x)) + padding
		const minY = Math.min(...worldCorners.map(p => p.y)) - padding
		const maxY = Math.max(...worldCorners.map(p => p.y)) + padding

		const w = Math.ceil(maxX - minX)
		const h = Math.ceil(maxY - minY)
		if (w < 1 || h < 1) return null

		const cvs = document.createElement('canvas')
		cvs.width = w
		cvs.height = h
		const ctx = cvs.getContext('2d')

		ctx.translate(-minX, -minY)

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
					outer: for (let py = iMinY; py <= iMaxY; py++) {
						for (let px = iMinX; px <= iMaxX; px++) {
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
		let nextSelectedId = state.selectedObjectId

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

		state.drawObjects.forEach(obj => {
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
					if (obj.id === state.selectedObjectId) nextSelectedId = null
				} else if (segments.length === 1 && segments[0].length === worldPoints.length) {
					nextObjects.push(obj)
				} else {
					segments.forEach(seg => {
						const newObj = recenterStrokeSegments(obj, seg)
						if (newObj) {
							nextObjects.push(newObj)
							if (obj.id === state.selectedObjectId && !nextSelectedId) {
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
					if (obj.id === state.selectedObjectId) {
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

		state.drawObjects = nextObjects
		if (state.selectedObjectId !== nextSelectedId) {
			selectObject(nextSelectedId)
		} else {
			renderObjects()
		}
		layer.renderLayersList()
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
	layer.renderLayersList()

	renderArea.addEventListener('click', e => {
		if (state.clickThroughHandled) {
			state.clickThroughHandled = false
			return
		}
		const target = e.target
		if (target && target.closest) {
			if (target.closest('.charViewport')) return
		}

		if (target.closest('.charViewport')) return

		actions.selectCharacter(null)
	})

	const setShapeSelected = active => {
		if (shapeBtn) shapeBtn.classList.toggle('selected', active)
		if (shapeSelect) shapeSelect.classList.toggle('selected', active)
	}

	const updateCanvasInteraction = () => {
		const toolActive =
			state.textMode ||
			state.shapeMode ||
			state.drawMode === 'pen' ||
			state.drawMode === 'eraser'
		state.selectMode = !toolActive
		if (selectBtn) selectBtn.classList.toggle('selected', state.selectMode)
		const active = toolActive || state.selectMode
		drawCanvas.style.pointerEvents = active ? 'auto' : 'none'
		if (state.textMode) {
			if (brushCursor) brushCursor.style.display = 'none'
			drawCanvas.style.cursor = 'text'
		} else if (state.selectMode) {
			if (brushCursor) brushCursor.style.display = 'none'
			drawCanvas.style.cursor = 'default'
		} else {
			drawCanvas.style.cursor = 'default'
		}
	}

	const updateTextEditorStyle = () => {
		if (!state.activeTextEditor?.el) return
		const sizeValue = Number(textSize?.value || 36)
		const fontSize = Math.max(8, Math.round(sizeValue))
		state.activeTextEditor.el.style.fontSize = `${fontSize}px`
		state.activeTextEditor.el.style.color = state.currentColor
	}

	const commitTextEdit = () => {
		if (!state.activeTextEditor?.el || state.isCommittingText) return
		state.isCommittingText = true
		const editor = state.activeTextEditor.el
		const text = (editor.innerText || '').replace(/\r/g, '').trim()
		const { x, y } = state.activeTextEditor
		state.activeTextEditor = null
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
				color: state.currentColor,
				fontSize,
				fontFamily,
				fontWeight: 700,
				text
			}
			state.drawObjects.push(obj)
			selectObject(obj.id)
			renderObjects()
			saveSceneObjects()
		}

		editor.remove()
		state.isCommittingText = false
	}

	const cancelTextEdit = () => {
		if (!state.activeTextEditor?.el) return
		state.activeTextEditor.el.remove()
		state.activeTextEditor = null
	}

	const getCanvasCoordinates = e => {
		const rect = drawCanvas.getBoundingClientRect()
		const scaleX = drawCanvas.width / rect.width
		const scaleY = drawCanvas.height / rect.height
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY
		}
	}

	const startTextEdit = e => {
		if (e) {
			e.preventDefault()
			e.stopPropagation()
		}
		if (!renderArea) return
		if (state.activeTextEditor) commitTextEdit()

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
		state.activeTextEditor = { el: editor, x: coords.x, y: coords.y }
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
		if (state.shapeMode) deactivateShapeMode()
		if (state.selectMode) deactivateSelectMode()
		state.textMode = true
		state.drawMode = ''
		drawCtx.globalCompositeOperation = 'source-over'
		drawCtx.fillStyle = state.currentColor
		if (textBtn) textBtn.classList.add('selected')
		if (penBtn) penBtn.classList.remove('selected')
		if (eraserBtn) eraserBtn.classList.remove('selected')
		if (lineBtn) lineBtn.classList.remove('selected')
		setShapeSelected(false)
		actions.selectCharacter(null)
		selectObject(null)
		updateCanvasInteraction()
		updateBrushCursor()
	}

	const deactivateTextMode = () => {
		state.textMode = false
		if (textBtn) textBtn.classList.remove('selected')
		commitTextEdit()
		updateCanvasInteraction()
		updateBrushCursor()
	}

	const activateSelectMode = () => {
		if (state.textMode) deactivateTextMode()
		if (state.shapeMode) deactivateShapeMode()
		state.drawMode = ''
		state.selectMode = true
		if (selectBtn) selectBtn.classList.add('selected')
		if (penBtn) penBtn.classList.remove('selected')
		if (eraserBtn) eraserBtn.classList.remove('selected')
		if (lineBtn) lineBtn.classList.remove('selected')
		setShapeSelected(false)
		actions.selectCharacter(null)
		updateCanvasInteraction()
		updateBrushCursor()
	}

	const deactivateSelectMode = () => {
		state.selectMode = false
		if (selectBtn) selectBtn.classList.remove('selected')
		updateCanvasInteraction()
		updateBrushCursor()
	}

	const activateShapeMode = () => {
		if (state.selectMode) deactivateSelectMode()
		state.shapeMode = true
		drawCanvas.style.pointerEvents = 'auto'
		drawCtx.globalCompositeOperation = 'source-over'
		drawCtx.strokeStyle = state.currentColor
		drawCtx.fillStyle = state.currentColor
		setShapeSelected(true)
		if (lineBtn) lineBtn.classList.remove('selected')
		if (penBtn) penBtn.classList.remove('selected')
		if (eraserBtn) eraserBtn.classList.remove('selected')
		state.drawMode = ''
		actions.selectCharacter(null)
		selectObject(null)
	}

	const deactivateShapeMode = () => {
		state.shapeMode = false
		drawCanvas.style.pointerEvents = 'none'
		setShapeSelected(false)
		if (lineBtn) lineBtn.classList.remove('selected')
		state.drawMode = ''
	}

	if (shapeSelect) {
		if (state.shapeType === 'line') state.shapeType = 'rect'
		shapeSelect.value = state.shapeType
		shapeSelect.onchange = e => {
			state.shapeType = e.target.value
			activateShapeMode()
		}
	}

	if (lineBtn) {
		lineBtn.onclick = () => {
			if (state.textMode) deactivateTextMode()
			if (state.selectMode) deactivateSelectMode()
			cancelTextEdit()
			if (state.shapeMode && state.shapeType === 'line') {
				deactivateShapeMode()
			} else {
				state.shapeType = 'line'
				state.shapeMode = true
				drawCanvas.style.pointerEvents = 'auto'
				drawCtx.globalCompositeOperation = 'source-over'
				drawCtx.strokeStyle = state.currentColor
				drawCtx.fillStyle = state.currentColor
				if (lineBtn) lineBtn.classList.add('selected')
				if (penBtn) penBtn.classList.remove('selected')
				if (eraserBtn) eraserBtn.classList.remove('selected')
				setShapeSelected(false)
				state.drawMode = ''
				actions.selectCharacter(null)
				selectObject(null)
			}
			updateCanvasInteraction()
		}
	}

	if (penBtn) {
		penBtn.onclick = () => {
			if (state.textMode) deactivateTextMode()
			if (state.selectMode) deactivateSelectMode()
			cancelTextEdit()
			if (state.drawMode === 'pen') {
				state.drawMode = ''
				penBtn.classList.remove('selected')
			} else {
				if (state.shapeMode) deactivateShapeMode()
				state.drawMode = 'pen'
				drawCtx.globalCompositeOperation = 'source-over'
				penBtn.classList.add('selected')
				if (eraserBtn) eraserBtn.classList.remove('selected')
				actions.selectCharacter(null)
				selectObject(null)
			}
			updateCanvasInteraction()
			updateBrushCursor()
		}
	}

	if (!state.penInitialized) {
		state.drawMode = ''
		drawCanvas.style.pointerEvents = 'none'
		if (penBtn) penBtn.classList.remove('selected')
		state.penInitialized = true
	}

	if (!state.selectMode) {
		state.selectMode = true
		if (selectBtn) selectBtn.classList.add('selected')
		updateCanvasInteraction()
		updateBrushCursor()
	}

	if (eraserBtn) {
		eraserBtn.onclick = () => {
			if (state.textMode) deactivateTextMode()
			if (state.selectMode) deactivateSelectMode()
			cancelTextEdit()
			if (state.drawMode === 'eraser') {
				state.drawMode = ''
				eraserBtn.classList.remove('selected')
			} else {
				if (state.shapeMode) deactivateShapeMode()
				state.drawMode = 'eraser'
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
			if (state.textMode) deactivateTextMode()
			if (state.selectMode) deactivateSelectMode()
			cancelTextEdit()
			if (state.shapeMode) {
				deactivateShapeMode()
			} else {
				activateShapeMode()
				if (shapeSelect) state.shapeType = shapeSelect.value
				if (shapeSelect) shapeSelect.focus()
			}
			updateCanvasInteraction()
		}
	}

	if (textBtn) {
		textBtn.onclick = () => {
			if (state.textMode) {
				deactivateTextMode()
			} else {
				if (state.selectMode) deactivateSelectMode()
				activateTextMode()
			}
		}
	}

	if (selectBtn) {
		selectBtn.onclick = () => {
			if (state.selectMode) {
				deactivateSelectMode()
			} else {
				activateSelectMode()
			}
		}
	}

	if (colorPicker) {
		const handleColorChange = e => {
			state.currentColor = e.target.value
			drawCtx.strokeStyle = state.currentColor
			drawCtx.fillStyle = state.currentColor
			updateTextEditorStyle()
			const selected = getObjectById(state.selectedObjectId)
			if (selected) {
				selected.color = state.currentColor
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
			state.drawObjects = []
			state.activeDrawObject = null
			state.selectedObjectId = null
			layer.renderLayersList()
			renderObjects()
			saveSceneObjects()
		}
	}

	drawCanvas.addEventListener('click', e => {
		if (state.clickThroughHandled) {
			e.stopPropagation()
			state.clickThroughHandled = false
		}
	})

	drawCanvas.addEventListener('mousedown', e => {
		if (state.selectMode) {
			handleSelectionDown(e)
		} else {
			startDrawing(e)
		}
	})
	drawCanvas.addEventListener('mousemove', e => {
		if (state.selectMode) {
			handleSelectionMove(e)
		} else {
			draw(e)
			updateCursor(e)
		}
	})
	drawCanvas.addEventListener('mouseup', e => {
		if (state.selectMode) {
			handleSelectionUp(e)
		} else {
			finishDrawing(e)
		}
	})
	drawCanvas.addEventListener('mouseout', () => {
		if (state.selectMode) {
			handleSelectionUp()
		} else {
			cancelDrawing()
		}
	})
	drawCanvas.addEventListener('contextmenu', e => {
		if (!state.selectMode) return
		const coords = getCanvasCoordinates(e)
		const hit = hitTestObject(coords.x, coords.y)
		if (!hit) return
		e.preventDefault()
		selectObject(hit.id)
		actions.openObjectContextMenu(e.clientX, e.clientY)
	})
	drawCanvas.addEventListener('mouseleave', () => {
		if (brushCursor) brushCursor.style.display = 'none'
		drawCanvas.style.cursor = 'default'
	})

	function startDrawing(e) {
		if (state.textMode) {
			startTextEdit(e)
			return
		}

		const coords = getCanvasCoordinates(e)
		if (state.shapeMode) {
			state.shapeStart = { x: coords.x, y: coords.y }
			state.activeDrawObject = {
				id: buildObjectId(),
				type: 'shape',
				shapeType: state.shapeType,
				x: coords.x,
				y: coords.y,
				width: 1,
				height: 1,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				color: state.currentColor,
				lineWidth: Number(brushSize?.value || 2)
			}
			state.isDrawing = true
			renderObjects()
		} else if (state.drawMode === 'pen' || state.drawMode === 'eraser') {
			state.activeDrawObject = {
				id: buildObjectId(),
				type: state.drawMode === 'eraser' ? 'eraser' : 'stroke',
				x: 0,
				y: 0,
				rotation: 0,
				scaleX: 1,
				scaleY: 1,
				color: state.currentColor,
				lineWidth: Number(brushSize?.value || 2),
				points: [{ x: coords.x, y: coords.y }],
				preview: true
			}
			state.isDrawing = true
			renderObjects()
		}
	}

	function draw(e) {
		if (!state.isDrawing || !state.activeDrawObject) return
		const coords = getCanvasCoordinates(e)

		if (state.shapeMode && state.shapeStart) {
			const dx = coords.x - state.shapeStart.x
			const dy = coords.y - state.shapeStart.y

			if (state.shapeType === 'line') {
				const length = Math.hypot(dx, dy)
				const angle = Math.atan2(dy, dx)
				state.activeDrawObject.x = state.shapeStart.x + dx / 2
				state.activeDrawObject.y = state.shapeStart.y + dy / 2
				state.activeDrawObject.width = Math.max(1, length)
				state.activeDrawObject.height = Math.max(1, Number(brushSize?.value || 2))
				state.activeDrawObject.rotation = angle
			} else if (state.shapeType === 'circle') {
				const radius = Math.hypot(dx, dy) / 2
				state.activeDrawObject.x = state.shapeStart.x + dx / 2
				state.activeDrawObject.y = state.shapeStart.y + dy / 2
				state.activeDrawObject.width = Math.max(1, radius * 2)
				state.activeDrawObject.height = Math.max(1, radius * 2)
				state.activeDrawObject.rotation = 0
			} else {
				state.activeDrawObject.x = state.shapeStart.x + dx / 2
				state.activeDrawObject.y = state.shapeStart.y + dy / 2
				state.activeDrawObject.width = Math.max(1, Math.abs(dx))
				state.activeDrawObject.height = Math.max(1, Math.abs(dy))
				state.activeDrawObject.rotation = 0
			}
			renderObjects()
		} else if (state.drawMode === 'pen' || state.drawMode === 'eraser') {
			state.activeDrawObject.points.push({ x: coords.x, y: coords.y })
			renderObjects()
		}
	}

	function updateBrushCursor() {
		if (state.textMode) {
			if (brushCursor) brushCursor.style.display = 'none'
			drawCanvas.style.cursor = 'text'
			return
		}
		if (state.selectMode) {
			if (brushCursor) brushCursor.style.display = 'none'
			drawCanvas.style.cursor = 'default'
			return
		}
		if (
			state.drawMode === 'pen' ||
			state.drawMode === 'eraser' ||
			(state.shapeMode && state.shapeType === 'line')
		) {
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

			if (state.lastCursor) {
				brushCursor.style.left = `${state.lastCursor.x}px`
				brushCursor.style.top = `${state.lastCursor.y}px`
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
			state.lastCursor = { x, y }
			brushCursor.style.left = `${x}px`
			brushCursor.style.top = `${y}px`
		}
	}

	function handleSelectionDown(e) {
		state.clickThroughHandled = false
		const coords = getCanvasCoordinates(e)
		const areaRect = renderArea.getBoundingClientRect()
		const pointInArea = {
			x: e.clientX - areaRect.left,
			y: e.clientY - areaRect.top
		}
		const selected = getObjectById(state.selectedObjectId)
		const handle = selected ? hitTestHandle(coords.x, coords.y, selected) : null

		if (handle) {
			state.isTransforming = true
			state.transformData = {
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

		if (selected && hitTestObjectByPoint(coords.x, coords.y, selected)) {
			selectObject(selected.id)
			actions.selectCharacter(null)
			state.isTransforming = true
			state.transformData = {
				mode: 'move',
				startX: coords.x,
				startY: coords.y,
				startObjX: selected.x,
				startObjY: selected.y
			}
			return
		}

		const layerOrder = state.layerOrder
		for (let i = layerOrder.length - 1; i >= 0; i -= 1) {
			const layerItem = layerOrder[i]
			if (layerItem.type === 'character') {
				const ch = state.characters.find(c => c.id === layerItem.id)
				if (!ch?.wrapper || ch.visible === false) continue
				const rect = ch.wrapper.getBoundingClientRect()
				const bounds = {
					minX: rect.left - areaRect.left,
					maxX: rect.right - areaRect.left,
					minY: rect.top - areaRect.top,
					maxY: rect.bottom - areaRect.top
				}
				if (
					pointInArea.x >= bounds.minX &&
					pointInArea.x <= bounds.maxX &&
					pointInArea.y >= bounds.minY &&
					pointInArea.y <= bounds.maxY
				) {
					actions.selectCharacter(ch.id)
					state.clickThroughHandled = true
					return
				}
			}

			if (layerItem.type === 'object') {
				const obj = state.drawObjects.find(o => o.id === layerItem.id)
				if (!obj || obj.visible === false) continue
				if (hitTestObjectByPoint(coords.x, coords.y, obj)) {
					selectObject(obj.id)
					actions.selectCharacter(null)
					state.isTransforming = true
					state.transformData = {
						mode: 'move',
						startX: coords.x,
						startY: coords.y,
						startObjX: obj.x,
						startObjY: obj.y
					}
					return
				}
			}
		}

		selectObject(null)
		state.canvasDragBoost = false
		state.isTransforming = false
		state.transformData = null

		const elems = document.elementsFromPoint(e.clientX, e.clientY)
		for (const el of elems) {
			const viewport = el.closest ? el.closest('.charViewport') : null
			if (viewport && viewport.dataset.id) {
				const charId = viewport.dataset.id
				if (state.characters.some(c => c.id === charId)) {
					actions.selectCharacter(charId)
					state.clickThroughHandled = true
					return
				}
			}
		}
	}

	function handleSelectionMove(e) {
		if (!state.isTransforming || !state.transformData) return
		const obj = getObjectById(state.selectedObjectId)
		if (!obj) return
		const coords = getCanvasCoordinates(e)
		if (
			!state.canvasDragBoost &&
			(state.transformData.mode === 'move' || state.transformData.mode === 'resize')
		) {
			state.canvasDragBoost = true
			layer.applyLayerZIndexes()
		}

		if (state.transformData.mode === 'move') {
			obj.x = state.transformData.startObjX + (coords.x - state.transformData.startX)
			obj.y = state.transformData.startObjY + (coords.y - state.transformData.startY)
		} else if (state.transformData.mode === 'resize') {
			const local = screenToLocal(coords.x, coords.y, {
				x: obj.x,
				y: obj.y,
				rotation: obj.rotation,
				scaleX: state.transformData.startScaleX,
				scaleY: state.transformData.startScaleY
			})
			const width = state.transformData.bounds.maxX - state.transformData.bounds.minX || 1
			const height = state.transformData.bounds.maxY - state.transformData.bounds.minY || 1

			if (state.transformData.handle === 'resize') {
				const nextScaleX = Math.max(MIN_SCALE, (Math.abs(local.x) * 2) / width)
				const nextScaleY = Math.max(MIN_SCALE, (Math.abs(local.y) * 2) / height)
				const nextScale = Math.max(nextScaleX, nextScaleY)
				obj.scaleX = nextScale
				obj.scaleY = nextScale
			}

			if (state.transformData.handle === 'e' || state.transformData.handle === 'w') {
				const nextScaleX = Math.max(MIN_SCALE, (Math.abs(local.x) * 2) / width)
				obj.scaleX = nextScaleX
			}

			if (state.transformData.handle === 'n' || state.transformData.handle === 's') {
				const nextScaleY = Math.max(MIN_SCALE, (Math.abs(local.y) * 2) / height)
				obj.scaleY = nextScaleY
			}
		}

		renderObjects()
	}

	function handleSelectionUp() {
		if (!state.isTransforming) return
		state.isTransforming = false
		state.transformData = null
		state.canvasDragBoost = false
		renderObjects()
		saveSceneObjects()
	}

	document.addEventListener('keydown', e => {
		const target = e.target
		if (!state.selectMode) return
		if (state.activeTextEditor) return
		if (
			target &&
			(target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable)
		) {
			return
		}
		if (e.key === 'Delete' || e.key === 'Backspace') {
			const selected = getObjectById(state.selectedObjectId)
			if (!selected) return
			state.drawObjects = state.drawObjects.filter(obj => obj.id !== selected.id)
			state.selectedObjectId = null
			renderObjects()
			layer.renderLayersList()
			saveSceneObjects()
		}
	})

	function finishDrawing() {
		if (!state.activeDrawObject) {
			state.isDrawing = false
			return
		}

		if (state.activeDrawObject.type === 'stroke' || state.activeDrawObject.type === 'eraser') {
			const pts = state.activeDrawObject.points || []
			if (pts.length > 1) {
				if (state.activeDrawObject.type === 'eraser') {
					applyEraserToStrokes(state.activeDrawObject)
					if (eraserBtn) eraserBtn.classList.add('selected')
					state.drawMode = 'eraser'
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
					state.activeDrawObject.points = pts.map(p => ({
						x: p.x - centerX,
						y: p.y - centerY
					}))
					state.activeDrawObject.x = centerX
					state.activeDrawObject.y = centerY
					delete state.activeDrawObject.preview
					layer.ensureLayerOrder(state.activeDrawObject)
					state.drawObjects.push(state.activeDrawObject)
					selectObject(state.activeDrawObject.id)
				}
				saveSceneObjects()
				layer.renderLayersList()
			}
		} else if (state.activeDrawObject.type === 'shape') {
			if (state.activeDrawObject.width > 1 || state.activeDrawObject.height > 1) {
				layer.ensureLayerOrder(state.activeDrawObject)
				state.drawObjects.push(state.activeDrawObject)
				selectObject(state.activeDrawObject.id)
				saveSceneObjects()
				layer.renderLayersList()
			}
		}

		state.activeDrawObject = null
		state.shapeStart = null
		state.isDrawing = false
		renderObjects()
	}

	function cancelDrawing() {
		state.activeDrawObject = null
		state.shapeStart = null
		state.isDrawing = false
		renderObjects()
	}

	return {
		renderObjects,
		selectObject,
		saveSceneObjects,
		loadSceneObjects,
		updateCanvasInteraction,
		updateTextEditorStyle,
		commitTextEdit,
		buildObjectId,
		getObjectBoundsLocal
	}
}
