import html2canvas from 'html2canvas'

export function createExportManager(deps) {
	const {
		exportBtn,
		renderArea,
		commitTextEdit,
		renderObjects,
		getCharacters,
		getSelectedCharacterId,
		selectCharacter,
		isTransparent,
		setIsExporting
	} = deps

	if (!exportBtn) return

	exportBtn.onclick = async () => {
		if (!renderArea) return

		commitTextEdit()

		const characters = getCharacters()
		const prevSelectedId = getSelectedCharacterId()

		const saved = characters.map(c => ({
			id: c.id,
			border: c.wrapper.style.border,
			bg: c.wrapper.style.background,
			overflow: c.wrapper.style.overflow,
			display: c.wrapper.querySelector('.deleteViewportBtn')?.style.display
		}))

		const renderAreaBorder = renderArea.style.border
		const renderAreaBg = renderArea.style.background

		renderArea.style.border = 'none'
		if (isTransparent?.()) renderArea.style.background = 'transparent'

		setIsExporting(true)
		renderObjects()

		characters.forEach(c => {
			const deleteBtn = c.wrapper.querySelector('.deleteViewportBtn')
			const resizeBtn = c.wrapper.querySelector('.resizeViewportBtn')
			const moveBtn = c.wrapper.querySelector('.moveViewportBtn')
			if (deleteBtn) deleteBtn.style.display = 'none'
			if (resizeBtn) resizeBtn.style.display = 'none'
			if (moveBtn) moveBtn.style.display = 'none'
		})

		exportBtn.style.display = 'none'

		characters.forEach(c => {
			if (c.wrapper) {
				c.wrapper.style.border = 'none'
				c.wrapper.style.background = 'transparent'
				c.wrapper.style.overflow = 'visible'
				c.wrapper.classList.remove('active', 'movable')
			}
		})

		characters.forEach(c => {
			if (c.viewer) c.viewer.render()
		})

		const canvas = await html2canvas(renderArea, {
			backgroundColor: null,
			useCORS: true,
			scale: 2
		})

		renderArea.style.border = renderAreaBorder
		renderArea.style.background = renderAreaBg

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
			if (deleteBtn && s) deleteBtn.style.display = shouldShow ? s.display || 'block' : 'none'
			if (resizeBtn) resizeBtn.style.display = shouldShow ? 'block' : 'none'
			if (moveBtn) moveBtn.style.display = shouldShow ? 'block' : 'none'
		})

		exportBtn.style.display = 'block'

		setIsExporting(false)
		renderObjects()

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
